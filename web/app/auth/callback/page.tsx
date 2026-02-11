"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const AUTH_SUCCESS_EVENT = "COMPOSIO_AUTH_SUCCESS";
const AUTH_SUCCESS_STORAGE_KEY = "COMPOSIO_AUTH_SUCCESS_TS";

export default function AuthCallbackPage() {
  useEffect(() => {
    const hasOpener = Boolean(window.opener && !window.opener.closed);
    try {
      window.localStorage.setItem(AUTH_SUCCESS_STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore storage write errors and rely on postMessage path.
    }
    if (hasOpener) {
      window.opener.postMessage(AUTH_SUCCESS_EVENT, window.location.origin);
    }

    const timer = window.setTimeout(() => {
      if (hasOpener) {
        window.close();
        return;
      }
      window.location.replace("/");
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="flex h-screen w-full items-center justify-center bg-slate-50 px-4">
      <div className="flex items-center gap-2 rounded-xl bg-white p-4 shadow-xl">
        <Loader2 className="h-5 w-5 animate-spin text-green-600" />
        <span className="text-sm font-medium text-slate-700">Connection complete. Returning to chat...</span>
      </div>
    </main>
  );
}
