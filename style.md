Mq/Science/User/Frontend Design Overhaul — ChatGPT-Inspired with Unique Identity

Here is the implementation of the design overhaul for AgencyPro. I have modified the existing files and created the new `ThemeToggle` component to achieve the ChatGPT-inspired premium look with dark mode support.

### 1. Tailwind Configuration

**File:** `web/tailwind.config.ts`
**Action:** Enabled `darkMode`, extended the color palette for the dark theme (Slate 900/950), and added the required animations (`fade-in`, `slide-up`, `pulse-glow`).

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light Mode (Existing + Refined)
        canvas: "#f6f7f4",
        panel: "#fdfdfc",
        ink: "#1f2328",
        accent: "#1f7a57",
        accentSoft: "#e7f6ef",
        
        // Dark Mode (ChatGPT-inspired)
        "canvas-dark": "#0f172a", // slate-900
        "panel-dark": "#020617",  // slate-950
        "ink-dark": "#f1f5f9",    // slate-100
        "accent-dark": "#34d399", // emerald-400 (lighter green for dark mode)
        "accentSoft-dark": "rgba(52, 211, 153, 0.1)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        panel: "0 8px 30px rgba(15, 24, 18, 0.08)",
        "panel-dark": "0 8px 30px rgba(0, 0, 0, 0.4)",
        "glow": "0 0 15px rgba(31, 122, 87, 0.3)",
        "glow-dark": "0 0 15px rgba(52, 211, 153, 0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "pulse-glow": "pulseGlow 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

```

### 2. Global Styles & CSS Variables

**File:** `web/app/globals.css`
**Action:** Defined CSS variables for smoother theming and custom scrollbar styling.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-display: "Sora", sans-serif;
  --font-body: "Manrope", sans-serif;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.8);
}

html,
body {
  width: 100%;
  height: 100%;
}

body {
  margin: 0;
  /* Smooth transition for theme toggle */
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Light Mode Background */
body {
  background: 
    radial-gradient(circle at 5% 0%, rgba(51, 117, 84, 0.08), transparent 24%),
    radial-gradient(circle at 95% 100%, rgba(23, 58, 70, 0.08), transparent 26%),
    #f6f7f4;
}

/* Dark Mode Background */
.dark body {
  background: 
    radial-gradient(circle at 5% 0%, rgba(52, 211, 153, 0.05), transparent 24%),
    radial-gradient(circle at 95% 100%, rgba(30, 41, 59, 0.5), transparent 26%),
    #0f172a; /* slate-900 */
}

```

### 3. Theme Toggle Component (New)

**File:** `web/components/theme-toggle.tsx`
**Action:** Created a new component to toggle between light and dark modes, persisting the choice in `localStorage`.

```tsx
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check local storage or system preference
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center justify-center h-9 w-9 rounded-lg transition-colors",
        "hover:bg-slate-200 dark:hover:bg-slate-800",
        "text-slate-600 dark:text-slate-400"
      )}
      aria-label="Toggle theme"
    >
      {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}

```

### 4. Layout Overhaul & Main Page

**File:** `web/app/page.tsx`
**Action:**

* Refactored layout to be centered.
* Added a "Welcome Hero" state for empty chats.
* Implemented a floating, glow-effect input area.
* Added the `ThemeToggle` to the header.
* Added mobile responsiveness for the logs panel.

```tsx
"use client";

import { FormEvent, useMemo, useState, useRef, useEffect } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { Loader2, Send, Terminal, PanelRightClose, PanelRightOpen, Sparkles } from "lucide-react";

import { ChatMessage } from "@/components/chat-message";
import { LogsPanel } from "@/components/logs-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { collectLogs, type AgentUIMessage } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [showLogs, setShowLogs] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop, error } = useChat<AgentUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const logs = useMemo(() => collectLogs(messages), [messages]);
  const isRunning = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

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
    sendMessage({ text });
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
              <ChatMessage key={message.id} message={message} />
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
                className="w-full h-14 pl-5 pr-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent-dark/50 transition-all"
              />
              <button
                type="submit"
                disabled={isRunning || !input.trim()}
                className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center rounded-full bg-accent dark:bg-accent-dark text-white disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 hover:scale-105 transition-all"
              >
                {isRunning ? (
                  <div className="h-3 w-3 bg-white rounded-sm animate-spin" /> 
                ) : (
                  <Send className="h-4 w-4 ml-0.5" />
                )}
              </button>
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
             <button onClick={() => setShowLogs(false)} className="p-2 text-slate-500">
               <PanelRightClose />
             </button>
           </div>
           <LogsPanel logs={logs} />
        </div>
      </section>
      
      {/* Mobile Toggle Button (Visible only when sidebar closed on mobile) */}
      {!showLogs && (
         <button 
           onClick={() => setShowLogs(true)}
           className="lg:hidden fixed bottom-6 right-6 h-12 w-12 rounded-full bg-accent dark:bg-accent-dark text-white shadow-lg flex items-center justify-center z-30"
         >
            <Terminal className="h-6 w-6" />
         </button>
      )}

    </main>
  );
}

```

