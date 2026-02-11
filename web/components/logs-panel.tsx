"use client";

import { ToolLogCard } from "@/components/tool-log-card";
import type { AgentLogEntry } from "@/lib/types";

export function LogsPanel({ logs }: { logs: AgentLogEntry[] }) {
  return (
    <aside className="h-full overflow-y-auto bg-panel p-4">
      <header className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
        <h2 className="font-display text-sm font-semibold tracking-wide text-slate-700">Logs</h2>
        <span className="rounded-md bg-accentSoft px-2 py-1 text-xs font-medium text-accent">{logs.length}</span>
      </header>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">Tool traces will stream here.</p>
        ) : (
          logs.map((log, idx) => <ToolLogCard key={`${log.toolCallId ?? log.label}-${idx}`} entry={log} compact />)
        )}
      </div>
    </aside>
  );
}
