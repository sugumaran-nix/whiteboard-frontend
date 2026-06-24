"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { randomRoomId } from "@/lib/config";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  const handleCreate = () => {
    router.push(`/board/${randomRoomId()}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toLowerCase().replace(/\s+/g, "");
    if (code) router.push(`/board/${encodeURIComponent(code)}`);
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-paper">
      <div className="absolute inset-0 bg-dot-grid opacity-60" />

      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-6">
        <header className="flex items-center justify-between py-6">
          <span className="font-display text-lg font-semibold tracking-tight">Sketchline</span>
          <ThemeToggle />
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-10 py-12 text-center">
          <div className="flex flex-col items-center gap-5">
            <span className="rounded-full border border-line bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              WebSockets · Canvas · No library
            </span>
            <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Draw together,
              <br />
              <span className="text-accent">live.</span>
            </h1>
            <p className="max-w-md text-balance text-base text-ink-soft sm:text-lg">
              Open a board, share the link, and watch every stroke appear on
              everyone&apos;s screen instantly — no signup required.
            </p>
          </div>

          <LiveStrokePreview />

          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <button
              onClick={handleCreate}
              className="w-full rounded-xl bg-accent px-6 py-3.5 font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.99]"
            >
              Create a new board
            </button>

            <div className="flex w-full items-center gap-3 text-xs text-ink-soft">
              <span className="h-px flex-1 bg-line" />
              or join one
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleJoin} className="flex w-full gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Room code (e.g. f4k2-9xqz)"
                className="flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-sm outline-none ring-accent focus:ring-2"
              />
              <button
                type="submit"
                className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent"
              >
                Join
              </button>
            </form>
          </div>
        </section>

        <footer className="flex flex-col items-center gap-1 pb-8 text-center font-mono text-[11px] text-ink-soft">
          <span>FastAPI WebSockets on the backend · Next.js + HTML5 Canvas on the front</span>
          <span>In-memory rooms — board history resets if the backend restarts.</span>
        </footer>
      </div>
    </main>
  );
}

// Signature element: a few colored strokes that draw themselves in a loop
// on a small grid, like cursors actively sketching — a quiet nod to what
// the product actually does, rendered as plain inline SVG (no canvas, no
// animation libs).
function LiveStrokePreview() {
  const paths = [
    { d: "M10,70 C 40,20 80,110 120,40 S 190,10 220,60", color: "#2454FF", dur: "2.4s", delay: "0s" },
    { d: "M20,110 C 60,140 100,90 150,120 S 210,150 230,100", color: "#F2A93B", dur: "2.8s", delay: "0.4s" },
    { d: "M30,30 C 70,55 110,15 160,40", color: "#22A06B", dur: "2.1s", delay: "0.9s" },
  ];
  return (
    <svg
      viewBox="0 0 240 160"
      className="h-28 w-full max-w-xs text-ink-soft sm:h-36 sm:max-w-sm"
      aria-hidden="true"
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.35" />
        </pattern>
      </defs>
      <rect width="240" height="160" rx="14" fill="url(#grid)" />
      <rect width="240" height="160" rx="14" fill="none" stroke="var(--line)" />
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth="4"
          strokeLinecap="round"
          className="animate-draw-in"
          style={{ animationDuration: p.dur, animationDelay: p.delay }}
        />
      ))}
    </svg>
  );
}
