"use client";

import { Github, Link2, Plug } from "lucide-react";
import type { AgentAuthPrompt } from "@/lib/types";

export function ConnectCard({ prompt }: { prompt: AgentAuthPrompt }) {
  const isGithub = prompt.toolkit.toLowerCase().includes("github");
  const Icon = isGithub ? Github : Plug;
  const appName = prompt.toolkit.charAt(0).toUpperCase() + prompt.toolkit.slice(1);
  const openAuthWindow = () => {
    const popup = window.open(prompt.authUrl, "composio-auth", "popup=yes,width=620,height=760");
    if (!popup) {
      window.location.href = prompt.authUrl;
      return;
    }
    popup.focus();
  };

  return (
    <div className="relative group rounded-xl bg-slate-50 dark:bg-slate-900 p-0.5 overflow-hidden">
      {/* Gradient Border */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent/50 to-emerald-500/50 opacity-20 group-hover:opacity-40 transition-opacity" />

      <div className="relative rounded-[10px] bg-white dark:bg-slate-900 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <Icon className="h-4 w-4 text-accent dark:text-accent-dark" />
          <span>Connect to {appName}</span>
        </div>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {prompt.message}
        </p>
        <button
          type="button"
          onClick={openAuthWindow}
          className="inline-flex items-center gap-2 rounded-lg bg-ink dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-slate-900 hover:opacity-90 transition-transform active:scale-95"
        >
          <Link2 className="h-4 w-4" />
          Connect {appName}
        </button>
      </div>
    </div>
  );
}
