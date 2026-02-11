from __future__ import annotations

import json
import uuid
from collections.abc import Iterable
from typing import Any

from .schemas import IncomingMessage


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def to_plain_dict(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if hasattr(value, "to_dict"):
        return value.to_dict()
    if isinstance(value, dict):
        return {k: to_plain_dict(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_plain_dict(v) for v in value]
    return value


def encode_sse(part: dict[str, Any]) -> str:
    return f"data: {json.dumps(part, ensure_ascii=False)}\n\n"


def done_sse() -> str:
    return "data: [DONE]\n\n"


def read_message_text(parts: Iterable[dict[str, Any]]) -> str:
    chunks: list[str] = []
    for part in parts:
        part_type = str(part.get("type", ""))
        if part_type in {"text", "input_text"} and isinstance(part.get("text"), str):
            chunks.append(part["text"])
        if part_type == "output_text" and isinstance(part.get("text"), str):
            chunks.append(part["text"])
    return "\n".join([x for x in chunks if x]).strip()


def ui_messages_to_openai(messages: list[IncomingMessage]) -> list[dict[str, Any]]:
    converted: list[dict[str, Any]] = []

    for message in messages:
        payload = [part.model_dump() for part in message.parts]
        text = read_message_text(payload)

        if message.role in {"user", "system", "assistant"}:
            if not text:
                continue
            converted.append(
                {
                    "role": message.role,
                    "content": text,
                }
            )

    return converted


_TOOL_LABELS = {
    "COMPOSIO_SEARCH_TOOLS": "Search Tools",
    "COMPOSIO_MANAGE_CONNECTIONS": "Manage Connections",
    "COMPOSIO_MULTI_EXECUTE_TOOL": "Multi Execute Tool",
    "COMPOSIO_REMOTE_WORKBENCH": "Remote Workbench",
    "COMPOSIO_WAIT_FOR_CONNECTIONS": "Wait For Connections",
}


def tool_label(slug: str) -> str:
    return _TOOL_LABELS.get(slug, slug.replace("_", " ").title())


def find_first_http_url(payload: Any) -> str | None:
    if isinstance(payload, str):
        if payload.startswith("http://") or payload.startswith("https://"):
            return payload
        return None

    if isinstance(payload, list):
        for item in payload:
            found = find_first_http_url(item)
            if found:
                return found
        return None

    if isinstance(payload, dict):
        preferred_keys = [
            "redirect_url",
            "auth_url",
            "authorize_url",
            "url",
        ]
        for key in preferred_keys:
            maybe = payload.get(key)
            found = find_first_http_url(maybe)
            if found:
                return found

        for value in payload.values():
            found = find_first_http_url(value)
            if found:
                return found

    return None


def summarize_result(payload: Any, max_len: int = 180) -> str:
    if payload is None:
        return "No data returned"

    if isinstance(payload, dict):
        if "error" in payload and payload["error"]:
            return str(payload["error"])[:max_len]
        if "message" in payload and payload["message"]:
            return str(payload["message"])[:max_len]
        if "data" in payload:
            data = payload["data"]
            if isinstance(data, list):
                return f"Returned {len(data)} item(s)"
            if isinstance(data, dict):
                keys = ", ".join(list(data.keys())[:4])
                suffix = "..." if len(data.keys()) > 4 else ""
                return f"Returned object ({keys}{suffix})"

    raw = json.dumps(payload, ensure_ascii=False) if isinstance(payload, (dict, list)) else str(payload)
    return (raw[: max_len - 3] + "...") if len(raw) > max_len else raw
