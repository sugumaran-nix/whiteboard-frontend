"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { randomRoomId } from "@/lib/config";
import { readRecentBoards, relativeTime, type RecentBoard } from "@/lib/recent";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentBoard[]>([]);

  useEffect(() => setRecents(readRecentBoards()), []);

  const handleCreate = () => router.push(`/board/${randomRoomId()}`);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toLowerCase().replace(/\s+/g, "");
    if (!code) { setError("Enter a room code first."); return; }
    if (!/^[a-z0-9-]{3,40}$/.test(code)) { setError("Codes use letters, numbers and dashes only."); return; }
    router.push(`/board/${encodeURIComponent(code)}`);
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-paper">

      {/* Subtle background grid — not a dot soup, just a faint structural guide */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--ink) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Single accent glow — top centre only, restrained */}
      <div
        className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[600px] -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "var(--accent)" }}
      />

      {/* ── Navbar ── */}
      <header className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">Sketchline</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-[13px] text-ink-soft transition hover:text-ink sm:block"
          >
            Open source
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-5 pt-10 pb-16 sm:px-8 sm:pt-16">

        {/* Headline — no eyebrow badge, no gradient text (impeccable bans both) */}
        <div className="animate-rise-in mb-8 text-center sm:mb-10">
          <h1
            className="font-display text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-ink sm:text-[3.6rem]"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Draw together,{" "}
            <span style={{ color: "var(--accent)" }}>live.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-balance text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">
            Open a board, share the link. Every stroke appears on everyone's screen the moment you draw it — no login, no friction.
          </p>
        </div>

        {/* Live stroke preview — raw SVG on transparent bg, not boxed */}
        <div className="animate-rise-in mb-10 h-28 w-full max-w-sm sm:h-36" style={{ animationDelay: "0.05s" }}>
          <StrokePreview />
        </div>

        {/* CTA */}
        <div className="animate-rise-in flex w-full flex-col gap-3" style={{ animationDelay: "0.1s" }}>
          <button
            onClick={handleCreate}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-[15px] font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: "var(--accent)",
              boxShadow: "var(--shadow-glow)",
              height: "52px",
            }}
          >
            New board
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:translate-x-1"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          {/* Join form */}
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value); setError(null); }}
              aria-label="Room code"
              placeholder="Paste a board code…"
              className="h-[52px] min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 font-mono text-[13px] text-ink outline-none transition placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-[var(--accent)]/20"
              style={{ fontSize: "13px" }}
            />
            <button
              type="submit"
              className="h-[52px] shrink-0 rounded-2xl border border-line bg-surface px-5 text-[14px] font-semibold text-ink-soft transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Join
            </button>
          </form>

          {/* Error / hint */}
          <p className={`text-center text-[12px] transition-colors ${error ? "text-[var(--danger)]" : "text-ink-faint"}`} style={{ minHeight: "16px" }}>
            {error ?? "No account needed."}
          </p>
        </div>

        {/* Recent boards */}
        {recents.length > 0 && (
          <div className="animate-rise-in mt-8 w-full" style={{ animationDelay: "0.15s" }}>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-ink-faint">Recent boards</p>
            <ul className="flex flex-col divide-y divide-[var(--line)]">
              {recents.map((b) => (
                <li key={b.roomId}>
                  <button
                    onClick={() => router.push(`/board/${encodeURIComponent(b.roomId)}`)}
                    className="flex w-full items-center justify-between py-3 text-left transition hover:text-[var(--accent)]"
                  >
                    <span className="font-mono text-[13px] text-ink">{b.roomId}</span>
                    <span className="text-[12px] text-ink-faint">{relativeTime(b.visitedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feature strip — inline stats, no identical card grid (impeccable bans it) */}
        <div className="animate-rise-in mt-12 flex w-full items-start justify-between gap-4 border-t border-[var(--line)] pt-8" style={{ animationDelay: "0.2s" }}>
          {[
            { stat: "9", label: "Brush types", sub: "pen, marker, crayon, oil…" },
            { stat: "~0ms", label: "Visible lag", sub: "point-by-point WebSockets" },
            { stat: "∞", label: "Canvas size", sub: "no grid, no limit" },
          ].map((f) => (
            <div key={f.stat} className="flex flex-1 flex-col items-center gap-1 text-center">
              <span className="font-display text-2xl font-semibold text-ink sm:text-3xl">{f.stat}</span>
              <span className="text-[12px] font-medium text-ink-soft">{f.label}</span>
              <span className="hidden text-[11px] text-ink-faint sm:block">{f.sub}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-6 text-center font-mono text-[11px] text-ink-faint">
        FastAPI · Next.js · HTML5 Canvas · In-memory rooms
      </footer>
    </div>
  );
}

function LogoMark() {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
      style={{ background: "var(--accent)" }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <path d="M4 18c3-8 6 4 8-2s4 2 8-6" />
      </svg>
    </span>
  );
}

function StrokePreview() {
  const strokes = [
    { d: "M20,80 C60,20 100,120 150,50 S220,10 270,60", color: "var(--accent)", delay: "0s", dur: "2.2s" },
    { d: "M30,110 C70,140 120,80 170,115 S240,145 280,95", color: "var(--amber)", delay: "0.5s", dur: "2.6s" },
    { d: "M50,40 C90,65 140,20 195,50 S250,30 290,55", color: "oklch(0.55 0.16 160)", delay: "1s", dur: "2s" },
  ];
  return (
    <svg viewBox="0 0 320 160" className="h-full w-full" aria-hidden="true">
      {strokes.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill="none"
          stroke={s.color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw-in"
          style={{ animationDelay: s.delay, animationDuration: s.dur }}
        />
      ))}
    </svg>
  );
}
