"use client";

import { FormEvent, useMemo, useState, useRef, useEffect } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { Loader2, Send, Terminal, PanelRightClose, PanelRightOpen, Sparkles } from "lucide-react";

import { ChatMessage } from "@/components/chat-message";
import { LogsPanel } from "@/components/logs-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { collectLogs, type AgentApprovalPrompt, type AgentUIMessage } from "@/lib/types";
import { cn } from "@/lib/cn";

const AUTH_SUCCESS_EVENT = "COMPOSIO_AUTH_SUCCESS";
const AUTH_SUCCESS_STORAGE_KEY = "COMPOSIO_AUTH_SUCCESS_TS";

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [showLogs, setShowLogs] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAuthSignalAtRef = useRef(0);
  const pendingAuthResumeRef = useRef(false);

  const { messages, sendMessage, status, stop, error } = useChat<AgentUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const logs = useMemo(() => collectLogs(messages), [messages]);
  const isRunning = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  useEffect(() => {
    if (isRunning || !pendingAuthResumeRef.current) return;
    pendingAuthResumeRef.current = false;

    void sendMessage({
      text: "Connection completed successfully. Continue the previous task.",
    });
  }, [isRunning, sendMessage]);

  useEffect(() => {
    const queueOrResume = () => {
      const now = Date.now();
      if (now - lastAuthSignalAtRef.current < 1500) return;
      lastAuthSignalAtRef.current = now;
      try {
        window.localStorage.removeItem(AUTH_SUCCESS_STORAGE_KEY);
      } catch {
        // Ignore storage access errors (private mode / blocked storage).
      }
      if (isRunning) {
        pendingAuthResumeRef.current = true;
        return;
      }
      void sendMessage({
        text: "Connection completed successfully. Continue the previous task.",
      });
    };

    const handleAuthCallback = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data !== AUTH_SUCCESS_EVENT) return;
      queueOrResume();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_SUCCESS_STORAGE_KEY) return;
      if (!event.newValue) return;
      queueOrResume();
    };

    window.addEventListener("message", handleAuthCallback);
    window.addEventListener("storage", handleStorage);

    const authMarker = window.localStorage.getItem(AUTH_SUCCESS_STORAGE_KEY);
    if (authMarker) {
      queueOrResume();
    }

    return () => {
      window.removeEventListener("message", handleAuthCallback);
      window.removeEventListener("storage", handleStorage);
    };
  }, [isRunning, sendMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isRunning) return;

    const next = input;
    setInput("");
    await sendMessage({ text: next });
  };

  const handleExampleClick = (text: string) => {
    if (isRunning) return;
    sendMessage({ text });
  };

  const onApprove = async (prompt: AgentApprovalPrompt) => {
    if (isRunning) return;
    const payload = { token: prompt.token, toolCalls: prompt.toolCalls };
    await sendMessage({
      text: `APPROVED_TOOL_CALLS:${prompt.token}\n${JSON.stringify(payload, null, 2)}`,
    });
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark transition-colors duration-300">

      {/* --- Main Chat Area --- */}
      <section className="flex flex-1 flex-col relative h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-accent/10 dark:bg-accent-dark/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-accent dark:text-accent-dark" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
                AgencyPro <span className="text-accent dark:text-accent-dark">Gen2</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="hidden lg:flex items-center justify-center h-9 w-9 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              {showLogs ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Scrollable Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          <div className="mx-auto max-w-3xl py-6 space-y-6">

            {/* Empty State / Welcome Hero */}
            {isEmpty && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
                <div className="h-16 w-16 mb-6 rounded-2xl bg-gradient-to-br from-accent to-emerald-600 dark:from-accent-dark dark:to-emerald-500 flex items-center justify-center shadow-glow dark:shadow-glow-dark">
                  <Terminal className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 mb-2">
                  How can I help you today?
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
                  I can manage your tools, analyze data, and run code in a secure workbench.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {[
                    "Summarize my unread emails from Gmail",
                    "Check my latest GitHub PRs",
                    "Analyze the sentiment of my last 5 emails",
                    "Create a calendar event for a team sync"
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(example)}
                      className="px-4 py-3 text-sm text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-600 dark:text-slate-300"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onApprove={onApprove}
                approveDisabled={isRunning}
              />
            ))}

            {/* Loading Indicator */}
            {isRunning && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-accent dark:text-accent-dark" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">Agent is working...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
                Error: {error.message}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating Input Area */}
        <div className="p-4 bg-gradient-to-t from-canvas via-canvas to-transparent dark:from-canvas-dark dark:via-canvas-dark">
          <div className="mx-auto max-w-3xl">
            <form onSubmit={onSubmit} className="relative group">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Message AgencyPro..."
                className="w-full h-14 pl-5 pr-14 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent-dark/50 transition-all"
              />
              {isRunning ? (
                <button
                  type="button"
                  onClick={stop}
                  className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:scale-105 transition-all"
                >
                  <div className="h-3 w-3 bg-current rounded-sm" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center rounded-full bg-accent dark:bg-accent-dark text-white disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 hover:scale-105 transition-all"
                >
                  <Send className="h-4 w-4 ml-0.5" />
                </button>
              )}
            </form>
            <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
              AgencyPro can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </section>

      {/* --- Logs Panel Sidebar (Collapsible) --- */}
      <section
        className={cn(
          "fixed inset-y-0 right-0 z-20 w-full sm:w-80 bg-panel dark:bg-panel-dark border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:transform-none shadow-2xl lg:shadow-none",
          showLogs ? "translate-x-0" : "translate-x-full lg:hidden"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Mobile toggle close */}
          <div className="lg:hidden flex justify-end p-2">
            <button onClick={() => setShowLogs(false)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <PanelRightClose className="h-5 w-5" />
            </button>
          </div>
          <LogsPanel logs={logs} />
        </div>
      </section>

      {/* Mobile Toggle Button (Visible only when sidebar closed on mobile) */}
      {!showLogs && (
        <button
          onClick={() => setShowLogs(true)}
          className="lg:hidden fixed bottom-6 right-6 h-12 w-12 rounded-full bg-accent dark:bg-accent-dark text-white shadow-lg flex items-center justify-center z-30 hover:scale-105 transition-transform"
        >
          <Terminal className="h-6 w-6" />
        </button>
      )}

    </main>
  );
}
