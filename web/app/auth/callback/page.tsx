"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const AUTH_SUCCESS_EVENT = "COMPOSIO_AUTH_SUCCESS";

export default function AuthCallbackPage() {
  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(AUTH_SUCCESS_EVENT, window.location.origin);
    }

    const timer = window.setTimeout(() => {
      window.close();
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
