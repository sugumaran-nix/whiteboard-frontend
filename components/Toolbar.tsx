"use client";

import { useEffect, useRef, useState } from "react";
import type { Tool } from "@/lib/types";

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const SWATCHES = [
  "#1a1a2e","#2454ff","#f2a93b","#e0473c",
  "#22a06b","#9b5de5","#ec4899","#0ea5e9",
  "#ffffff","#ff6b35","#00b4d8","#06d6a0",
];

const SIZE_PRESETS = [2, 6, 14, 28, 48];

type BrushDef = {
  id: Tool; label: string; key: string;
  description: string;
  preview: React.ReactNode;
  icon: React.ReactNode;
};

const BRUSHES: BrushDef[] = [
  {
    id: "pen", label: "Pen", key: "1",
    description: "Smooth, precise strokes",
    preview: <path d="M4,20 C20,16 28,8 44,6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />,
    icon: <PenIcon />,
  },
  {
    id: "pencil", label: "Pencil", key: "2",
    description: "Textured graphite feel",
    preview: <path d="M4,18 C14,14 24,10 44,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.75" />,
    icon: <PencilIcon />,
  },
  {
    id: "marker", label: "Marker", key: "3",
    description: "Bold, flat coverage",
    preview: <path d="M4,22 C16,18 28,10 44,8" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.7" />,
    icon: <MarkerIcon />,
  },
  {
    id: "calligraphy", label: "Calligraphy", key: "4",
    description: "Variable-width ink nib",
    preview: <><path d="M4,24 C16,18 28,10 44,6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" /><path d="M4,26 C16,20 28,12 44,8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" /></>,
    icon: <CalligraphyIcon />,
  },
  {
    id: "crayon", label: "Crayon", key: "5",
    description: "Waxy, rough texture",
    preview: <path d="M4,20 C16,16 28,12 44,10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.55" strokeDasharray="3 1" />,
    icon: <CrayonIcon />,
  },
  {
    id: "oil", label: "Oil brush", key: "6",
    description: "Thick painterly strokes",
    preview: <><path d="M4,22 C16,18 28,12 44,10" stroke="currentColor" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.45" /><path d="M4,22 C16,18 28,12 44,10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" /></>,
    icon: <OilIcon />,
  },
  {
    id: "watercolour", label: "Watercolour", key: "7",
    description: "Soft, bleed-through washes",
    preview: <><circle cx="14" cy="16" r="8" fill="currentColor" opacity="0.18" /><circle cx="24" cy="14" r="7" fill="currentColor" opacity="0.18" /><circle cx="34" cy="16" r="8" fill="currentColor" opacity="0.18" /></>,
    icon: <WatercolourIcon />,
  },
  {
    id: "spray", label: "Spray", key: "8",
    description: "Scattered particle mist",
    preview: (
      <>
        {[12,8,16,6,14,10,18,8,14,12,16,10,8].map((cx, i) => (
          <circle key={i} cx={cx + i * 2.5} cy={14 + (i % 3) * 3 - 3} r="1" fill="currentColor" opacity={0.4 + (i % 4) * 0.15} />
        ))}
      </>
    ),
    icon: <SprayIcon />,
  },
];

/* ─── Types ─────────────────────────────────────────────────────────────────── */
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type Panel = "brush" | "color" | "size" | null;

