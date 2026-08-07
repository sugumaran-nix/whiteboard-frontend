"use client";

// Single-slot toast. The board page owns the message state and clears it on a
// timer; keeping it presentational avoids a provider for one string.
export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 animate-toast-in rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium text-ink shadow-lg sm:bottom-8"
    >
      {message}
    </div>
  );
}
