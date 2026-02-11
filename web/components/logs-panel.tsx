"use client";

import { ToolLogCard } from "@/components/tool-log-card";
import type { AgentLogEntry } from "@/lib/types";
import { Activity } from "lucide-react";

export function LogsPanel({ logs }: { logs: AgentLogEntry[] }) {
  return (
    <aside className="h-full overflow-y-auto bg-panel dark:bg-panel-dark p-4">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Activity className="h-4 w-4 text-accent dark:text-accent-dark" />
          <h2 className="font-display text-xs font-bold uppercase tracking-wider">Activity Log</h2>
        </div>
        <span className="flex h-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
          {logs.length}
        </span>
      </header>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600">
            <span className="text-xs">Waiting for action...</span>
          </div>
        ) : (
          logs.map((log, idx) => <ToolLogCard key={`${log.toolCallId ?? log.label}-${idx}`} entry={log} compact />)
        )}
      </div>
    </aside>
  );
}
