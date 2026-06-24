"use client";

import { useState } from "react";
import type { RemoteUser } from "@/lib/types";

interface PresenceBarProps {
  roomId: string;
  users: RemoteUser[];
  selfName: string;
  selfColor: string;
  userCount: number;
  connectionStatus: "connecting" | "open" | "closed";
}

export default function PresenceBar({
  roomId,
  users,
  selfName,
  selfColor,
  userCount,
  connectionStatus,
}: PresenceBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can fail in insecure contexts; fail silently, the
      // room code is still visible for manual sharing.
    }
  };

  const statusLabel =
    connectionStatus === "open" ? "Live" : connectionStatus === "connecting" ? "Connecting…" : "Disconnected";
  const statusDot =
    connectionStatus === "open" ? "bg-emerald-500" : connectionStatus === "connecting" ? "bg-amber" : "bg-red-500";

  const allUsers = [{ id: "__self__", name: `${selfName} (you)`, color: selfColor }, ...users];
  const visible = allUsers.slice(0, 5);
  const overflow = allUsers.length - visible.length;

  return (
    <div className="flex h-14 w-full items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-5">
      <div className="flex items-center gap-3">
        <span className="font-display text-sm font-semibold tracking-tight">Sketchline</span>
        <span className="hidden h-4 w-px bg-line sm:block" />
        <button
          onClick={handleCopy}
          className="hidden items-center gap-1.5 rounded-md border border-line px-2.5 py-1 font-mono text-xs text-ink-soft transition hover:border-accent hover:text-accent sm:flex"
          title="Copy room link"
        >
          <span>{roomId}</span>
          <CopyIcon />
        </button>
        {copied && <span className="hidden text-xs text-emerald-600 sm:block">Copied!</span>}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-soft">
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
          {statusLabel}
        </span>

        <div className="flex items-center -space-x-2">
          {visible.map((u) => (
            <div
              key={u.id}
              title={u.name}
              style={{ backgroundColor: u.color }}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-[10px] font-semibold text-white"
            >
              {u.name.trim().charAt(0).toUpperCase()}
            </div>
          ))}
          {overflow > 0 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-line text-[10px] font-semibold text-ink-soft">
              +{overflow}
            </div>
          )}
        </div>

        <span className="font-mono text-xs text-ink-soft">{userCount} online</span>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 sm:hidden"
        >
          Share
        </button>
        <button
          onClick={handleCopy}
          className="hidden items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 sm:flex"
        >
          Share link
        </button>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
