from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class IncomingPart(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    text: str | None = None
    data: dict[str, Any] | None = None


class IncomingMessage(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    role: Literal["system", "user", "assistant", "tool"]
    parts: list[IncomingPart] = Field(default_factory=list)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    userId: str | None = None
    callbackUrl: str | None = None
    messages: list[IncomingMessage] = Field(default_factory=list)