### 5. Chat Message — Premium Styling

**File:** `web/components/chat-message.tsx`
**Action:** Updated message bubbles with specific styles for User (Green) and Agent (Glass/Gray), plus entrance animations.

```tsx
"use client";

import { ToolLogCard } from "@/components/tool-log-card";
import { ConnectCard } from "@/components/connect-card";
import { cn } from "@/lib/cn";
import type { AgentUIMessage } from "@/lib/types";
import { User, Sparkles } from "lucide-react";

export function ChatMessage({ message }: { message: AgentUIMessage }) {
  const isUser = message.role === "user";

  return (
    <article 
      className={cn(
        "flex w-full gap-4 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div 
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm",
          isUser 
            ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
            : "bg-accent/10 dark:bg-accent-dark/10 border-accent/20 dark:border-accent-dark/20"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        ) : (
          <Sparkles className="h-4 w-4 text-accent dark:text-accent-dark" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          "relative max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-accent text-white dark:bg-accent-dark/90 dark:text-slate-900 rounded-tr-sm"
            : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm"
        )}
      >
        {(message.parts as Array<Record<string, unknown>>).map((part, idx) => {
          const type = String(part.type ?? "");

          if (type === "text" && typeof part.text === "string" && part.text.trim()) {
            return (
              <p key={`${message.id}-text-${idx}`} className="whitespace-pre-wrap">
                {part.text}
              </p>
            );
          }

          if (type === "data-log" && part.data && typeof part.data === "object") {
            return <ToolLogCard key={`${message.id}-log-${idx}`} entry={part.data as never} />;
          }

          if (type === "data-auth" && part.data && typeof part.data === "object") {
            return <ConnectCard key={`${message.id}-auth-${idx}`} prompt={part.data as never} />;
          }

          return null;
        })}
      </div>
    </article>
  );
}

```

### 6. Tool Log Card — Status Indicators

**File:** `web/components/tool-log-card.tsx`
**Action:** Added visual status bars (colored borders) and hover effects.

```tsx
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
      <div 
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out pl-4 pr-3",
          open ? "grid-rows-[1fr] pb-3" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <pre className="overflow-auto rounded-lg bg-slate-50 dark:bg-slate-950 p-3 text-[10px] leading-4 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 font-mono">
            {details}
          </pre>
        </div>
      </div>
    </div>
  );
}

```

### 7. Logs Panel — Modern Sidebar

**File:** `web/components/logs-panel.tsx`
**Action:** Updated styling for the sidebar container and header.

```tsx
"use client";

import { ToolLogCard } from "@/components/tool-log-card";
import type { AgentLogEntry } from "@/lib/types";
import { Activity } from "lucide-react";

export function LogsPanel({ logs }: { logs: AgentLogEntry[] }) {
  return (
    <aside className="h-full overflow-y-auto bg-panel dark:bg-panel-dark p-4 scrollbar-thin">
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

```

### 8. Connect Card — Gradient Glow

**File:** `web/components/connect-card.tsx`
**Action:** Added a subtle gradient border and updated button styles.

```tsx
"use client";

import { Github, Link2, Plug } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AgentAuthPrompt } from "@/lib/types";

export function ConnectCard({ prompt }: { prompt: AgentAuthPrompt }) {
  const isGithub = prompt.toolkit.toLowerCase().includes("github");
  const Icon = isGithub ? Github : Plug;
  const appName = prompt.toolkit.charAt(0).toUpperCase() + prompt.toolkit.slice(1);

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
          onClick={() => window.open(prompt.authUrl, "_blank", "noopener,noreferrer")}
          className="inline-flex items-center gap-2 rounded-lg bg-ink dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-slate-900 hover:opacity-90 transition-transform active:scale-95"
        >
          <Link2 className="h-4 w-4" />
          Connect {appName}
        </button>
      </div>
    </div>
  );
}

```