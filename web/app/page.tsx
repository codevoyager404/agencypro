"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { CalendarDays, GitPullRequest, Inbox, Loader2, Send, Sparkles } from "lucide-react";

import { ChatMessage } from "@/components/chat-message";
import { LogsPanel } from "@/components/logs-panel";
import { collectLogs, type AgentApprovalPrompt, type AgentUIMessage } from "@/lib/types";

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

  const runScenario = async (prompt: string) => {
    if (isRunning) return;
    await sendMessage({ text: prompt });
  };

  const onApprove = async (prompt: AgentApprovalPrompt) => {
    if (isRunning) return;
    const payload = { token: prompt.token, toolCalls: prompt.toolCalls };
    await sendMessage({
      text: `APPROVED_TOOL_CALLS:${prompt.token}\n${JSON.stringify(payload, null, 2)}`,
    });
  };

  const scenarios = [
    {
      title: "Ανάλυσε τα Inbox μου",
      description: "Βρες τα πιο σημαντικά emails και κάνε σύντομη σύνοψη.",
      icon: Inbox,
      prompt: "Analyze my email inbox: summarize the 10 most recent important emails and highlight any action items.",
    },
    {
      title: "Έλεγξε τα PRs μου",
      description: "Δείξε μου τα ανοιχτά PRs και τι χρειάζεται attention.",
      icon: GitPullRequest,
      prompt: "Review my open pull requests: list them with status and recommend the next action for each.",
    },
    {
      title: "Οργάνωσε το Calendar",
      description: "Φτιάξε μου πλάνο εβδομάδας από τα επόμενα events.",
      icon: CalendarDays,
      prompt: "Look at my calendar for the next 7 days and propose an organized weekly plan with focus blocks and breaks.",
    },
    {
      title: "Βοήθησε με ένα task",
      description: "Πες μου 3 τρόπους που μπορείς να βοηθήσεις τώρα, βάσει των εργαλείων μου.",
      icon: Sparkles,
      prompt: "Based on the tools you can access, suggest three high-impact tasks you can do for me right now and ask one clarifying question.",
    },
  ] as const;

  return (
    <main className="flex h-screen w-full overflow-hidden">
      <section className="flex w-full flex-col border-r border-slate-200 lg:w-2/3">
        <header className="border-b border-slate-200 bg-panel px-6 py-4">
          <h1 className="font-display text-lg font-semibold tracking-tight">AgencyPro Gen2 Agent</h1>
          <p className="mt-1 text-sm text-slate-500">LangGraph loop + Composio meta-tools + streamed tool traces</p>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {messages.length === 0 ? (
            <div className="mx-auto w-full max-w-3xl">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-panel">
                <div className="mb-4">
                  <h2 className="font-display text-base font-semibold tracking-tight text-slate-800">
                    Διάλεξε ένα σενάριο για να ξεκινήσεις
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    1 κλικ για να τρέξει ο agent. Θα ζητήσει σύνδεση μόνο αν χρειάζεται.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {scenarios.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      disabled={isRunning}
                      onClick={() => runScenario(s.prompt)}
                      className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-700 ring-1 ring-slate-200 transition group-hover:bg-slate-100">
                          <s.icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800">{s.title}</div>
                          <div className="mt-1 text-sm text-slate-500">{s.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onApprove={onApprove}
                approveDisabled={isRunning}
              />
            ))
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
