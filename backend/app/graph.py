from __future__ import annotations

import json
import operator
import re
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, START, StateGraph

from .composio_runtime import ComposioRuntime
from .utils import find_first_http_url, summarize_result, tool_label

_SYSTEM_PROMPT = """
You are an autonomous composio agent.

Execution rules:
1. For each user request, first identify the right tool by using COMPOSIO_SEARCH_TOOLS.
2. If a target tool needs auth, use COMPOSIO_MANAGE_CONNECTIONS and return a short connect instruction.
3. Prefer direct tool execution. Only use COMPOSIO_REMOTE_WORKBENCH for complex analysis or when writing/running code is required.
4. For simple data fetches (e.g., reading emails, listing issues), use the direct API tools.
5. If the user approves tool calls (message starts with "APPROVED_TOOL_CALLS:"), execute only those approved calls.
6. Keep final answers short and include the computed value directly.
""".strip()


def _prettify_toolkit_name(value: str) -> str:
    cleaned = re.sub(r"[_\-]+", " ", value).strip()
    if not cleaned:
        return "Required App"
    return " ".join(part.capitalize() for part in cleaned.split())


def _extract_toolkit_name(arguments: dict[str, Any], result: dict[str, Any]) -> str:
    candidate_keys = (
        "toolkit",
        "toolkit_slug",
        "toolkitSlug",
        "app",
        "app_slug",
        "appSlug",
        "integration",
        "provider",
    )
    def find_candidate(payload: Any) -> str | None:
        if isinstance(payload, dict):
            for key in candidate_keys:
                value = payload.get(key)
                if isinstance(value, str) and value.strip():
                    return value
            for value in payload.values():
                found = find_candidate(value)
                if found:
                    return found
        if isinstance(payload, list):
            for item in payload:
                found = find_candidate(item)
                if found:
                    return found
        return None

    payloads: tuple[Any, ...] = (arguments, result)

    for payload in payloads:
        found = find_candidate(payload)
        if found:
            return _prettify_toolkit_name(found)

    return "Required App"


_APPROVAL_TOKEN_PREFIX = "APPROVED_TOOL_CALLS:"