/* ─── Main component ─────────────────────────────────────────────────────────── */
export default function Toolbar({
  tool, setTool, color, setColor, brushWidth, setBrushWidth,
  onClear, onUndo, onRedo, canUndo, canRedo,
  collapsed = false, onToggleCollapse,
}: ToolbarProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close panel on outside click or Escape
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPanel(null); };
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (railRef.current && !railRef.current.contains(e.target as Node)) setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown as EventListener);
    };
  }, [panel]);

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 2500);
      return;
    }
    setConfirmClear(false);
    onClear();
  };

  const pickColor = (s: string, close = false) => {
    setColor(s);
    if (tool === "eraser") setTool("pen");
    if (close) setPanel(null);
  };

  if (!mounted) return null;

  const isEraser = tool === "eraser";
  const activeBrush = BRUSHES.find(b => b.id === tool) ?? BRUSHES[0];

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP — fixed vertical rail (sm+)
          Starts 56px from top (below fixed navbar), never overlaps it
          ═══════════════════════════════════════════════════════════════ */}
      <div
        ref={railRef}
        className="pointer-events-auto fixed left-3 z-40 hidden sm:block"
        style={{ top: "calc(56px + 12px)", bottom: "12px" }}
      >
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            title="Show toolbar"
            aria-label="Show toolbar"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-ink-soft shadow-md transition hover:text-[var(--accent)]"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <ChevronRightIcon />
          </button>
        ) : (
          <>
            {/* Rail */}
            <div
              className="flex w-12 flex-col items-center gap-0.5 overflow-y-auto overflow-x-visible no-scrollbar rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-2"
              style={{ boxShadow: "var(--shadow-md)", maxHeight: "100%" }}
            >
              {/* Collapse */}
              <button
                onClick={onToggleCollapse}
                title="Collapse toolbar"
                aria-label="Collapse toolbar"
                className="flex h-8 w-9 items-center justify-center rounded-lg text-ink-faint transition hover:text-ink"
              >
                <ChevronLeftIcon />
              </button>

              <Divider />

              {/* ── Brush picker button ── */}
              <RailBtn
                label={isEraser ? "Eraser" : activeBrush.label}
                hint={isEraser ? "Key E" : `Key ${activeBrush.key}`}
                active={panel === "brush"}
                onClick={() => setPanel(panel === "brush" ? null : "brush")}
              >
                <span style={{ color: isEraser ? "var(--ink-soft)" : color }}>
                  {isEraser ? <EraserIcon /> : activeBrush.icon}
                </span>
              </RailBtn>

              <Divider />

              {/* ── Color ── */}
              <button
                onClick={() => setPanel(panel === "color" ? null : "color")}
                aria-label={`Color: ${isEraser ? "eraser active" : color}`}
                aria-pressed={panel === "color"}
                title="Color"
                className={`group relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition ${panel === "color" ? "ring-2 ring-[var(--accent)] bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-2)]"}`}
              >
                <span
                  className="h-5 w-5 rounded-full border-[2px] border-white"
                  style={{
                    backgroundColor: isEraser ? "transparent" : color,
                    boxShadow: "0 0 0 1.5px var(--line-strong), var(--shadow-sm)",
                  }}
                />
                <Tip label="Color" />
              </button>

              {/* ── Size ── */}
              <button
                onClick={() => setPanel(panel === "size" ? null : "size")}
                aria-label={`Brush size: ${brushWidth}px`}
                aria-pressed={panel === "size"}
                title="Size"
                className={`group relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition ${panel === "size" ? "ring-2 ring-[var(--accent)] bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-2)]"}`}
              >
                <span
                  className="rounded-full bg-ink"
                  style={{ width: Math.max(4, Math.min(brushWidth * 0.45, 18)), height: Math.max(4, Math.min(brushWidth * 0.45, 18)) }}
                />
                <span className="font-mono text-[8px] leading-none text-ink-faint">{brushWidth}</span>
                <Tip label="Size" />
              </button>

              <Divider />

              {/* ── History ── */}
              <RailBtn label="Undo" hint="Ctrl+Z" onClick={onUndo} disabled={!canUndo}><UndoIcon /></RailBtn>
              <RailBtn label="Redo" hint="Ctrl+Y" onClick={onRedo} disabled={!canRedo}><RedoIcon /></RailBtn>

              <Divider />

              {/* ── Eraser ── */}
              <RailBtn label="Eraser" hint="Key E" active={isEraser} onClick={() => { setTool("eraser"); setPanel(null); }}>
                <EraserIcon />
              </RailBtn>

              <Divider />

              {/* ── Clear ── */}
              <button
                onClick={handleClear}
                title={confirmClear ? "Tap again to confirm" : "Clear board"}
                aria-label="Clear board"
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  confirmClear
                    ? "bg-[var(--danger)]/10 text-[var(--danger)] ring-2 ring-[var(--danger)]"
                    : "text-ink-faint hover:bg-[var(--danger)]/8 hover:text-[var(--danger)]"
                }`}
              >
                {confirmClear ? <span className="text-[9px] font-bold">Sure?</span> : <TrashIcon />}
              </button>
            </div>

            {/* ── Brush picker popover (option A) ── */}
            {panel === "brush" && (
              <Popover>
                <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-ink-faint">Brush</p>
                <div className="flex flex-col gap-0.5">
                  {BRUSHES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { setTool(b.id); setPanel(null); }}
                      aria-label={`${b.label} brush`}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                        tool === b.id
                          ? "bg-[var(--accent)] text-white"
                          : "hover:bg-[var(--surface-2)] text-ink"
                      }`}
                    >
                      {/* Stroke preview */}
                      <svg width="48" height="28" viewBox="0 0 48 28" className="shrink-0">
                        <g style={{ color: tool === b.id ? "white" : color }}>{b.preview}</g>
                      </svg>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-semibold leading-tight">{b.label}</span>
                          <span className={`font-mono text-[9px] ${tool === b.id ? "opacity-70" : "text-ink-faint"}`}>{b.key}</span>
                        </div>
                        <span className={`block text-[11px] leading-tight ${tool === b.id ? "opacity-70" : "text-ink-soft"}`}>{b.description}</span>
                      </div>
                      {tool === b.id && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  ))}
                  {/* Eraser at bottom of brush list */}
                  <button
                    onClick={() => { setTool("eraser"); setPanel(null); }}
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                      isEraser ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--surface-2)] text-ink"
                    }`}
                  >
                    <svg width="48" height="28" viewBox="0 0 48 28" className="shrink-0">
                      <rect x="8" y="10" width="32" height="10" rx="2" fill="currentColor" opacity="0.3" />
                      <path d="M8,14 L40,14" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                    </svg>
                    <div>
                      <div className="text-[13px] font-semibold">Eraser</div>
                      <div className={`text-[11px] ${isEraser ? "opacity-70" : "text-ink-soft"}`}>Remove strokes</div>
                    </div>
                    {isEraser && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>}
                  </button>
                </div>
              </Popover>
            )}

            {/* ── Color popover ── */}
            {panel === "color" && (
              <Popover>
                <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-ink-faint">Color</p>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {SWATCHES.map((s) => (
                    <button
                      key={s}
                      title={s}
                      onClick={() => pickColor(s, true)}
                      style={{ backgroundColor: s }}
                      className={`h-8 w-8 rounded-full border-2 transition hover:scale-110 active:scale-95 ${
                        color === s && !isEraser
                          ? "border-[var(--accent)] scale-110"
                          : "border-transparent"
                      }`}
                    />
                  ))}
                </div>
                <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] text-[11px] font-medium text-ink-soft transition hover:border-[var(--accent)] hover:text-[var(--accent)] relative">
                  <PipetteIcon />Custom
                  <input type="color" value={color} onChange={e => pickColor(e.target.value)} className="absolute inset-0 h-0 w-0 opacity-0" />
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-2 py-1.5">
                  <span className="h-4 w-4 rounded-full border border-[var(--line-strong)]" style={{ backgroundColor: color }} />
                  <span className="font-mono text-[10px] uppercase text-ink-soft">{color}</span>
                </div>
              </Popover>
            )}

            {/* ── Size popover ── */}
            {panel === "size" && (
              <Popover>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Size</p>
                  <span className="font-mono text-[13px] font-semibold text-ink">{brushWidth}px</span>
                </div>
                <input
                  type="range" min={1} max={60} value={brushWidth}
                  aria-label="Brush size"
                  onChange={e => setBrushWidth(Number(e.target.value))}
                  className="mb-3 w-full accent-[var(--accent)]"
                />
                <div className="flex gap-1.5">
                  {SIZE_PRESETS.map(s => (
                    <button
                      key={s}
                      onClick={() => setBrushWidth(s)}
                      aria-label={`${s}px`}
                      className={`flex flex-1 flex-col items-center justify-center rounded-xl border py-2 gap-1 transition ${
                        brushWidth === s ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] hover:border-[var(--accent)]"
                      }`}
                    >
                      <span className="rounded-full bg-ink" style={{ width: Math.min(s * 0.45 + 3, 18), height: Math.min(s * 0.45 + 3, 18) }} />
                      <span className="font-mono text-[8px] text-ink-faint">{s}</span>
                    </button>
                  ))}
                </div>
              </Popover>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE — fixed bottom dock (two rows)
          Safe-area padded, never cut off, all 44px+ touch targets
          ═══════════════════════════════════════════════════════════════ */}
      <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 sm:hidden">

        {/* Brush picker sheet */}
        {panel === "brush" && (
          <div className="mx-3 mb-2 animate-slide-up rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3" style={{ boxShadow: "var(--shadow-lg)" }}>
            <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-ink-faint">Choose brush</p>
            <div className="grid grid-cols-3 gap-1.5">
              {BRUSHES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setTool(b.id); setPanel(null); }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-1.5 transition active:scale-95 ${
                    tool === b.id ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-ink"
                  }`}
                >
                  <svg width="44" height="22" viewBox="0 0 48 28">
                    <g style={{ color: tool === b.id ? "white" : color }}>{b.preview}</g>
                  </svg>
                  <span className="text-[11px] font-semibold leading-tight">{b.label}</span>
                </button>
              ))}
              <button
                onClick={() => { setTool("eraser"); setPanel(null); }}
                className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-1.5 transition active:scale-95 ${
                  isEraser ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-ink"
                }`}
              >
                <span className="flex h-[22px] items-center"><EraserIcon /></span>
                <span className="text-[11px] font-semibold">Eraser</span>
              </button>
            </div>
          </div>
        )}

        {/* Color sheet */}
        {panel === "color" && (
          <div className="mx-3 mb-2 animate-slide-up rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Color</p>
              <div className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full border border-[var(--line-strong)]" style={{ backgroundColor: color }} />
                <span className="font-mono text-[10px] text-ink-soft">{color}</span>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {SWATCHES.map(s => (
                <button
                  key={s}
                  onClick={() => pickColor(s, true)}
                  style={{ backgroundColor: s }}
                  className={`h-11 w-full rounded-xl border-2 transition active:scale-90 ${
                    color === s && !isEraser ? "border-[var(--accent)]" : "border-transparent"
                  }`}
                />
              ))}
              <label className="relative flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] text-ink-faint">
                <PipetteIcon />
                <input type="color" value={color} onChange={e => pickColor(e.target.value)} className="absolute inset-0 h-0 w-0 opacity-0" />
              </label>
            </div>
          </div>
        )}

        {/* Size sheet */}
        {panel === "size" && (
          <div className="mx-3 mb-2 animate-slide-up rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Brush size</p>
              <span className="font-mono text-[14px] font-semibold text-ink">{brushWidth}px</span>
            </div>
            <input type="range" min={1} max={60} value={brushWidth} aria-label="Brush size" onChange={e => setBrushWidth(Number(e.target.value))} className="mb-3 w-full accent-[var(--accent)]" />
            <div className="flex gap-2">
              {SIZE_PRESETS.map(s => (
                <button
                  key={s}
                  onClick={() => setBrushWidth(s)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 transition active:scale-95 ${
                    brushWidth === s ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)]"
                  }`}
                >
                  <span className="rounded-full bg-ink" style={{ width: Math.min(s * 0.4 + 3, 20), height: Math.min(s * 0.4 + 3, 20) }} />
                  <span className="font-mono text-[9px] text-ink-faint">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Row 1: Brush | Color | Size | Eraser ── */}
        <div className="mx-3 mb-1.5 flex items-center gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5" style={{ boxShadow: "var(--shadow-sm)" }}>

          {/* Brush button — shows active brush name + color dot */}
          <button
            onClick={() => setPanel(panel === "brush" ? null : "brush")}
            aria-label={`Brush: ${isEraser ? "Eraser" : activeBrush.label}. Tap to change.`}
            aria-pressed={panel === "brush"}
            className={`flex flex-1 items-center gap-2 rounded-xl px-3 py-2 transition active:scale-95 ${panel === "brush" ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-2)]"}`}
          >
            <span style={{ color: isEraser ? "var(--ink-soft)" : color }}>
              {isEraser ? <EraserIcon /> : activeBrush.icon}
            </span>
            <span className="text-[12px] font-semibold text-ink">{isEraser ? "Eraser" : activeBrush.label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto text-ink-faint"><path d="M6 9l6 6 6-6" /></svg>
          </button>

          <Vsep />

          {/* Color */}
          <MobileBtn
            label="Color"
            active={panel === "color"}
            onClick={() => setPanel(panel === "color" ? null : "color")}
          >
            <span className="h-6 w-6 rounded-full border-2 border-white" style={{ backgroundColor: isEraser ? "transparent" : color, boxShadow: "0 0 0 1.5px var(--line-strong)" }} />
          </MobileBtn>

          {/* Size */}
          <MobileBtn
            label={`${brushWidth}px`}
            active={panel === "size"}
            onClick={() => setPanel(panel === "size" ? null : "size")}
          >
            <span className="rounded-full bg-ink" style={{ width: Math.max(6, Math.min(brushWidth * 0.38, 18)), height: Math.max(6, Math.min(brushWidth * 0.38, 18)) }} />
          </MobileBtn>
        </div>

        {/* ── Row 2: Undo | Redo | Clear ── */}
        <div
          className="mx-3 mb-3 flex items-center gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5"
          style={{ boxShadow: "var(--shadow-sm)", paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <MobileBtn label="Undo" disabled={!canUndo} onClick={onUndo}><UndoIcon /></MobileBtn>
          <MobileBtn label="Redo" disabled={!canRedo} onClick={onRedo}><RedoIcon /></MobileBtn>
          <div className="flex-1" />
          <button
            onClick={handleClear}
            aria-label="Clear board"
            className={`flex h-11 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-4 transition active:scale-95 ${
              confirmClear ? "bg-[var(--danger)]/10 text-[var(--danger)] ring-2 ring-[var(--danger)]" : "text-ink-soft"
            }`}
          >
            {confirmClear ? <span className="text-[10px] font-bold">Sure?</span> : <><TrashIcon /><span className="font-mono text-[8px] text-ink-faint">clear</span></>}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

function RailBtn({
  children, label, hint, active = false, disabled = false, onClick,
}: {
  children: React.ReactNode; label: string; hint?: string;
  active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
        disabled ? "cursor-not-allowed opacity-30 text-ink-faint"
        : active ? "bg-[var(--accent)] text-white shadow-sm"
        : "text-ink-soft hover:bg-[var(--surface-2)] hover:text-ink"
      }`}
    >
      {children}
      {active && !disabled && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--surface)]" />}
      <Tip label={label} hint={hint} />
    </button>
  );
}

function MobileBtn({
  children, label, active = false, disabled = false, onClick,
}: {
  children: React.ReactNode; label: string;
  active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-11 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 transition active:scale-90 ${
        disabled ? "cursor-not-allowed opacity-30 text-ink-faint"
        : active ? "bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]"
        : "text-ink-soft"
      }`}
    >
      {children}
      <span className="font-mono text-[8px] leading-none text-ink-faint">{label}</span>
    </button>
  );
}

function Popover({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="animate-pop-in absolute left-[calc(100%+10px)] top-0 w-56 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      {children}
    </div>
  );
}

function Tip({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium text-ink shadow-lg group-hover:block">
      {label}{hint && <span className="ml-2 font-mono text-[10px] text-ink-faint">{hint}</span>}
    </span>
  );
}

function Divider() { return <span className="my-1 h-px w-8 shrink-0 rounded-full bg-[var(--line)]" />; }
function Vsep() { return <span className="mx-1 h-7 w-px shrink-0 rounded-full bg-[var(--line)]" />; }

/* ─── Icons ─────────────────────────────────────────────────────────────────── */
const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

function PenIcon()         { return <Svg><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></Svg>; }
function PencilIcon()      { return <Svg><line x1="18" y1="2" x2="22" y2="6"/><path d="M7.5 20.5L19 9l-4-4L3.5 16.5 2 22z"/><line x1="15" y1="5" x2="19" y2="9"/></Svg>; }
function MarkerIcon()      { return <Svg><path d="M9 11l4 4L20 8a2 2 0 0 0-3-3L9 11z"/><path d="M9 11L5 15a2 2 0 0 0 0 3l1 1a2 2 0 0 0 3 0l4-4"/><line x1="5" y1="20" x2="3" y2="22"/></Svg>; }
function CalligraphyIcon() { return <Svg><path d="M3 17c3-3 6-6 8-8"/><path d="M11 9c2-2 4-3 6-3 0 2-1 4-3 6"/><path d="M5 21c1-2 4-7 6-9"/><circle cx="19" cy="5" r="2"/></Svg>; }
function CrayonIcon()      { return <Svg><path d="M6 20L17 9l-4-4L2 16l4 4z"/><path d="M17 9l3-3a1 1 0 0 0-3-3l-3 3"/><line x1="8" y1="18" x2="12" y2="14"/></Svg>; }
function OilIcon()         { return <Svg><path d="M3 22l9-9"/><path d="M6 6l2 2-4 4 4 4 4-4"/><path d="M17.5 3A3.5 3.5 0 0 1 21 6.5c0 2-2 4-4 6l-3-3c2-2 4-4 4-6 0-.83-.67-1.5-1.5-1.5"/></Svg>; }
function WatercolourIcon() { return <Svg><path d="M12 2a5 5 0 0 1 5 5c0 5-5 13-5 13S7 12 7 7a5 5 0 0 1 5-5z"/><circle cx="12" cy="7" r="2" fill="currentColor"/></Svg>; }
function SprayIcon()       { return <Svg><path d="M3 3h2v2H3z" fill="currentColor"/><path d="M7 3h2v2H7z" fill="currentColor"/><path d="M3 7h2v2H3z" fill="currentColor"/><path d="M11 7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1z"/><path d="M14 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor"/></Svg>; }
function EraserIcon()      { return <Svg><path d="M20 20H7L3.5 16.5a2 2 0 0 1 0-2.83l8.17-8.17a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83L13.5 20"/><path d="M7 20l-4-4"/></Svg>; }
function UndoIcon()        { return <Svg><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></Svg>; }
function RedoIcon()        { return <Svg><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></Svg>; }
function TrashIcon()       { return <Svg><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></Svg>; }
function PipetteIcon()     { return <Svg><path d="M2 22l4-4"/><path d="M14 4l6 6-9 9-6-6 9-9z"/><path d="M5 11l3 3"/></Svg>; }
function ChevronLeftIcon() { return <Svg><path d="M15 18l-6-6 6-6"/></Svg>; }
function ChevronRightIcon(){ return <Svg><path d="M9 18l6-6-6-6"/></Svg>; }
