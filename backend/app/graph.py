from __future__ import annotations

import json
import operator
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, START, StateGraph

from .composio_runtime import ComposioRuntime
from .utils import find_first_http_url, summarize_result, tool_label

_SYSTEM_PROMPT = """
You are an autonomous composio agent.

Execution rules:
1. For each user request, first identify the right tool by using COMPOSIO_SEARCH_TOOLS.
2. If a target tool needs auth, use COMPOSIO_MANAGE_CONNECTIONS and return a short connect instruction.
3. After the user connects, re-run the target tool.
4. For large outputs, use COMPOSIO_REMOTE_WORKBENCH to compute aggregates and return only concise results.
5. Keep final answers short and include the computed value directly.
""".strip()


class AgentState(TypedDict):
    chat_id: str
    user_id: str
    callback_url: str | None
    router_session_id: str
    openai_messages: Annotated[list[dict[str, Any]], operator.add]
    pending_tool_call: dict[str, Any] | None
    turns: int
    done: bool
    final_text: str
    events: Annotated[list[dict[str, Any]], operator.add]


class AgentGraph:
    def __init__(self, runtime: ComposioRuntime, max_steps: int = 10) -> None:
        self.runtime = runtime
        self.max_steps = max_steps
        self.graph = self._build()

    def _build(self):
        builder: StateGraph[AgentState] = StateGraph(AgentState)
        builder.add_node("ensure_session", self._ensure_session)
        builder.add_node("llm_step", self._llm_step)
        builder.add_node("execute_tool", self._execute_tool)

        builder.add_edge(START, "ensure_session")
        builder.add_edge("ensure_session", "llm_step")
        builder.add_conditional_edges("llm_step", self._route_after_llm)
        builder.add_edge("execute_tool", "llm_step")

        return builder.compile()

    def _ensure_session(self, state: AgentState) -> AgentState:
        session_id = self.runtime.get_or_create_router_session(
            chat_id=state["chat_id"],
            user_id=state["user_id"],
            callback_url=state.get("callback_url"),
        )
        return {
            "router_session_id": session_id,
            "events": [
                {
                    "type": "data-log",
                    "data": {
                        "kind": "session",
                        "label": "Tool Router Session",
                        "status": "ready",
                        "sessionId": session_id,
                    },
                }
            ],
        }

    def _llm_step(self, state: AgentState) -> AgentState:
        turns = state.get("turns", 0)
        if turns >= self.max_steps:
            text = "Reached max tool iterations. Please refine the request and try again."
            return {
                "done": True,
                "final_text": text,
                "events": [{"type": "assistant-final", "text": text}],
            }

        tools = self.runtime.get_router_tools(state["router_session_id"])
        completion = self.runtime.complete(
            messages=[{"role": "system", "content": _SYSTEM_PROMPT}, *state["openai_messages"]],
            tools=tools,
        )

        assistant_message = completion["assistant_message"]
        tool_calls = completion["tool_calls"]

        updates: dict[str, Any] = {
            "openai_messages": [assistant_message],
            "turns": turns + 1,
        }

        if tool_calls:
            call = tool_calls[0]
            updates["pending_tool_call"] = call
            updates["done"] = False
            updates["events"] = [
                {
                    "type": "tool-input-start",
                    "toolCallId": call["id"],
                    "toolName": call["name"],
                },
                {
                    "type": "tool-input-available",
                    "toolCallId": call["id"],
                    "toolName": call["name"],
                    "input": call["arguments"],
                },
                {
                    "type": "data-log",
                    "data": {
                        "kind": "tool",
                        "tool": call["name"],
                        "label": tool_label(call["name"]),
                        "status": "call",
                        "toolCallId": call["id"],
                        "input": call["arguments"],
                    },
                },
            ]
        else:
            final_text = completion["content"] or "I could not produce a final answer."
            updates["pending_tool_call"] = None
            updates["done"] = True
            updates["final_text"] = final_text
            updates["events"] = [{"type": "assistant-final", "text": final_text}]

        return updates

    def _execute_tool(self, state: AgentState) -> AgentState:
        call = state.get("pending_tool_call")
        if not call:
            return {"events": []}

        result = self.runtime.execute_tool(
            session_id=state["router_session_id"],
            slug=call["name"],
            arguments=call["arguments"],
        )

        status = "result" if not result.get("error") else "error"
        events: list[dict[str, Any]] = [
            {
                "type": "tool-output-available",
                "toolCallId": call["id"],
                "output": result,
            },
            {
                "type": "data-log",
                "data": {
                    "kind": "tool",
                    "tool": call["name"],
                    "label": tool_label(call["name"]),
                    "status": status,
                    "toolCallId": call["id"],
                    "summary": summarize_result(result),
                },
            },
        ]

        maybe_auth_url = find_first_http_url(result)
        if call["name"] == "COMPOSIO_MANAGE_CONNECTIONS" and maybe_auth_url:
            events.append(
                {
                    "type": "data-auth",
                    "data": {
                        "tool": call["name"],
                        "toolkit": "github",
                        "authUrl": maybe_auth_url,
                        "message": "Connect GitHub to continue execution.",
                    },
                }
            )

        tool_message = {
            "role": "tool",
            "tool_call_id": call["id"],
            "content": json.dumps(result, ensure_ascii=False),
        }

        return {
            "openai_messages": [tool_message],
            "pending_tool_call": None,
            "events": events,
        }

    def _route_after_llm(self, state: AgentState) -> str:
        if state.get("done"):
            return END
        return "execute_tool"

    def stream_events(
        self,
        *,
        chat_id: str,
        user_id: str,
        callback_url: str | None,
        openai_messages: list[dict[str, Any]],
    ):
        initial_state: AgentState = {
            "chat_id": chat_id,
            "user_id": user_id,
            "callback_url": callback_url,
            "router_session_id": "",
            "openai_messages": openai_messages,
            "pending_tool_call": None,
            "turns": 0,
            "done": False,
            "final_text": "",
            "events": [],
        }

        for update in self.graph.stream(initial_state, stream_mode="updates"):
            for payload in update.values():
                for event in payload.get("events", []):
                    yield event
