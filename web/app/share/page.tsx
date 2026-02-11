"use client";

import { useMemo } from "react";
import { Copy, Download } from "lucide-react";

import { decodeShareArtifact } from "@/lib/share";

export default function SharePage() {
  const artifact = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d");
    if (!d) return null;
    return decodeShareArtifact(d);
  }, []);

  const onCopy = async () => {
    if (!artifact?.text) return;
    try {
      await navigator.clipboard.writeText(artifact.text);
    } catch {
      // Best-effort.
    }
  };

  const onDownload = async () => {
    if (!artifact?.text) return;
    const blob = new Blob([artifact.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agencypro-artifact.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!artifact) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
          <h1 className="font-display text-lg font-semibold tracking-tight text-slate-800">Invalid share link</h1>
          <p className="mt-2 text-sm text-slate-500">This artifact link is missing or malformed.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight text-slate-900">
            {artifact.title ?? "Shared Artifact"}
          </h1>
          {artifact.createdAt ? (
            <p className="mt-1 text-sm text-slate-500">Created: {new Date(artifact.createdAt).toLocaleString()}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </header>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
        <pre className="whitespace-pre-wrap break-words text-[14px] leading-7 text-slate-900">{artifact.text}</pre>
      </article>
    </main>
  );
}

