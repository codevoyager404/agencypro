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


def _to_json_string(value: Any, *, default: str) -> str:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else default

    if value is None:
        return default

    try:
        return json.dumps(value, ensure_ascii=False)
    except TypeError:
        return json.dumps(str(value), ensure_ascii=False)


def _tool_name_from_part(part: dict[str, Any]) -> str | None:
    part_type = str(part.get("type", ""))

    if part_type == "dynamic-tool":
        tool_name = part.get("toolName")
        if isinstance(tool_name, str) and tool_name.strip():
            return tool_name.strip()
        return None

    if part_type.startswith("tool-"):
        tool_name = part_type[5:].strip()
        return tool_name or None

    return None


def _assistant_tool_payload(
    parts: Iterable[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    tool_calls: list[dict[str, Any]] = []
    tool_results: list[dict[str, Any]] = []
    seen_tool_calls: set[str] = set()
    seen_tool_results: set[str] = set()

    for part in parts:
        tool_name = _tool_name_from_part(part)
        if not tool_name:
            continue

        tool_call_id = part.get("toolCallId")
        if not isinstance(tool_call_id, str) or not tool_call_id.strip():
            continue

        state = str(part.get("state", ""))
        if state == "input-streaming":
            continue

        raw_input = part.get("input")
        if raw_input is None and "rawInput" in part:
            raw_input = part.get("rawInput")

        arguments = _to_json_string(raw_input, default="{}")
        if tool_call_id not in seen_tool_calls:
            tool_calls.append(
                {
                    "id": tool_call_id,
                    "type": "function",
                    "function": {
                        "name": tool_name,
                        "arguments": arguments,
                    },
                }
            )
            seen_tool_calls.add(tool_call_id)

        if state not in {"output-available", "output-error"}:
            continue

        output: Any = part.get("output")
        if state == "output-error":
            output = part.get("errorText") or output

        content = output if isinstance(output, str) else _to_json_string(output, default="")
        if tool_call_id not in seen_tool_results:
            tool_results.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": content,
                }
            )
            seen_tool_results.add(tool_call_id)

    return tool_calls, tool_results


def _tool_call_id_from_message(message: IncomingMessage, parts: Iterable[dict[str, Any]]) -> str | None:
    raw_message = message.model_dump()
    candidates = [
        raw_message.get("tool_call_id"),
        raw_message.get("toolCallId"),
        raw_message.get("id"),
    ]
    for candidate in candidates:
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()

    for part in parts:
        maybe_id = part.get("toolCallId")
        if isinstance(maybe_id, str) and maybe_id.strip():
            return maybe_id.strip()

    return None


def _tool_message_content(message: IncomingMessage, parts: Iterable[dict[str, Any]]) -> str:
    text = read_message_text(parts)
    if text:
        return text

    raw_message = message.model_dump()
    content = raw_message.get("content")
    if isinstance(content, str) and content.strip():
        return content.strip()

    outputs: list[Any] = []
    for part in parts:
        if "output" in part:
            outputs.append(part.get("output"))
        elif "data" in part:
            outputs.append(part.get("data"))

    if not outputs:
        return ""

    if len(outputs) == 1:
        output = outputs[0]
        return output if isinstance(output, str) else _to_json_string(output, default="")

    return _to_json_string(outputs, default="")


def ui_messages_to_openai(messages: list[IncomingMessage]) -> list[dict[str, Any]]:
    converted: list[dict[str, Any]] = []

    for message in messages:
        payload = [part.model_dump() for part in message.parts]
        text = read_message_text(payload)

        if message.role in {"user", "system"}:
            if not text:
                continue
            converted.append(
                {
                    "role": message.role,
                    "content": text,
                }
            )

        if message.role == "assistant":
            tool_calls, tool_results = _assistant_tool_payload(payload)

            if not text and not tool_calls:
                continue

            assistant_message: dict[str, Any] = {
                "role": "assistant",
                "content": text if text else "",
            }
            if tool_calls:
                assistant_message["tool_calls"] = tool_calls

            converted.append(assistant_message)
            converted.extend(tool_results)

        if message.role == "tool":
            tool_call_id = _tool_call_id_from_message(message, payload)
            if not tool_call_id:
                continue

            content = _tool_message_content(message, payload)
            if not content:
                continue

            converted.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": content,
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
