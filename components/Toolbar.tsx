"use client";
import { useEffect, useState } from "react";
import type { Tool } from "@/lib/types";

// Palette — shown in the colour section
const SWATCHES = [
  "#1F2421","#2454FF","#F2A93B","#E0473C",
  "#22A06B","#9B5DE5","#EC4899","#0EA5E9","#ffffff",
];

interface ToolbarProps {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  brushWidth: number;
  setBrushWidth: (w: number) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

type ToolGroup = { id: Tool; label: string; icon: JSX.Element }[];

const DRAW_TOOLS: ToolGroup = [
  { id: "pen",         label: "Pen",         icon: <PenIcon /> },
  { id: "pencil",      label: "Pencil",      icon: <PencilIcon /> },
  { id: "marker",      label: "Marker",      icon: <MarkerIcon /> },
  { id: "calligraphy", label: "Calligraphy", icon: <CalligraphyIcon /> },
  { id: "crayon",      label: "Crayon",      icon: <CrayonIcon /> },
  { id: "oil",         label: "Oil Brush",   icon: <OilIcon /> },
  { id: "watercolour", label: "Watercolour", icon: <WatercolourIcon /> },
  { id: "spray",       label: "Spray",       icon: <SprayIcon /> },
];

export default function Toolbar({
  tool, setTool, color, setColor, brushWidth, setBrushWidth,
  onClear, onUndo, onRedo, canUndo, canRedo,
}: ToolbarProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 2500); return; }
    setConfirmClear(false); onClear();
  };

  if (!mounted) return <div className="w-[90px] border-r border-line bg-surface" />;

  const btn = (active: boolean, disabled = false) =>
    `flex h-9 w-9 items-center justify-center rounded-lg transition ${
      disabled ? "cursor-not-allowed opacity-30 text-ink-soft"
      : active  ? "bg-accent text-white shadow-sm"
               : "text-ink-soft hover:bg-accent-soft hover:text-accent"
    }`;

  return (
    <div className="flex h-full w-[90px] flex-col items-center gap-3 overflow-y-auto border-r border-line bg-surface px-2 py-3">

      {/* ── Undo / Redo ── */}
      <div className="flex w-full items-center justify-between gap-1">
        <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
          className={btn(false, !canUndo)}>
          <UndoIcon />
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)"
          className={btn(false, !canRedo)}>
          <RedoIcon />
        </button>
      </div>

      <Divider label="Draw" />

      {/* ── Drawing tools — 2-column grid ── */}
      <div className="grid w-full grid-cols-2 gap-1">
        {DRAW_TOOLS.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setTool(id)} title={label}
            className={btn(tool === id)}>
            {icon}
          </button>
        ))}
      </div>

      <Divider label="Erase" />

      <button onClick={() => setTool("eraser")} title="Eraser"
        className={`${btn(tool === "eraser")} w-full`}>
        <EraserIcon />
        <span className="ml-1.5 text-[11px] font-medium">Eraser</span>
      </button>

      <Divider label="Colour" />

      {/* ── Colour swatches ── */}
      <div className="grid w-full grid-cols-3 gap-1">
        {SWATCHES.map((s) => (
          <button key={s} title={s} onClick={() => { setColor(s); if (tool === "eraser") setTool("pen"); }}
            style={{ backgroundColor: s }}
            className={`h-6 w-full rounded ring-offset-1 ring-offset-surface transition hover:scale-105 ${
              color === s && tool !== "eraser" ? "ring-2 ring-accent" : "border border-line"
            }`}
          />
        ))}
      </div>
      {/* Custom colour */}
      <label className="relative mt-1 flex h-7 w-full cursor-pointer items-center justify-center gap-1.5 rounded border border-dashed border-line text-[10px] text-ink-soft hover:border-accent hover:text-accent"
        title="Custom colour">
        <PipetteIcon />
        <span>Custom</span>
        <input type="color" value={color}
          onChange={(e) => { setColor(e.target.value); if (tool === "eraser") setTool("pen"); }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>

      {/* Swatch preview dot */}
      {tool !== "eraser" && (
        <div className="h-5 w-5 rounded-full border border-line shadow-sm"
          style={{ backgroundColor: color }} />
      )}

      <Divider label="Size" />

      {/* ── Brush size slider ── */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[10px] text-ink-soft">{brushWidth}px</span>
        <input type="range" min={1} max={60} value={brushWidth}
          onChange={(e) => setBrushWidth(Number(e.target.value))}
          className="h-24 w-2 cursor-pointer appearance-none rounded-full bg-line accent-accent"
          style={{ writingMode: "vertical-lr", direction: "rtl" }} />
        {/* Size preview dot */}
        <div className="rounded-full border border-line bg-ink-soft"
          style={{
            width:  Math.max(4, Math.min(brushWidth * 0.55, 36)),
            height: Math.max(4, Math.min(brushWidth * 0.55, 36)),
            backgroundColor: tool === "eraser" ? "transparent" : color,
          }} />
      </div>

      {/* Push clear to bottom */}
      <div className="flex-1" />

      {/* ── Clear board ── */}
      <button onClick={handleClear} title={confirmClear ? "Click again to confirm" : "Clear board"}
        className={`flex h-9 w-full items-center justify-center gap-1 rounded-lg border text-[11px] font-medium transition ${
          confirmClear ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-950/40"
                       : "border-line text-ink-soft hover:border-red-300 hover:text-red-500"
        }`}>
        <TrashIcon />{confirmClear ? "Sure?" : "Clear"}
      </button>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-1">
      <span className="h-px flex-1 bg-line" />
      <span className="font-mono text-[9px] uppercase tracking-wider text-ink-soft">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
const I = ({ children }: { children: React.ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

function PenIcon() { return <I><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></I>; }
function PencilIcon() { return <I><line x1="18" y1="2" x2="22" y2="6"/><path d="M7.5 20.5L19 9l-4-4L3.5 16.5 2 22z"/><line x1="15" y1="5" x2="19" y2="9"/></I>; }
function MarkerIcon() { return <I><path d="M9 11l4 4L20 8a2 2 0 0 0-3-3L9 11z"/><path d="M9 11L5 15a2 2 0 0 0 0 3l1 1a2 2 0 0 0 3 0l4-4"/><line x1="5" y1="20" x2="3" y2="22"/></I>; }
function CalligraphyIcon() { return <I><path d="M3 17c3-3 6-6 8-8"/><path d="M11 9c2-2 4-3 6-3 0 2-1 4-3 6"/><path d="M5 21c1-2 4-7 6-9"/><circle cx="19" cy="5" r="2"/></I>; }
function CrayonIcon() { return <I><path d="M6 20L17 9l-4-4L2 16l4 4z"/><path d="M17 9l3-3a1 1 0 0 0-3-3l-3 3"/><line x1="8" y1="18" x2="12" y2="14"/></I>; }
function OilIcon() { return <I><path d="M3 22l9-9"/><path d="M6 6l2 2-4 4 4 4 4-4"/><path d="M17.5 3A3.5 3.5 0 0 1 21 6.5c0 2-2 4-4 6l-3-3c2-2 4-4 4-6 0-.83-.67-1.5-1.5-1.5"/></I>; }
function WatercolourIcon() { return <I><path d="M12 2a5 5 0 0 1 5 5c0 5-5 13-5 13S7 12 7 7a5 5 0 0 1 5-5z"/><circle cx="12" cy="7" r="2" fill="currentColor"/></I>; }
function SprayIcon() { return <I><path d="M3 3h2v2H3z" fill="currentColor"/><path d="M7 3h2v2H7z" fill="currentColor"/><path d="M3 7h2v2H3z" fill="currentColor"/><path d="M11 7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V7z"/><path d="M14 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor"/></I>; }
function EraserIcon() { return <I><path d="M20 20H7L3.5 16.5a2 2 0 0 1 0-2.83l8.17-8.17a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83L13.5 20"/><path d="M7 20l-4-4"/></I>; }
function UndoIcon() { return <I><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></I>; }
function RedoIcon() { return <I><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></I>; }
function TrashIcon() { return <I><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></I>; }
function PipetteIcon() { return <I><path d="M2 22l4-4"/><path d="M14 4l6 6-9 9-6-6 9-9z"/><path d="M5 11l3 3"/></I>; }
