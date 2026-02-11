"use client";

import { ToolLogCard } from "@/components/tool-log-card";
import { ConnectCard } from "@/components/connect-card";
import { cn } from "@/lib/cn";
import type { AgentUIMessage } from "@/lib/types";

export function ChatMessage({ message }: { message: AgentUIMessage }) {
  const isUser = message.role === "user";

  return (
    <article className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-3xl space-y-3",
          isUser ? "rounded-xl bg-slate-100 px-4 py-3 text-slate-800" : "rounded-xl px-1 py-1",
        )}
      >
        {(message.parts as Array<Record<string, unknown>>).map((part, idx) => {
          const type = String(part.type ?? "");

          if (type === "text" && typeof part.text === "string" && part.text.trim()) {
            return (
              <p key={`${message.id}-text-${idx}`} className="whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
                {part.text}
              </p>
            );
          }

          if (type === "data-log" && part.data && typeof part.data === "object") {
            return <ToolLogCard key={`${message.id}-log-${idx}`} entry={part.data as never} />;
          }

          if (type === "data-auth" && part.data && typeof part.data === "object") {
            return <ConnectCard key={`${message.id}-auth-${idx}`} prompt={part.data as never} />;
          }

          return null;
        })}
      </div>
    </article>
  );
}
