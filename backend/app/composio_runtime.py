from __future__ import annotations

import json
import os
import threading
from typing import Any

from composio import Composio
from openai import OpenAI

from .utils import to_plain_dict


class ComposioRuntime:
    def __init__(self) -> None:
        self._openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self._composio_api_key = os.getenv("COMPOSIO_API_KEY", "")
        self._model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
        self._toolkit_filter = [
            slug.strip()
            for slug in os.getenv("TOOLKIT_FILTER", "github").split(",")
            if slug.strip()
        ]
        self._workbench_offload_threshold = int(
            os.getenv("WORKBENCH_AUTO_OFFLOAD_THRESHOLD", "300")
        )

        self._enabled = bool(self._openai_api_key and self._composio_api_key)
        self._lock = threading.Lock()
        self._router_sessions_by_chat: dict[str, str] = {}

        self._openai: OpenAI | None = None
        self._composio: Composio | None = None

        if self._enabled:
            self._openai = OpenAI(api_key=self._openai_api_key)
            self._composio = Composio(api_key=self._composio_api_key)

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def disabled_reason(self) -> str:
        return (
            "Missing COMPOSIO_API_KEY or OPENAI_API_KEY. "
            "Set both environment variables to enable the live agent loop."
        )

    def get_or_create_router_session(
        self,
        *,
        chat_id: str,
        user_id: str,
        callback_url: str | None,
    ) -> str:
        if not self._enabled or self._composio is None:
            raise RuntimeError(self.disabled_reason)

        with self._lock:
            existing = self._router_sessions_by_chat.get(chat_id)
            if existing:
                return existing

            manage_connections: bool | dict[str, Any] = True
            if callback_url:
                manage_connections = {
                    "enable": True,
                    "callback_url": callback_url,
                }

            session = self._composio.tool_router.create(
                user_id=user_id,
                toolkits=self._toolkit_filter,
                manage_connections=manage_connections,
                workbench={
                    "enable_proxy_execution": False,
                    "auto_offload_threshold": self._workbench_offload_threshold,
                },
            )
            self._router_sessions_by_chat[chat_id] = session.session_id
            return session.session_id

    def get_router_tools(self, session_id: str) -> list[Any]:
        if not self._enabled or self._composio is None:
            raise RuntimeError(self.disabled_reason)
        session = self._composio.tool_router.use(session_id)
        return session.tools()

    def complete(
        self,
        *,
        messages: list[dict[str, Any]],
        tools: list[Any],
    ) -> dict[str, Any]:
        if not self._enabled or self._openai is None:
            raise RuntimeError(self.disabled_reason)

        response = self._openai.chat.completions.create(
            model=self._model,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            parallel_tool_calls=False,
            temperature=0,
        )

        message = response.choices[0].message
        tool_calls = []
        assistant_tool_calls_for_next_round = []

        if message.tool_calls:
            for call in message.tool_calls:
                raw_arguments = call.function.arguments or "{}"
                parsed_arguments: dict[str, Any]
                try:
                    parsed_arguments = json.loads(raw_arguments)
                except json.JSONDecodeError:
                    parsed_arguments = {}

                tool_calls.append(
                    {
                        "id": call.id,
                        "name": call.function.name,
                        "arguments": parsed_arguments,
                        "raw_arguments": raw_arguments,
                    }
                )
                assistant_tool_calls_for_next_round.append(
                    {
                        "id": call.id,
                        "type": "function",
                        "function": {
                            "name": call.function.name,
                            "arguments": raw_arguments,
                        },
                    }
                )

        assistant_message: dict[str, Any] = {
            "role": "assistant",
            "content": message.content or "",
        }
        if assistant_tool_calls_for_next_round:
            assistant_message["tool_calls"] = assistant_tool_calls_for_next_round

        return {
            "assistant_message": assistant_message,
            "content": message.content or "",
            "tool_calls": tool_calls,
        }

    def execute_tool(
        self,
        *,
        session_id: str,
        slug: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        if not self._enabled or self._composio is None:
            raise RuntimeError(self.disabled_reason)

        if slug.startswith("COMPOSIO_"):
            response = self._composio.client.tool_router.session.execute_meta(
                session_id=session_id,
                slug=slug,
                arguments=arguments,
            )
        else:
            response = self._composio.client.tool_router.session.execute(
                session_id=session_id,
                tool_slug=slug,
                arguments=arguments,
            )

        payload = to_plain_dict(response)
        if not isinstance(payload, dict):
            payload = {
                "data": payload,
                "error": None,
                "successful": True,
            }

        payload.setdefault("data", None)
        payload.setdefault("error", None)
        payload.setdefault("successful", not bool(payload.get("error")))
        return payload
