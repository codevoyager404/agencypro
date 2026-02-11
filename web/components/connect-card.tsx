"use client";

import { Github, Link2 } from "lucide-react";

import type { AgentAuthPrompt } from "@/lib/types";

export function ConnectCard({ prompt }: { prompt: AgentAuthPrompt }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Github className="h-4 w-4" />
        <span>Connect to {prompt.toolkit}</span>
      </div>
      <p className="mb-4 text-sm text-slate-600">{prompt.message}</p>
      <button
        type="button"
        onClick={() => window.open(prompt.authUrl, "_blank", "noopener,noreferrer")}
        className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-black"
      >
        <Link2 className="h-4 w-4" />
        Connect GitHub
      </button>
    </div>
  );
}
