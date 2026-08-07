"use client";
import { useEffect, useRef, useState } from "react";
import type { Tool } from "@/lib/types";

const SWATCHES = [
  "#1F2421","#2454FF","#F2A93B","#E0473C",
  "#22A06B","#9B5DE5","#EC4899","#0EA5E9","#ffffff",
];

const SIZE_PRESETS = [2, 6, 14, 28, 48];

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

type ToolDef = { id: Tool; label: string; key: string; icon: JSX.Element };

const DRAW_TOOLS: ToolDef[] = [
  { id: "pen",         label: "Pen",         key: "1", icon: <PenIcon /> },
  { id: "pencil",      label: "Pencil",      key: "2", icon: <PencilIcon /> },
  { id: "marker",      label: "Marker",      key: "3", icon: <MarkerIcon /> },
  { id: "calligraphy", label: "Calligraphy", key: "4", icon: <CalligraphyIcon /> },
  { id: "crayon",      label: "Crayon",      key: "5", icon: <CrayonIcon /> },
  { id: "oil",         label: "Oil brush",   key: "6", icon: <OilIcon /> },
  { id: "watercolour", label: "Watercolour", key: "7", icon: <WatercolourIcon /> },
  { id: "spray",       label: "Spray",       key: "8", icon: <SprayIcon /> },
];

type Panel = "color" | "size" | null;

