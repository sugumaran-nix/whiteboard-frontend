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
  onCopied?: () => void;
  onShowShortcuts?: () => void;
}

export default function PresenceBar({
  roomId,
  users,
  selfName,
  selfColor,
  userCount,
  connectionStatus,
  onCopied,
  onShowShortcuts,
}: PresenceBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can fail in insecure contexts; the room code stays
      // visible for manual sharing.
    }
  };

  const statusLabel =
    connectionStatus === "open" ? "Live" : connectionStatus === "connecting" ? "Connecting" : "Offline";
  const statusDot =
    connectionStatus === "open" ? "bg-emerald-500" : connectionStatus === "connecting" ? "bg-amber" : "bg-danger";

  const allUsers = [{ id: "__self__", name: selfName, color: selfColor }, ...users];
  const visible = allUsers.slice(0, 5);
  const overflow = allUsers.length - visible.length;

  return (
    <header className="z-30 grid h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line glass px-3 sm:px-5">
      {/* Left: brand + room code */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <a href="/" aria-label="Back to home" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-sheen text-accent-ink shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 18c3-8 6 4 8-2s4 2 8-6" />
          </svg>
        </a>
        <span className="hidden font-display text-sm font-semibold tracking-tight sm:block">Sketchline</span>
        <span className="hidden h-4 w-px bg-line sm:block" />
        <button
          onClick={handleCopy}
          title="Copy room link"
          className="flex min-w-0 max-w-[120px] items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 font-mono text-[11px] text-ink-soft shadow-sm transition hover:border-accent hover:text-accent sm:max-w-none sm:text-xs"
        >
          <span className="truncate">{roomId}</span>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

      {/* Right: status, avatars, actions */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-soft shadow-sm sm:text-[11px]"
          title={`Connection: ${statusLabel}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot} ${connectionStatus === "open" ? "animate-pulse-ring" : ""}`} />
          <span className="hidden sm:inline">{statusLabel}</span>
        </span>

        <div className="flex items-center" aria-label={`${userCount} people in this room`}>
          {visible.map((u, i) => (
            <span
              key={u.id}
              title={u.id === "__self__" ? `${u.name} (you)` : u.name}
              style={{ backgroundColor: u.color, marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}
              className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] font-semibold text-white ring-2 ring-surface"
            >
              {u.name.charAt(0).toUpperCase()}
            </span>
          ))}
          {overflow > 0 && (
            <span
              style={{ marginLeft: -8 }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 font-mono text-[10px] font-semibold text-ink-soft ring-2 ring-surface"
            >
              +{overflow}
            </span>
          )}
        </div>

        {onShowShortcuts && (
          <button
            onClick={onShowShortcuts}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
            className="hidden h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft shadow-sm transition hover:border-accent hover:text-accent sm:flex"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
            </svg>
          </button>
        )}

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg bg-accent-sheen px-3 py-1.5 text-xs font-medium text-accent-ink shadow-glow transition hover:brightness-[1.06] active:scale-95"
        >
          {copied ? "Copied" : "Share"}
          <span className="hidden sm:inline">{copied ? "" : "link"}</span>
        </button>
      </div>
    </header>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-emerald-500">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
