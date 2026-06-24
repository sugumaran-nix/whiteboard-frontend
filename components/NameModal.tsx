"use client";

import { useState } from "react";

interface NameModalProps {
  roomId: string;
  defaultName: string;
  onJoin: (name: string) => void;
}

export default function NameModal({ roomId, defaultName, onJoin }: NameModalProps) {
  const [name, setName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onJoin(name.trim() || defaultName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl"
      >
        <p className="font-mono text-[11px] uppercase tracking-wider text-accent">Room {roomId}</p>
        <h2 className="mt-1 font-display text-xl font-semibold">What should we call you?</h2>
        <p className="mt-1 text-sm text-ink-soft">Others in this room will see this name next to your cursor.</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
          placeholder="Your name"
          className="mt-4 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
        />
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Join board
        </button>
      </form>
    </div>
  );
}
