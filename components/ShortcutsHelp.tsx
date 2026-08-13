"use client";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Tools",
    items: [
      ["1 – 9", "Pen, pencil, marker, highlighter, calligraphy, crayon, oil, watercolour, spray"],
      ["E", "Eraser"],
      ["T", "Text tool"],
      ["[ / ]", "Decrease / increase size"],
    ],
  },
  {
    title: "Canvas",
    items: [
      ["Ctrl / ⌘ + Z", "Undo"],
      ["Ctrl / ⌘ + Y", "Redo"],
      ["Ctrl / ⌘ + +", "Zoom in"],
      ["Ctrl / ⌘ + −", "Zoom out"],
      ["Ctrl / ⌘ + 0", "Reset zoom"],
      ["Ctrl / ⌘ + S", "Download as PNG"],
      ["Shift + drag", "Snap shape to 45° angles"],
    ],
  },
  {
    title: "UI",
    items: [
      ["?", "Show / hide shortcuts"],
      ["Esc", "Close panels / cancel text"],
    ],
  },
];

export default function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md animate-pop-in rounded-2xl border border-line bg-surface p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Keyboard shortcuts</h2>
          <button onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition hover:border-accent hover:text-accent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        {GROUPS.map(g => (
          <div key={g.title} className="mt-4 first:mt-0">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">{g.title}</p>
            <ul className="flex flex-col gap-2">
              {g.items.map(([k, d]) => (
                <li key={k} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                  <kbd className="shrink-0 rounded-md border border-line bg-paper px-2 py-0.5 font-mono text-[11px] text-ink-soft whitespace-nowrap">{k}</kbd>
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
