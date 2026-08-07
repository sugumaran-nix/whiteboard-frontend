"use client";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Tools",
    items: [
      ["1 – 8", "Pen, pencil, marker, calligraphy, crayon, oil, watercolour, spray"],
      ["E", "Eraser"],
      ["[ / ]", "Decrease / increase brush size"],
    ],
  },
  {
    title: "Board",
    items: [
      ["Ctrl / ⌘ + Z", "Undo your last stroke"],
      ["Ctrl / ⌘ + Y", "Redo"],
      ["?", "Show or hide this panel"],
      ["Esc", "Close panels"],
    ],
  },
];

export default function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm dark:bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-pop-in rounded-panel border border-line bg-surface p-6 shadow-lg"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate font-display text-lg font-semibold">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink-soft transition hover:border-accent hover:text-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {GROUPS.map((g) => (
          <div key={g.title} className="mt-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">{g.title}</p>
            <ul className="mt-2 flex flex-col gap-2">
              {g.items.map(([k, d]) => (
                <li key={k} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                  <kbd className="shrink-0 rounded-md border border-line bg-paper px-2 py-0.5 font-mono text-[11px] text-ink-soft">{k}</kbd>
                  <span className="text-xs leading-relaxed text-ink-soft">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
