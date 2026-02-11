"use client";

import { ToolLogCard } from "@/components/tool-log-card";
import { ConnectCard } from "@/components/connect-card";
import { ApproveCard } from "@/components/approve-card";
import { cn } from "@/lib/cn";
import type { AgentApprovalPrompt, AgentUIMessage } from "@/lib/types";
import { User, Sparkles } from "lucide-react";

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

  return (
    <article
      className={cn(
        "flex w-full gap-4 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm",
          isUser
            ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            : "bg-accent/10 dark:bg-accent-dark/10 border-accent/20 dark:border-accent-dark/20"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        ) : (
          <Sparkles className="h-4 w-4 text-accent dark:text-accent-dark" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          "relative max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-accent text-white dark:bg-accent-dark/90 dark:text-slate-900 rounded-tr-sm"
            : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm"
        )}
      >
        {(message.parts as Array<Record<string, unknown>>).map((part, idx) => {
          const type = String(part.type ?? "");
          const maybeText = part.text;

          if (type === "text" && typeof maybeText === "string" && maybeText.trim()) {
            if (isUser && HIDE_PREFIXES.some((prefix) => maybeText.startsWith(prefix))) {
              return null;
            }
            return (
              <p key={`${message.id}-text-${idx}`} className="whitespace-pre-wrap">
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
        })}
      </div>
    </article>
  );
}
