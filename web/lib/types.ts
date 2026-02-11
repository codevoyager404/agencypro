import type { UIMessage } from "ai";

export type LogStatus = "call" | "result" | "error" | "ready";

export type AgentLogEntry = {
  kind: "session" | "tool" | "error";
  label: string;
  status: LogStatus;
  tool?: string;
  toolCallId?: string;
  input?: Record<string, unknown>;
  summary?: string;
  sessionId?: string;
};

export type AgentAuthPrompt = {
  tool: string;
  toolkit: string;
  authUrl: string;
  message: string;
};

export type AgentUIMessage = UIMessage<never, { log: AgentLogEntry; auth: AgentAuthPrompt }>;

export function collectLogs(messages: AgentUIMessage[]): AgentLogEntry[] {
  const items: AgentLogEntry[] = [];

  for (const message of messages) {
    for (const part of message.parts as Array<Record<string, unknown>>) {
      if (part.type === "data-log" && typeof part.data === "object" && part.data) {
        items.push(part.data as AgentLogEntry);
      }
    }
  }

  return items;
}

export function collectAuthPrompts(messages: AgentUIMessage[]): AgentAuthPrompt[] {
  const prompts: AgentAuthPrompt[] = [];

  for (const message of messages) {
    for (const part of message.parts as Array<Record<string, unknown>>) {
      if (part.type === "data-auth" && typeof part.data === "object" && part.data) {
        prompts.push(part.data as AgentAuthPrompt);
      }
    }
  }

  return prompts;
}
