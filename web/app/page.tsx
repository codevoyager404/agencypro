"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { Loader2, Send } from "lucide-react";

import { ChatMessage } from "@/components/chat-message";
import { LogsPanel } from "@/components/logs-panel";
import { collectLogs, type AgentUIMessage } from "@/lib/types";

const AUTH_SUCCESS_EVENT = "COMPOSIO_AUTH_SUCCESS";

export default function AgentPage() {
  const [input, setInput] = useState("");
  const lastAuthSignalAtRef = useRef(0);

  const { messages, sendMessage, status, stop, error } = useChat<AgentUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const logs = useMemo(() => collectLogs(messages), [messages]);
  const isRunning = status === "submitted" || status === "streaming";

  useEffect(() => {
    const handleAuthCallback = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data !== AUTH_SUCCESS_EVENT) return;
      if (isRunning) return;
      const now = Date.now();
      if (now - lastAuthSignalAtRef.current < 1500) return;
      lastAuthSignalAtRef.current = now;

      void sendMessage({
        text: "Connection completed successfully. Continue the previous task.",
      });
    };

    window.addEventListener("message", handleAuthCallback);
    return () => window.removeEventListener("message", handleAuthCallback);
  }, [isRunning, sendMessage]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isRunning) return;

    const next = input;
    setInput("");
    await sendMessage({ text: next });
  };

  return (
    <main className="flex h-screen w-full overflow-hidden">
      <section className="flex w-full flex-col border-r border-slate-200 lg:w-2/3">
        <header className="border-b border-slate-200 bg-panel px-6 py-4">
          <h1 className="font-display text-lg font-semibold tracking-tight">AgencyPro Gen2 Agent</h1>
          <p className="mt-1 text-sm text-slate-500">LangGraph loop + Composio meta-tools + streamed tool traces</p>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500 shadow-panel">
              Δοκίμασε: <strong>"Πόσα GitHub repos έχω;"</strong>
            </div>
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          )}

          {isRunning ? (
            <div className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-500 shadow-panel">
              <Loader2 className="h-4 w-4 animate-spin" />
              Agent is executing tools...
            </div>
          ) : null}

          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error.message}</p> : null}
        </div>

        <form onSubmit={onSubmit} className="border-t border-slate-200 bg-panel p-4">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask the agent..."
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] outline-none ring-accent focus:ring-2"
            />
            {isRunning ? (
              <button
                type="button"
                onClick={stop}
                className="h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700"
              >
                Stop
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isRunning || !input.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </form>
      </section>

      <section className="hidden h-full border-l border-slate-200 lg:block lg:w-1/3">
        <LogsPanel logs={logs} />
      </section>
    </main>
  );
}
