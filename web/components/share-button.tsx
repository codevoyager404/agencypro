"use client";

import { useCallback, useMemo, useState } from "react";
import { toPng } from "html-to-image";
import { Copy, Download, Share2 } from "lucide-react";

import { encodeShareArtifact, type ShareArtifact } from "@/lib/share";

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, data] = dataUrl.split(",", 2);
  const mime = meta?.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const binary = atob(data ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ShareButton({
  title,
  text,
  targetRef,
}: {
  title?: string;
  text: string;
  targetRef: React.RefObject<HTMLElement | null>;
}) {
  const [busy, setBusy] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const artifact: ShareArtifact = {
      title,
      text,
      createdAt: new Date().toISOString(),
    };
    const d = encodeShareArtifact(artifact);
    return `${window.location.origin}/share?d=${encodeURIComponent(d)}`;
  }, [title, text]);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Best-effort.
    }
  }, [shareUrl]);

  const shareScreenshot = useCallback(async () => {
    const el = targetRef.current;
    if (!el) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], "agencypro-artifact.png", { type: "image/png" });

      const canShareFiles =
        typeof navigator !== "undefined" &&
        "canShare" in navigator &&
        typeof (navigator as any).canShare === "function" &&
        (navigator as any).canShare({ files: [file] });

      if (typeof navigator !== "undefined" && "share" in navigator && canShareFiles) {
        await (navigator as any).share({
          title: title ?? "AgencyPro Artifact",
          text: title ?? "AgencyPro Artifact",
          files: [file],
        });
        return;
      }

      // Fallback: download.
      downloadBlob(blob, "agencypro-artifact.png");
    } finally {
      setBusy(false);
    }
  }, [targetRef, title]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={shareScreenshot}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
        title="Share a screenshot"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300"
        title="Copy public link"
      >
        <Copy className="h-3.5 w-3.5" />
        Link
      </button>
      <a
        href={shareUrl}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300"
        title="Open public link"
      >
        <Download className="h-3.5 w-3.5" />
        Open
      </a>
    </div>
  );
}

