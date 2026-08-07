import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { rememberBoard } from "@/lib/board";

export const Route = createFileRoute("/board/$roomId")({
  head: () => ({
    meta: [
      { title: "Board — Sketchline" },
      {
        name: "description",
        content: "A live Sketchline whiteboard room shared over WebSockets.",
      },
      { property: "og:title", content: "Board — Sketchline" },
      {
        property: "og:description",
        content: "A live Sketchline whiteboard room shared over WebSockets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Board,
});

function Board() {
  const { roomId } = Route.useParams();
  useEffect(() => rememberBoard(roomId), [roomId]);

  return (
    <div className="relative min-h-dvh bg-paper">
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-40" />
      <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
          board · {roomId}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          The canvas loads here
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-ink-soft">
          This room is reserved. Connect the drawing canvas and WebSocket client
          to bring it to life.
        </p>
        <Link
          to="/"
          className="mt-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-medium shadow-sm transition hover:border-accent hover:text-accent"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
