"use client";

import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
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
  const [showNames, setShowNames] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const allUsers = [{ id: "__self__", name: selfName, color: selfColor }, ...users];
  const visible = allUsers.slice(0, 4);
  const overflow = allUsers.length - visible.length;

  const statusColor =
    connectionStatus === "open" ? "oklch(0.60 0.18 160)" :
    connectionStatus === "connecting" ? "var(--amber)" : "var(--danger)";
  const statusLabel =
    connectionStatus === "open" ? "Live" :
    connectionStatus === "connecting" ? "Connecting" : "Offline";

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-[var(--line)] bg-[var(--surface)] px-3 sm:px-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {/* Left: Logo + room code */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <a
          href="/"
          aria-label="Back to Sketchline home"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition hover:opacity-80"
          style={{ background: "var(--accent)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 18c3-8 6 4 8-2s4 2 8-6" />
          </svg>
        </a>

        <span className="hidden font-display text-[14px] font-semibold tracking-tight text-ink sm:block">Sketchline</span>
        <span className="hidden h-4 w-px bg-[var(--line)] sm:block" />

        {/* Room code chip — clicking copies */}
        <button
          onClick={handleCopy}
          title="Click to copy board link"
          aria-label={`Room ${roomId} — click to copy invite link`}
          className="group flex min-w-0 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 transition hover:border-[var(--accent)]"
        >
          <span className="truncate font-mono text-[11px] text-ink-soft group-hover:text-[var(--accent)] max-w-[80px] sm:max-w-[140px]">
            {roomId}
          </span>
          <span className="shrink-0 text-ink-faint transition group-hover:text-[var(--accent)]">
            {copied
              ? <CheckIcon />
              : <CopyIcon />
            }
          </span>
        </button>

        {/* Inline copied confirmation */}
        <span
          className="hidden shrink-0 font-mono text-[11px] transition-opacity sm:block"
          style={{ color: "oklch(0.60 0.18 160)", opacity: copied ? 1 : 0 }}
          aria-live="polite"
        >
          Copied!
        </span>
      </div>

      {/* Right: status + avatars + theme + invite */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">

        {/* Connection status */}
        <div
          className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1"
          title={`Connection: ${statusLabel}`}
          aria-label={`Connection: ${statusLabel}`}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              backgroundColor: statusColor,
              boxShadow: connectionStatus === "open" ? `0 0 0 0 ${statusColor}` : "none",
              animation: connectionStatus === "open" ? "pulse-dot 2s ease-out infinite" : "none",
            }}
          />
          <span className="hidden font-mono text-[10px] uppercase tracking-wide text-ink-soft sm:block">
            {statusLabel}
          </span>
        </div>

        {/* Avatar stack with name tooltip */}
        <div className="relative">
          <button
            onClick={() => setShowNames(v => !v)}
            aria-label={`${userCount} people in this board`}
            className="flex items-center"
          >
            {visible.map((u, i) => (
              <span
                key={u.id}
                title={u.id === "__self__" ? `${u.name} (you)` : u.name}
                style={{
                  backgroundColor: u.color,
                  marginLeft: i === 0 ? 0 : -9,
                  zIndex: 10 - i,
                }}
                className="relative flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white ring-2 ring-[var(--surface)] transition hover:z-20 hover:scale-110"
              >
                {u.name.charAt(0).toUpperCase()}
              </span>
            ))}
            {overflow > 0 && (
              <span
                style={{ marginLeft: -9 }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] font-mono text-[10px] text-ink-soft ring-2 ring-[var(--surface)]"
              >
                +{overflow}
              </span>
            )}
          </button>

          {/* Names dropdown */}
          {showNames && (
            <div className="animate-pop-in absolute right-0 top-[calc(100%+8px)] z-50 min-w-[180px] rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2" style={{ boxShadow: "var(--shadow-lg)" }}>
              <p className="mb-1.5 px-2 font-mono text-[9px] uppercase tracking-widest text-ink-faint">
                {userCount} {userCount === 1 ? "person" : "people"} here
              </p>
              {allUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white" style={{ backgroundColor: u.color }}>
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[13px] text-ink">
                    {u.name}
                    {u.id === "__self__" && <span className="ml-1.5 font-mono text-[10px] text-ink-faint">(you)</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shortcuts button — desktop only */}
        {onShowShortcuts && (
          <button
            onClick={onShowShortcuts}
            title="Keyboard shortcuts (?)"
            aria-label="Show keyboard shortcuts"
            className="hidden h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-ink-soft transition hover:border-[var(--accent)] hover:text-[var(--accent)] sm:flex"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
            </svg>
          </button>
        )}

        {/* Theme toggle — lives in navbar (not floating on canvas) */}
        <ThemeToggle />

        {/* Invite CTA */}
        <button
          onClick={handleCopy}
          aria-label="Copy board link to invite others"
          className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-white transition hover:brightness-110 active:scale-95"
          style={{ background: "var(--accent)", boxShadow: "var(--shadow-glow)" }}
        >
          {copied ? (
            <><CheckIcon />Copied</>
          ) : (
            <><ShareIcon /><span className="hidden sm:inline">Invite</span></>
          )}
        </button>
      </div>
    </header>
  );
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
