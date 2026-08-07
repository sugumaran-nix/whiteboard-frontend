import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  randomRoomId,
  readRecentBoards,
  relativeTime,
  type RecentBoard,
} from "@/lib/board";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sketchline — Real-time collaborative whiteboard" },
      {
        name: "description",
        content:
          "Open a shared whiteboard in one click. Sketch together in real time with live cursors, instant strokes, and no accounts required.",
      },
      { property: "og:title", content: "Sketchline — Draw together, live" },
      {
        property: "og:description",
        content:
          "A real-time whiteboard for quick diagrams and jam sessions. Share a link, sketch together, no signup required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentBoard[]>([]);

  useEffect(() => setRecents(readRecentBoards()), []);

  const open = (roomId: string) =>
    navigate({ to: "/board/$roomId", params: { roomId } });

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toLowerCase().replace(/\s+/g, "");
    if (!code) {
      setError("Enter a board code, or start a fresh one.");
      return;
    }
    if (!/^[a-z0-9-]{3,40}$/.test(code)) {
      setError("Codes use letters, numbers and dashes only.");
      return;
    }
    open(code);
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-paper">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[46rem] bg-dot-grid opacity-40" />
      <div
        className="pointer-events-none absolute -top-56 right-[-10%] h-[42rem] w-[42rem] rounded-full opacity-[0.14] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 65%)" }}
      />

      <div className="relative mx-auto w-full max-w-[84rem] px-5 sm:px-8 lg:px-12">
        <Header onCreate={() => open(randomRoomId())} />

        {/* Hero — tighter spacing between the header and the headline. */}
        <section className="grid items-center gap-10 py-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14 lg:py-12">
          <div className="animate-rise-in flex flex-col items-start gap-5">
            <h1 className="font-display text-[2.85rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              The whiteboard that
              <br />
              keeps up with the
              <br />
              <span className="text-accent">conversation.</span>
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-ink-soft">
              Open a board, share the link, and sketch together in real time. No accounts, no setup, no friction.
            </p>

            <div className="flex w-full max-w-xl flex-col gap-4 pt-2 sm:flex-row sm:items-start">
              <button
                onClick={() => open(randomRoomId())}
                className="group shrink-0 rounded-xl bg-accent-sheen px-6 py-3.5 font-medium text-accent-ink shadow-glow transition hover:brightness-[1.06] active:scale-[0.99]"
              >
                Start a board
                <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </button>

              <form onSubmit={handleJoin} className="min-w-0 flex-1">
                <div className="flex min-w-0 gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value);
                      setError(null);
                    }}
                    aria-label="Board code"
                    aria-invalid={!!error}
                    placeholder="f4k2-9xqz"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-3.5 font-mono text-sm shadow-sm outline-none transition placeholder:text-ink-faint focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl border border-line bg-surface px-5 py-3.5 text-sm font-medium shadow-sm transition hover:border-accent hover:text-accent"
                  >
                    Join
                  </button>
                </div>
                <p
                  className={`mt-2 text-xs ${error ? "text-danger" : "text-ink-faint"}`}
                >
                  {error ?? "Have a code? Paste it above and jump in."}
                </p>
              </form>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <LiveStrokePreview />
            {recents.length > 0 && (
              <RecentList boards={recents} onOpen={open} />
            )}
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-line py-14 lg:py-18">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:sticky lg:top-10 lg:self-start">
              Built for the moment when talking isn&apos;t enough.
            </h2>

            <ul className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  t: "Real-time sync",
                  d: "Every stroke appears the instant it is drawn, so the conversation never stalls.",
                },
                {
                  t: "No setup",
                  d: "No accounts, no downloads, no invite forms. Just a link and a board.",
                },
                {
                  t: "Built for teams",
                  d: "Named live cursors show exactly who is drawing what, in any room.",
                },
              ].map((f) => (
                <li
                  key={f.t}
                  className="rounded-panel border border-line bg-surface p-5 shadow-sm transition hover:border-accent hover:shadow-md"
                >
                  <p className="font-display text-base font-semibold tracking-tight">
                    {f.t}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {f.d}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-14 lg:pb-20">
          <div className="grid items-center gap-6 rounded-panel border border-line bg-accent-sheen px-7 py-10 shadow-glow sm:px-12 lg:grid-cols-[minmax(0,1fr)_auto]">
            <h2 className="min-w-0 font-display text-2xl font-semibold tracking-tight text-accent-ink sm:text-3xl">
              Get your team on the same page.
            </h2>
            <button
              onClick={() => open(randomRoomId())}
              className="shrink-0 rounded-xl bg-surface px-6 py-3.5 font-medium text-ink shadow-md transition hover:-translate-y-0.5"
            >
              Start a board
            </button>
          </div>
        </section>

        <footer className="border-t border-line py-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 font-mono text-[11px] text-ink-faint">
            <p>In-memory rooms — boards stay live while connected.</p>
            <p className="shrink-0">Sugumaran © 2026</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Header({ onCreate }: { onCreate: () => void }) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <Mark />
        <span className="truncate font-display text-lg font-semibold tracking-tight">
          Sketchline
        </span>
      </div>
      <button
        onClick={onCreate}
        className="shrink-0 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium shadow-sm transition hover:border-accent hover:text-accent"
      >
        New board
      </button>
    </header>
  );
}

function Mark() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-sheen text-accent-ink shadow-sm">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <path d="M4 18c3-8 6 4 8-2s4 2 8-6" />
      </svg>
    </span>
  );
}

function RecentList({
  boards,
  onOpen,
}: {
  boards: RecentBoard[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="rounded-panel border border-line bg-surface p-4 shadow-sm">
      <p className="mb-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Recent boards
      </p>
      <ul className="flex flex-col gap-1.5">
        {boards.map((b) => (
          <li key={b.roomId}>
            <button
              onClick={() => onOpen(b.roomId)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-left transition hover:border-accent"
            >
              <span className="truncate font-mono text-xs">{b.roomId}</span>
              <span className="shrink-0 text-[11px] text-ink-faint">
                {relativeTime(b.visitedAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Signature element: coloured strokes that draw themselves in a loop on a dot
// grid, like cursors actively sketching — plain inline SVG, no canvas.
function LiveStrokePreview() {
  const paths = [
    {
      d: "M10,70 C 40,20 80,110 120,40 S 190,10 220,60",
      color: "var(--accent)",
      dur: "2.4s",
      delay: "0s",
    },
    {
      d: "M20,110 C 60,140 100,90 150,120 S 210,150 230,100",
      color: "var(--amber)",
      dur: "2.8s",
      delay: "0.4s",
    },
    {
      d: "M30,30 C 70,55 110,15 160,40",
      color: "var(--emerald)",
      dur: "2.1s",
      delay: "0.9s",
    },
  ];

  return (
    <div className="animate-rise-in rounded-panel border border-line bg-surface p-3 shadow-lg">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 pb-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald" />
          <span className="truncate font-mono text-[11px] text-ink-faint">
            board · f4k2-9xqz
          </span>
        </div>
        <div className="flex shrink-0 -space-x-1.5">
          {["A", "M", "R"].map((i) => (
            <span
              key={i}
              className="grid h-5 w-5 place-items-center rounded-full border border-surface bg-surface-2 font-mono text-[9px] text-ink-soft"
            >
              {i}
            </span>
          ))}
        </div>
      </div>
      <svg
        viewBox="0 0 240 160"
        className="h-56 w-full rounded-xl bg-surface-2 text-ink-faint sm:h-72"
        aria-hidden="true"
      >
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
