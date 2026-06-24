"use client";

import type { CursorState } from "@/lib/types";

interface CursorLayerProps {
  cursors: CursorState[];
}

// Pure presentational overlay — positions are normalized (0..1), so this
// scales correctly regardless of the viewer's own window size.
export default function CursorLayer({ cursors }: CursorLayerProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {cursors.map((c) => (
        <div
          key={c.id}
          className="absolute -translate-x-1 -translate-y-1 transition-[left,top] duration-75 ease-linear"
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow-sm">
            <path
              d="M2 2l6.5 16 2.2-6.8L17.5 9 2 2z"
              fill={c.color}
              stroke="white"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="ml-3 -mt-1 inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium text-white shadow-sm"
            style={{ backgroundColor: c.color }}
          >
            {c.name}
          </span>
        </div>
      ))}
    </div>
  );
}
