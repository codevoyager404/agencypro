"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Check, Shield } from "lucide-react";

import { cn } from "@/lib/cn";
import type { AgentApprovalPrompt } from "@/lib/types";

export function ApproveCard({
  prompt,
  onApprove,
  disabled = false,
}: {
  prompt: AgentApprovalPrompt;
  onApprove?: (prompt: AgentApprovalPrompt) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const details = useMemo(() => JSON.stringify(prompt.toolCalls, null, 2), [prompt.toolCalls]);
  const canApprove = !disabled && typeof onApprove === "function";
  const handleApproveClick = () => {
    if (!canApprove || typeof onApprove !== "function") return;
    onApprove(prompt);
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" />
        <span>Approval Required</span>
      </div>

      <p className="mb-3 text-sm text-amber-900/80">{prompt.message}</p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-sm text-slate-700"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Shield className="h-4 w-4 text-amber-700" />
          <span className="truncate">
            {prompt.toolCalls.length === 1 ? prompt.toolCalls[0]?.tool : `${prompt.toolCalls.length} tool calls`}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open ? "rotate-180" : "")} />
      </button>

      {open ? (
        <pre className="mt-3 overflow-auto rounded-lg bg-slate-900/95 p-3 text-xs text-slate-100">{details}</pre>
      ) : null}

      <div className="mt-3 flex items-center justify-end">
        <button
          type="button"
          disabled={!canApprove}
          onClick={handleApproveClick}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          Approve
        </button>
      </div>
    </div>
  );
}
