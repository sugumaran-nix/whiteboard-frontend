"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    if (!code) {
      setError("Enter a room code, or create a new board.");
      return;
    }
    if (!/^[a-z0-9-]{3,40}$/.test(code)) {
      setError("Codes use letters, numbers and dashes only.");
      return;
    }
    router.push(`/board/${encodeURIComponent(code)}`);
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-paper">
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-50" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 65%)" }}
      />

      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-5 sm:px-6">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Mark />
            <span className="truncate font-display text-lg font-semibold tracking-tight">Sketchline</span>
          </div>
          <ThemeToggle />
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-9 py-10 text-center sm:gap-11">
          <div className="flex flex-col items-center gap-5">
            <span className="animate-rise-in rounded-full border border-line bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-soft shadow-sm">
              WebSockets · Canvas · No signup
            </span>
            <h1 className="max-w-2xl animate-rise-in font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Draw together,
              <br />
              <span className="text-accent">live.</span>
            </h1>
            <p className="max-w-md animate-rise-in text-balance text-base leading-relaxed text-ink-soft sm:text-lg">
              Open a board, share the link, and watch every stroke appear on
              everyone&apos;s screen instantly.
            </p>
          </div>

          <LiveStrokePreview />

          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <button
              onClick={handleCreate}
              className="group w-full rounded-xl bg-accent-sheen px-6 py-3.5 font-medium text-accent-ink shadow-glow transition hover:brightness-[1.06] active:scale-[0.99]"
            >
              Create a new board
              <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </button>

            <div className="flex w-full items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-line" />
              or join one
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleJoin} className="w-full">
              <div className="flex w-full gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value);
                    setError(null);
                  }}
                  aria-label="Room code"
                  aria-invalid={!!error}
                  placeholder="f4k2-9xqz"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-sm shadow-sm outline-none transition placeholder:text-ink-faint focus:border-accent"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium shadow-sm transition hover:border-accent hover:text-accent"
                >
                  Join
                </button>
              </div>
              <p className={`mt-2 h-4 text-xs ${error ? "text-danger" : "text-ink-faint"}`}>
                {error ?? "Paste the code from a shared link."}
              </p>
            </form>

            {recents.length > 0 && (
              <div className="w-full text-left">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">Recent boards</p>
                <ul className="flex flex-col gap-1.5">
                  {recents.map((b) => (
                    <li key={b.roomId}>
                      <button
                        onClick={() => router.push(`/board/${encodeURIComponent(b.roomId)}`)}
                        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-left transition hover:border-accent"
                      >
                        <span className="truncate font-mono text-xs">{b.roomId}</span>
                        <span className="shrink-0 text-[11px] text-ink-faint">{relativeTime(b.visitedAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <ul className="grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
            {[
              { t: "Instant sync", d: "Strokes stream point-by-point over WebSockets." },
              { t: "Nine brushes", d: "Pen, pencil, marker, crayon, watercolour and more." },
              { t: "Live cursors", d: "See who's drawing where, with their name attached." },
            ].map((f) => (
              <li key={f.t} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
                <p className="text-sm font-semibold">{f.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{f.d}</p>
              </li>
            ))}
          </ul>
        </section>

        <footer className="flex flex-col items-center gap-1 pb-8 text-center font-mono text-[11px] text-ink-faint">
          <span>FastAPI WebSockets on the backend · Next.js + HTML5 Canvas on the front</span>
          <span>In-memory rooms — board history resets if the backend restarts.</span>
        </footer>
      </div>
    </main>
  );
}

function Mark() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-sheen text-accent-ink shadow-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M4 18c3-8 6 4 8-2s4 2 8-6" />
      </svg>
    </span>
  );
}

// Signature element: a few colored strokes that draw themselves in a loop on a
// small grid, like cursors actively sketching — plain inline SVG, no canvas.
function LiveStrokePreview() {
  const paths = [
    { d: "M10,70 C 40,20 80,110 120,40 S 190,10 220,60", color: "var(--accent)", dur: "2.4s", delay: "0s" },
    { d: "M20,110 C 60,140 100,90 150,120 S 210,150 230,100", color: "var(--amber)", dur: "2.8s", delay: "0.4s" },
    { d: "M30,30 C 70,55 110,15 160,40", color: "#22A06B", dur: "2.1s", delay: "0.9s" },
  ];
  return (
    <div className="w-full max-w-xs rounded-panel border border-line bg-surface p-2 shadow-md sm:max-w-sm">
      <svg viewBox="0 0 240 160" className="h-28 w-full text-ink-faint sm:h-36" aria-hidden="true">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.45" />
          </pattern>
        </defs>
        <rect width="240" height="160" rx="10" fill="url(#grid)" />
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
    </div>
  );
}
