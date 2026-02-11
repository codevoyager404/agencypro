from __future__ import annotations

import os
from collections.abc import Iterator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .composio_runtime import ComposioRuntime
from .graph import AgentGraph
from .schemas import ChatRequest
from .utils import done_sse, encode_sse, new_id, ui_messages_to_openai

load_dotenv()

runtime = ComposioRuntime()
agent_graph = AgentGraph(runtime=runtime)

app = FastAPI(title="AgencyPro Agent Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _chunk_text(text: str, chunk_size: int = 220) -> list[str]:
    if not text:
        return [""]
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]


def _disabled_stream(reason: str) -> Iterator[str]:
    message_id = new_id("msg")
    text_id = new_id("txt")

    yield encode_sse({"type": "start", "messageId": message_id})
    yield encode_sse({"type": "text-start", "id": text_id})
    yield encode_sse(
        {
            "type": "text-delta",
            "id": text_id,
            "delta": f"Agent backend is in setup mode. {reason}",
        }
    )
    yield encode_sse({"type": "text-end", "id": text_id})
    yield encode_sse({"type": "finish"})
    yield done_sse()


def _live_stream(request: ChatRequest) -> Iterator[str]:
    chat_id = request.id or new_id("chat")
    user_id = request.userId or os.getenv("DEFAULT_USER_ID", "demo-user")

    openai_messages = ui_messages_to_openai(request.messages)
    if not openai_messages:
        openai_messages = [{"role": "user", "content": "Hello"}]

    message_id = new_id("msg")
    text_id = new_id("txt")
    yielded_text = False

    yield encode_sse({"type": "start", "messageId": message_id})

    try:
        for event in agent_graph.stream_events(
            chat_id=chat_id,
            user_id=user_id,
            callback_url=request.callbackUrl,
            openai_messages=openai_messages,
        ):
            event_type = event.get("type")
            if event_type == "assistant-final":
                final_text = str(event.get("text", "")).strip()
                yield encode_sse({"type": "text-start", "id": text_id})
                for chunk in _chunk_text(final_text):
                    yield encode_sse({"type": "text-delta", "id": text_id, "delta": chunk})
                yield encode_sse({"type": "text-end", "id": text_id})
                yielded_text = True
                continue

            yield encode_sse(event)

        if not yielded_text:
            fallback = "I completed the tool loop but did not generate a final answer."
            yield encode_sse({"type": "text-start", "id": text_id})
            yield encode_sse({"type": "text-delta", "id": text_id, "delta": fallback})
            yield encode_sse({"type": "text-end", "id": text_id})

        yield encode_sse({"type": "finish"})
        yield done_sse()

    except Exception as exc:  # pragma: no cover - runtime fallback
        yield encode_sse(
            {
                "type": "data-log",
                "data": {
                    "kind": "error",
                    "status": "error",
                    "label": "Agent Error",
                    "summary": str(exc),
                },
            }
        )
        yield encode_sse({"type": "text-start", "id": text_id})
        yield encode_sse(
            {
                "type": "text-delta",
                "id": text_id,
                "delta": "Execution failed in the backend agent loop. Check server logs for details.",
            }
        )
        yield encode_sse({"type": "text-end", "id": text_id})
        yield encode_sse({"type": "finish"})
        yield done_sse()


@app.get("/health")
def health() -> JSONResponse:
    return JSONResponse(
        {
            "ok": True,
            "live": runtime.enabled,
            "reason": None if runtime.enabled else runtime.disabled_reason,
        }
    )


@app.post("/api/chat")
def chat(request: ChatRequest) -> StreamingResponse:
    if not runtime.enabled:
        iterator = _disabled_stream(runtime.disabled_reason)
    else:
        iterator = _live_stream(request)

    return StreamingResponse(
        iterator,
        media_type="text/event-stream",
        headers={
            "x-vercel-ai-ui-message-stream": "v1",
            "cache-control": "no-cache",
            "connection": "keep-alive",
        },
    )
