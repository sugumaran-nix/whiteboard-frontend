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
  roomId, users, selfName, selfColor, userCount,
  connectionStatus, onCopied, onShowShortcuts,
}: PresenceBarProps) {
  const [copied, setCopied] = useState(false);
  const [showUserList, setShowUserList] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const statusLabel =
    connectionStatus === "open" ? "Live" :
    connectionStatus === "connecting" ? "Connecting..." : "Offline";
  const statusDot =
    connectionStatus === "open" ? "bg-emerald-500" :
    connectionStatus === "connecting" ? "bg-amber" : "bg-danger";
  const statusText =
    connectionStatus === "open" ? "text-emerald-600 dark:text-emerald-400" :
    connectionStatus === "connecting" ? "text-amber" : "text-danger";

  const allUsers = [{ id: "__self__", name: selfName, color: selfColor }, ...users];
  const visible = allUsers.slice(0, 4);
  const overflow = allUsers.length - visible.length;

  return (
    <header className="z-30 flex h-14 w-full items-center gap-2 border-b border-line glass px-3 sm:px-4">

      {/* Left: Logo + Room code */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">

        
          href="/"
          aria-label="Back to Sketchline home"
          title="Back to home"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-sheen text-accent-ink shadow-sm transition hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M4 18c3-8 6 4 8-2s4 2 8-6" />
          </svg>
        </a>

        <span className="hidden font-display text-sm font-semibold tracking-tight sm:block">Sketchline</span>
        <span className="hidden h-4 w-px shrink-0 bg-line sm:block" />

        <button
          onClick={handleCopy}
          title="Click to copy board link to clipboard"
          aria-label={`Room code ${roomId}. Click to copy link.`}
          className="group flex min-w-0 items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-1.5 font-mono text-[11px] text-ink-soft shadow-sm transition hover:border-accent hover:text-accent sm:text-xs"
        >
          <span className="truncate max-w-[90px] sm:max-w-none">{roomId}</span>
          <span className="shrink-0 transition-transform group-hover:scale-110">
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500"><path d="M20 6L9 17l-5-5"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            )}
          </span>
        </button>

        <span
          className={`hidden shrink-0 font-mono text-[10px] text-emerald-500 transition-opacity sm:block ${copied ? "opacity-100" : "opacity-0"}`}
          aria-live="polite"
        >
          Link copied!
        </span>
      </div>

      {/* Right: Status + Avatars + Share */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">

        <div
          title={`Connection: ${statusLabel}`}
          aria-label={`Connection status: ${statusLabel}`}
          className={`flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[10px] tracking-wide shadow-sm ${statusText}`}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot} ${connectionStatus === "open" ? "animate-pulse-ring" : ""}`} />
          <span className="hidden sm:inline uppercase">{statusLabel}</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowUserList(v => !v)}
            aria-label={`${userCount} ${userCount === 1 ? "person" : "people"} in this board - click to see names`}
            title={`${userCount} people here`}
            className="flex items-center"
          >
            {visible.map((u, i) => (
              <span
                key={u.id}
                title={u.id === "__self__" ? `${u.name} (you)` : u.name}
                style={{
                  backgroundColor: u.color,
                  marginLeft: i === 0 ? 0 : -10,
                  zIndex: 10 - i,
                }}
                className="relative flex h-8 w-8 items-center justify-center rounded-full font-mono text-[11px] font-semibold text-white ring-2 ring-surface transition hover:z-20 hover:scale-110"
              >
                {u.name.charAt(0).toUpperCase()}
              </span>
            ))}
            {overflow > 0 && (
              <span
                style={{ marginLeft: -10 }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 font-mono text-[10px] font-semibold text-ink-soft ring-2 ring-surface"
              >
                +{overflow}
              </span>
            )}
          </button>

          {showUserList && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[160px] animate-pop-in rounded-2xl border border-line bg-surface p-2 shadow-lg">
              <p className="mb-1.5 px-2 font-mono text-[9px] uppercase tracking-widest text-ink-faint">
                {userCount} {userCount === 1 ? "person" : "people"} here
              </p>
              {allUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs text-ink">
                    {u.name}
                    {u.id === "__self__" && (
                      <span className="ml-1 font-mono text-[9px] text-ink-faint">(you)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {onShowShortcuts && (
          <button
            onClick={onShowShortcuts}
            title="Keyboard shortcuts (?)"
            aria-label="Show keyboard shortcuts"
            className="hidden h-8 w-8 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft shadow-sm transition hover:border-accent hover:text-accent sm:flex"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9"/>
              <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>
            </svg>
          </button>
        )}

        <button
          onClick={handleCopy}
          aria-label="Copy board link to share"
          className="flex items-center gap-1.5 rounded-xl bg-accent-sheen px-3 py-1.5 text-xs font-semibold text-accent-ink shadow-glow transition hover:brightness-105 active:scale-95"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              <span className="hidden sm:inline">Share board</span>
              <span className="sm:hidden">Share</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
