"use client";

import { useState } from "react";

interface NameModalProps {
  roomId: string;
  defaultName: string;
  onJoin: (name: string) => void;
}

const SUGGESTIONS = ["Sketcher", "Doodler", "Inky", "Scribble", "Draftsman"];

export default function NameModal({ roomId, defaultName, onJoin }: NameModalProps) {
  const [name, setName] = useState(defaultName);
  const trimmed = name.trim();
  const initial = (trimmed || defaultName).charAt(0).toUpperCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onJoin(trimmed || defaultName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm dark:bg-black/60">
      <form
        onSubmit={handleSubmit}
        aria-label="Choose your display name"
        className="w-full max-w-sm animate-pop-in rounded-panel border border-line bg-surface p-6 shadow-lg"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-sheen font-display text-lg font-semibold text-accent-ink shadow-sm">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-[11px] uppercase tracking-wider text-accent">Room {roomId}</p>
            <h2 className="font-display text-xl font-semibold leading-tight">What should we call you?</h2>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Others in this room will see this name next to your cursor.
        </p>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
          placeholder="Your name"
          aria-label="Your name"
          className="mt-4 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-accent"
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setName(s)}
              className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-soft transition hover:border-accent hover:text-accent"
            >
              {s}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="mt-5 w-full rounded-lg bg-accent-sheen py-2.5 text-sm font-medium text-accent-ink shadow-glow transition hover:brightness-[1.06] active:scale-[0.99]"
        >
          Join board
        </button>
        <p className="mt-2.5 text-center font-mono text-[10px] text-ink-faint">
          Press <kbd className="rounded border border-line px-1">Enter</kbd> to join
        </p>
      </form>
    </div>
  );
}