export default function Toolbar({
  tool, setTool, color, setColor, brushWidth, setBrushWidth,
  onClear, onUndo, onRedo, canUndo, canRedo,
}: ToolbarProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [mounted, setMounted]           = useState(false);
  const [panel, setPanel]               = useState<Panel>(null);
  const railRef                         = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Dismiss the open popover on Escape or an outside click.
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPanel(null); };
    const onDown = (e: MouseEvent) => {
      if (railRef.current && !railRef.current.contains(e.target as Node)) setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
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

  const activeTool = DRAW_TOOLS.find((t) => t.id === tool);

  return (
    <>
      {/* ══════════════════════════════════════════════
          DESKTOP — floating vertical rail (sm and up)
          ══════════════════════════════════════════════ */}
      <div
        ref={railRef}
        className="pointer-events-auto absolute left-4 top-1/2 z-40 hidden -translate-y-1/2 sm:block"
      >
        <div className="flex w-[52px] flex-col items-center gap-1 rounded-panel border border-line glass p-1.5 shadow-lg">
          <RailBtn label="Undo" hint="Ctrl+Z" onClick={onUndo} disabled={!canUndo}><UndoIcon /></RailBtn>
          <RailBtn label="Redo" hint="Ctrl+Y" onClick={onRedo} disabled={!canRedo}><RedoIcon /></RailBtn>

          <Rule />

          {DRAW_TOOLS.map((t) => (
            <RailBtn key={t.id} label={t.label} hint={t.key} active={tool === t.id} onClick={() => setTool(t.id)}>
              {t.icon}
            </RailBtn>
          ))}
          <RailBtn label="Eraser" hint="E" active={tool === "eraser"} onClick={() => setTool("eraser")}>
            <EraserIcon />
          </RailBtn>

          <Rule />

          {/* Colour */}
          <RailBtn
            label="Colour"
            hint={tool === "eraser" ? "erasing" : color}
            active={panel === "color"}
            onClick={() => setPanel(panel === "color" ? null : "color")}
          >
            <span
              className="h-4 w-4 rounded-full border border-line-strong shadow-sm"
              style={{ backgroundColor: tool === "eraser" ? "transparent" : color }}
            />
          </RailBtn>

          {/* Size */}
          <RailBtn
            label="Brush size"
            hint={`${brushWidth}px · [ ]`}
            active={panel === "size"}
            onClick={() => setPanel(panel === "size" ? null : "size")}
          >
            <span
              className="rounded-full bg-current"
              style={{
                width: Math.max(4, Math.min(brushWidth * 0.4, 18)),
                height: Math.max(4, Math.min(brushWidth * 0.4, 18)),
              }}
            />
          </RailBtn>

          <Rule />

          <button
            onClick={handleClear}
            title={confirmClear ? "Click again to confirm" : "Clear board"}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
              confirmClear
                ? "bg-danger/12 text-danger ring-1 ring-danger"
                : "text-ink-soft hover:bg-danger/10 hover:text-danger"
            }`}
          >
            {confirmClear ? <span className="text-[10px] font-semibold">Sure?</span> : <TrashIcon />}
          </button>
        </div>

        {/* Popovers anchored to the rail */}
        {panel === "color" && (
          <Popover title="Colour">
            <div className="grid grid-cols-3 gap-2">
              {SWATCHES.map((s) => (
                <button
                  key={s}
                  title={s}
                  onClick={() => pickColor(s, true)}
                  style={{ backgroundColor: s }}
                  className={`h-7 w-7 rounded-full border border-line-strong transition hover:scale-110 ${
                    color === s && tool !== "eraser" ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
                  }`}
                />
              ))}
            </div>
            <label className="mt-3 flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-line text-[11px] text-ink-soft transition hover:border-accent hover:text-accent">
              <PipetteIcon />
              Custom
              <input
                type="color"
                value={color}
                onChange={(e) => pickColor(e.target.value)}
                className="absolute h-0 w-0 opacity-0"
              />
            </label>
          </Popover>
        )}

        {panel === "size" && (
          <Popover title={`Size · ${brushWidth}px`}>
            <div className="flex items-center gap-2">
              {SIZE_PRESETS.map((s) => (
                <button
                  key={s}
                  onClick={() => setBrushWidth(s)}
                  title={`${s}px`}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                    brushWidth === s ? "border-accent bg-accent-soft" : "border-line hover:border-accent"
                  }`}
                >
                  <span
                    className="rounded-full bg-ink"
                    style={{ width: Math.min(s * 0.5 + 3, 20), height: Math.min(s * 0.5 + 3, 20) }}
                  />
                </button>
              ))}
            </div>
            <input
              type="range" min={1} max={60} value={brushWidth}
              aria-label="Brush size"
              onChange={(e) => setBrushWidth(Number(e.target.value))}
              className="mt-3 w-full cursor-pointer accent-accent"
            />
          </Popover>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          MOBILE — floating bottom dock (below sm)
          ══════════════════════════════════════════════ */}
      <div className="pointer-events-auto absolute inset-x-2 bottom-2 z-40 sm:hidden safe-bottom">
        {panel === "color" && (
          <div className="mb-2 flex items-center gap-2.5 overflow-x-auto no-scrollbar rounded-panel border border-line glass px-3 py-2.5 shadow-lg animate-pop-in">
            {SWATCHES.map((s) => (
              <button
                key={s}
                title={s}
                onClick={() => pickColor(s, true)}
                style={{ backgroundColor: s }}
                className={`h-9 w-9 flex-shrink-0 rounded-full border border-line-strong transition active:scale-95 ${
                  color === s && tool !== "eraser" ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
                }`}
              />
            ))}
            <label className="relative flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-line text-ink-soft">
              <PipetteIcon />
              <input type="color" value={color} onChange={(e) => pickColor(e.target.value)} className="absolute h-0 w-0 opacity-0" />
            </label>
          </div>
        )}

        {panel === "size" && (
          <div className="mb-2 flex items-center gap-3 rounded-panel border border-line glass px-4 py-3 shadow-lg animate-pop-in">
            <span className="w-10 flex-shrink-0 text-right font-mono text-xs text-ink-soft">{brushWidth}px</span>
            <input
              type="range" min={1} max={60} value={brushWidth}
              aria-label="Brush size"
              onChange={(e) => setBrushWidth(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span
              className="flex-shrink-0 rounded-full border border-line-strong"
              style={{
                width: Math.max(8, Math.min(brushWidth * 0.6, 30)),
                height: Math.max(8, Math.min(brushWidth * 0.6, 30)),
                backgroundColor: tool === "eraser" ? "transparent" : color,
              }}
            />
          </div>
        )}

        {/* Current tool readout keeps the compact dock self-explanatory */}
        <p className="mb-1.5 text-center font-mono text-[10px] text-ink-faint">
          {tool === "eraser" ? "Eraser" : activeTool?.label} · {brushWidth}px
        </p>

        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar rounded-panel border border-line glass px-2 py-1.5 shadow-lg">
          <DockBtn label="Undo" onClick={onUndo} disabled={!canUndo}><UndoIcon /></DockBtn>
          <DockBtn label="Redo" onClick={onRedo} disabled={!canRedo}><RedoIcon /></DockBtn>
          <Sep />
          {DRAW_TOOLS.map((t) => (
            <DockBtn key={t.id} label={t.label} active={tool === t.id} onClick={() => { setTool(t.id); setPanel(null); }}>
              {t.icon}
            </DockBtn>
          ))}
          <DockBtn label="Eraser" active={tool === "eraser"} onClick={() => { setTool("eraser"); setPanel(null); }}>
            <EraserIcon />
          </DockBtn>
          <Sep />
          <DockBtn label="Colour" active={panel === "color"} onClick={() => setPanel(panel === "color" ? null : "color")}>
            <span
              className="h-5 w-5 rounded-full border border-line-strong"
              style={{ backgroundColor: tool === "eraser" ? "transparent" : color }}
            />
          </DockBtn>
          <DockBtn label="Brush size" active={panel === "size"} onClick={() => setPanel(panel === "size" ? null : "size")}>
            <SizeIcon />
          </DockBtn>
          <Sep />
          <button
            onClick={handleClear}
            aria-label="Clear board"
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition ${
              confirmClear ? "bg-danger/12 text-danger ring-1 ring-danger" : "text-ink-soft"
            }`}
          >
            {confirmClear ? <span className="text-[10px] font-semibold">Sure?</span> : <TrashIcon />}
          </button>
        </div>

      </div>
    </>
  );
}

// ── Building blocks ───────────────────────────────────────────────────────────
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
      className={`group relative flex h-9 w-9 items-center justify-center rounded-xl transition ${
        disabled
          ? "cursor-not-allowed text-ink-faint opacity-40"
          : active
            ? "bg-accent text-accent-ink shadow-sm"
            : "text-ink-soft hover:bg-accent-soft hover:text-accent"
      }`}
    >
      {children}
      <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink shadow-md group-hover:block">
        {label}
        {hint && <span className="ml-1.5 font-mono text-[10px] text-ink-faint">{hint}</span>}
      </span>
    </button>
  );
}

function DockBtn({
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
      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition active:scale-95 ${
        disabled
          ? "cursor-not-allowed text-ink-faint opacity-40"
          : active
            ? "bg-accent text-accent-ink shadow-sm"
            : "text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

function Popover({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="absolute left-[calc(100%+10px)] top-1/2 w-52 -translate-y-1/2 animate-pop-in rounded-panel border border-line bg-surface p-3 shadow-lg">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">{title}</p>
      <div className="relative">{children}</div>
    </div>
  );
}

function Rule() {
  return <span className="my-0.5 h-px w-6 bg-line" />;
}

function Sep() {
  return <span className="mx-1 h-6 w-px flex-shrink-0 bg-line" />;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const I = ({ children }: { children: React.ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

function PenIcon()         { return <I><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></I>; }
function PencilIcon()      { return <I><line x1="18" y1="2" x2="22" y2="6"/><path d="M7.5 20.5L19 9l-4-4L3.5 16.5 2 22z"/><line x1="15" y1="5" x2="19" y2="9"/></I>; }
function MarkerIcon()      { return <I><path d="M9 11l4 4L20 8a2 2 0 0 0-3-3L9 11z"/><path d="M9 11L5 15a2 2 0 0 0 0 3l1 1a2 2 0 0 0 3 0l4-4"/><line x1="5" y1="20" x2="3" y2="22"/></I>; }
function CalligraphyIcon() { return <I><path d="M3 17c3-3 6-6 8-8"/><path d="M11 9c2-2 4-3 6-3 0 2-1 4-3 6"/><path d="M5 21c1-2 4-7 6-9"/><circle cx="19" cy="5" r="2"/></I>; }
function CrayonIcon()      { return <I><path d="M6 20L17 9l-4-4L2 16l4 4z"/><path d="M17 9l3-3a1 1 0 0 0-3-3l-3 3"/><line x1="8" y1="18" x2="12" y2="14"/></I>; }
function OilIcon()         { return <I><path d="M3 22l9-9"/><path d="M6 6l2 2-4 4 4 4 4-4"/><path d="M17.5 3A3.5 3.5 0 0 1 21 6.5c0 2-2 4-4 6l-3-3c2-2 4-4 4-6 0-.83-.67-1.5-1.5-1.5"/></I>; }
function WatercolourIcon() { return <I><path d="M12 2a5 5 0 0 1 5 5c0 5-5 13-5 13S7 12 7 7a5 5 0 0 1 5-5z"/><circle cx="12" cy="7" r="2" fill="currentColor"/></I>; }
function SprayIcon()       { return <I><path d="M3 3h2v2H3z" fill="currentColor"/><path d="M7 3h2v2H7z" fill="currentColor"/><path d="M3 7h2v2H3z" fill="currentColor"/><path d="M11 7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V7z"/><path d="M14 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor"/></I>; }
function EraserIcon()      { return <I><path d="M20 20H7L3.5 16.5a2 2 0 0 1 0-2.83l8.17-8.17a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83L13.5 20"/><path d="M7 20l-4-4"/></I>; }
function UndoIcon()        { return <I><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></I>; }
function RedoIcon()        { return <I><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></I>; }
function TrashIcon()       { return <I><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></I>; }
function PipetteIcon()     { return <I><path d="M2 22l4-4"/><path d="M14 4l6 6-9 9-6-6 9-9z"/><path d="M5 11l3 3"/></I>; }
function SizeIcon()        { return <I><circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="7" strokeDasharray="2 2"/></I>; }