def _last_user_message_content(messages: list[dict[str, Any]]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            return str(message.get("content") or "")
    return ""


def _parse_approved_payload(content: str) -> dict[str, Any] | None:
    if not content.startswith(_APPROVAL_TOKEN_PREFIX):
        return None
    start = content.find("{")
    if start == -1:
        return None
    try:
        return json.loads(content[start:])
    except json.JSONDecodeError:
        return None


def _is_potentially_dangerous_tool(slug: str) -> bool:
    normalized = slug.upper()

    # Meta-tools that can cause side effects or code execution.
    if normalized in {"COMPOSIO_REMOTE_WORKBENCH", "COMPOSIO_MULTI_EXECUTE_TOOL"}:
        return True

    # Heuristic allowlist for read-only operations.
    safe_prefixes = (
        "GET_",
        "LIST_",
        "SEARCH_",
        "READ_",
        "FETCH_",
        "LOOKUP_",
        "FIND_",
        "DESCRIBE_",
    )
    if normalized.startswith(safe_prefixes):
        return False

    # Broad heuristic: require approval for likely-write/destructive operations.
    dangerous_markers = (
        "DELETE",
        "REMOVE",
        "DESTROY",
        "TRASH",
        "ARCHIVE",
        "PURGE",
        "ERASE",
        "SEND",
        "REPLY",
        "FORWARD",
        "CREATE",
        "UPDATE",
        "EDIT",
        "WRITE",
        "POST",
        "PUBLISH",
        "MERGE",
        "CLOSE",
        "CANCEL",
        "INVITE",
        "GRANT",
        "REVOKE",
        "PAY",
        "TRANSFER",
    )
    return any(marker in normalized for marker in dangerous_markers)


class AgentState(TypedDict):
    chat_id: str
    user_id: str
    callback_url: str | None
    router_session_id: str
    openai_messages: Annotated[list[dict[str, Any]], operator.add]
    pending_tool_calls: list[dict[str, Any]]
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
            last_user_content = _last_user_message_content(state["openai_messages"])
            approved_payload = _parse_approved_payload(last_user_content)

            if approved_payload:
                approved = approved_payload.get("toolCalls")
                approved_list = approved if isinstance(approved, list) else []
                approved_set = {
                    json.dumps(item, sort_keys=True, ensure_ascii=False)
                    for item in approved_list
                    if isinstance(item, dict)
                }
                proposed_set = {
                    json.dumps({"tool": call["name"], "arguments": call["arguments"]}, sort_keys=True, ensure_ascii=False)
                    for call in tool_calls
                }
                if not proposed_set.issubset(approved_set):
                    updates["pending_tool_calls"] = []
                    updates["done"] = True
                    updates["final_text"] = "Tool call mismatch. Refusing to execute unapproved action."
                    updates["events"] = [
                        {
                            "type": "assistant-final",
                            "text": "Refusing to execute: proposed tool call(s) do not match what you approved.",
                        }
                    ]
                    return updates

            if not approved_payload and any(_is_potentially_dangerous_tool(call["name"]) for call in tool_calls):
                approval_token = uuid.uuid4().hex[:12]
                updates["pending_tool_calls"] = []
                updates["done"] = True
                updates["final_text"] = "Approval required before I execute a potentially dangerous action."
                updates["events"] = [
                    {
                        "type": "data-log",
                        "data": {
                            "kind": "tool",
                            "tool": "HITL_APPROVAL",
                            "label": "Approval Required",
                            "status": "call",
                            "summary": "Paused before executing potentially dangerous tool call(s).",
                        },
                    },
                    {
                        "type": "data-approve",
                        "data": {
                            "token": approval_token,
                            "message": "This action may send, modify, or delete data. Review and approve to continue.",
                            "toolCalls": [
                                {"tool": call["name"], "arguments": call["arguments"]} for call in tool_calls
                            ],
                        },
                    },
                    {
                        "type": "assistant-final",
                        "text": "Approval required. Click Approve in the chat to continue.",
                    },
                ]
                return updates

            updates["pending_tool_calls"] = tool_calls
            updates["done"] = False
            events: list[dict[str, Any]] = []
            for call in tool_calls:
                events.extend(
                    [
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
                )
            updates["events"] = events
        else:
            final_text = completion["content"] or "I could not produce a final answer."
            updates["pending_tool_calls"] = []
            updates["done"] = True
            updates["final_text"] = final_text
            updates["events"] = [{"type": "assistant-final", "text": final_text}]

        return updates

    def _execute_tool(self, state: AgentState) -> AgentState:
        calls = state.get("pending_tool_calls") or []
        if not calls:
            return {"events": []}

        def run_one(call: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
            result = self.runtime.execute_tool(
                session_id=state["router_session_id"],
                slug=call["name"],
                arguments=call["arguments"],
            )
            return call, result

        max_workers = min(len(calls), 4)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            completed = list(executor.map(run_one, calls))

        events: list[dict[str, Any]] = []
        tool_messages: list[dict[str, Any]] = []

        for call, result in completed:
            status = "result" if not result.get("error") else "error"
            events.extend(
                [
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
            )

            maybe_auth_url = find_first_http_url(result)
            if call["name"] == "COMPOSIO_MANAGE_CONNECTIONS" and maybe_auth_url:
                toolkit_name = _extract_toolkit_name(call["arguments"], result)
                events.append(
                    {
                        "type": "data-auth",
                        "data": {
                            "tool": call["name"],
                            "toolkit": toolkit_name,
                            "authUrl": maybe_auth_url,
                            "message": f"Connect {toolkit_name} to continue execution.",
                        },
                    }
                )

            tool_messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call["id"],
                    "content": json.dumps(result, ensure_ascii=False),
                }
            )

        return {
            "openai_messages": tool_messages,
            "pending_tool_calls": [],
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
            "pending_tool_calls": [],
            "turns": 0,
            "done": False,
            "final_text": "",
            "events": [],
        }

        for update in self.graph.stream(initial_state, stream_mode="updates"):
            for payload in update.values():
                for event in payload.get("events", []):
                    yield event
