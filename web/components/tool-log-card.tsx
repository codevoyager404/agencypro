"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AgentLogEntry } from "@/lib/types";

function statusColor(status: AgentLogEntry["status"]) {
  if (status === "call") return "bg-amber-500";
  if (status === "result" || status === "ready") return "bg-emerald-500";
  if (status === "error") return "bg-red-500";
  return "bg-slate-300";
}

function StatusIcon({ status }: { status: AgentLogEntry["status"] }) {
  if (status === "call") return <Loader2 className="h-4 w-4 animate-spin text-amber-500" />;
  if (status === "result" || status === "ready") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-500" />;
  return <Circle className="h-4 w-4 text-slate-300" />;
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
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all hover:shadow-md",
        compact ? "my-1" : "my-2"
      )}
    >
      {/* Status Bar Indicator */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", statusColor(entry.status))} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left pl-4 pr-3",
          compact ? "py-2.5" : "py-3"
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <StatusIcon status={entry.status} />
          <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200 font-display">
            {entry.label}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {/* Expandable Details */}
      {open && details ? (
        <div className="px-4 pb-3">
          <pre className="overflow-auto rounded-lg bg-slate-50 dark:bg-slate-950 p-3 text-[10px] leading-4 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 font-mono">
            {details}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
