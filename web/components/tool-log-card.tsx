"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/cn";
import type { AgentLogEntry } from "@/lib/types";

function statusIcon(status: AgentLogEntry["status"]) {
  if (status === "call") return <Loader2 className="h-4 w-4 animate-spin text-amber-600" />;
  if (status === "result" || status === "ready") return <CheckCircle2 className="h-4 w-4 text-accent" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-600" />;
  return <Circle className="h-4 w-4 text-slate-400" />;
}

export function ToolLogCard({ entry, compact = false }: { entry: AgentLogEntry; compact?: boolean }) {
  const [open, setOpen] = useState(false);

  const details = useMemo(() => {
    if (!entry.input && !entry.summary && !entry.sessionId) return null;
    return JSON.stringify(
      {
        input: entry.input,
        summary: entry.summary,
        sessionId: entry.sessionId,
      },
      null,
      2,
    );
  }, [entry.input, entry.summary, entry.sessionId]);

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white", compact ? "px-3 py-2" : "p-3")}> 
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          {statusIcon(entry.status)}
          <span className="truncate text-sm font-semibold text-slate-700">{entry.label}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {open && details ? (
        <pre className="mt-3 overflow-auto rounded-lg bg-slate-900/95 p-3 text-xs text-slate-100">{details}</pre>
      ) : null}
    </div>
  );
}
