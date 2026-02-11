"use client";

import { useMemo, useRef } from "react";

import { ToolLogCard } from "@/components/tool-log-card";
import { ConnectCard } from "@/components/connect-card";
import { ApproveCard } from "@/components/approve-card";
import { ShareButton } from "@/components/share-button";
import { cn } from "@/lib/cn";
import type { AgentApprovalPrompt, AgentUIMessage } from "@/lib/types";

const HIDE_PREFIXES = ["APPROVED_TOOL_CALLS:"];

export function ChatMessage({
  message,
  onApprove,
  approveDisabled = false,
}: {
  message: AgentUIMessage;
  onApprove?: (prompt: AgentApprovalPrompt) => void;
  approveDisabled?: boolean;
}) {
  const isUser = message.role === "user";
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const shareText = useMemo(() => {
    const chunks: string[] = [];
    for (const part of message.parts as Array<Record<string, unknown>>) {
      if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
        chunks.push(part.text);
      }
    }
    return chunks.join("\n\n").trim();
  }, [message.parts]);

  const parts = (message.parts as Array<Record<string, unknown>>)
    .map((part, idx) => {
      const type = String(part.type ?? "");

      const maybeText = part.text;
      if (type === "text" && typeof maybeText === "string" && maybeText.trim()) {
        if (isUser && HIDE_PREFIXES.some((prefix) => maybeText.startsWith(prefix))) {
          return null;
        }
        return (
          <p key={`${message.id}-text-${idx}`} className="whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
            {maybeText}
          </p>
        );
      }

      if (type === "data-log" && part.data && typeof part.data === "object") {
        return <ToolLogCard key={`${message.id}-log-${idx}`} entry={part.data as never} />;
      }

      if (type === "data-auth" && part.data && typeof part.data === "object") {
        return <ConnectCard key={`${message.id}-auth-${idx}`} prompt={part.data as never} />;
      }

      if (type === "data-approve" && part.data && typeof part.data === "object") {
        return (
          <ApproveCard
            key={`${message.id}-approve-${idx}`}
            prompt={part.data as never}
            onApprove={onApprove}
            disabled={approveDisabled}
          />
        );
      }

      return null;
    })
    .filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <article className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        ref={bubbleRef}
        className={cn(
          "max-w-3xl space-y-3",
          isUser ? "rounded-xl bg-slate-100 px-4 py-3 text-slate-800" : "rounded-xl px-1 py-1",
        )}
      >
        {!isUser && shareText ? (
          <div className="flex justify-end">
            <ShareButton title="AgencyPro Agent" text={shareText} targetRef={bubbleRef} />
          </div>
        ) : null}
        {parts}
      </div>
    </article>
  );
}
