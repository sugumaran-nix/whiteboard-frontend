"use client";

import type { CursorState } from "@/lib/types";

interface CursorLayerProps {
  cursors: CursorState[];
}

// Pure presentational overlay — positions are normalized (0..1), so this
// scales correctly regardless of the viewer's own window size.
export default function CursorLayer({ cursors }: CursorLayerProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {cursors.map((c) => {
        const idle = Date.now() - c.lastSeen > 1800;
        const nearRightEdge = c.x > 0.82;
        return (
          <div
            key={c.id}
            className="absolute -translate-x-1 -translate-y-1 transition-[left,top,opacity] duration-75 ease-out will-change-[left,top]"
            style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, opacity: idle ? 0.45 : 1 }}
          >
            <svg width="22" height="22" viewBox="0 0 20 20" className="drop-shadow-md">
              <path
                d="M2 2l6.5 16 2.2-6.8L17.5 9 2 2z"
                fill={c.color}
                stroke="var(--surface)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className={`-mt-1 inline-block max-w-[9rem] truncate rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium text-white shadow-md ring-1 ring-black/10 ${
                nearRightEdge ? "absolute right-3.5 top-4" : "ml-3.5"
              }`}
              style={{ backgroundColor: c.color }}
            >
              {c.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
