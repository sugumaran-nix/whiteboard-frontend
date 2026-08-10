"use client";
import { useEffect, useRef, useState } from "react";
import type { Tool } from "@/lib/types";

const SWATCHES = [
  "#1F2421","#2454FF","#F2A93B","#E0473C",
  "#22A06B","#9B5DE5","#EC4899","#0EA5E9",
  "#ffffff","#FF6B35","#00B4D8","#06D6A0",
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type ToolDef = { id: Tool; label: string; key: string; icon: React.ReactNode };

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
  collapsed = false, onToggleCollapse,
}: ToolbarProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [mounted, setMounted]           = useState(false);
  const [panel, setPanel]               = useState<Panel>(null);
  const railRef                         = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

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
  const isEraser = tool === "eraser";

  return (
    <>
      {/* DESKTOP - floating vertical rail */}
      <div
        ref={railRef}
        className="pointer-events-auto absolute left-4 top-1/2 z-40 hidden -translate-y-1/2 sm:block"
      >
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            title="Show toolbar"
            aria-label="Show toolbar"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line glass text-ink-soft shadow-lg transition hover:text-accent"
          >
            <ChevronRightIcon />
          </button>
        ) : (
          <>
            <div className="flex max-h-[calc(100dvh-2rem)] w-14 flex-col items-center gap-0.5 overflow-y-auto no-scrollbar rounded-2xl border border-line glass py-2 shadow-lg">

              <button
                onClick={onToggleCollapse}
                title="Collapse toolbar"
                aria-label="Collapse toolbar"
                className="flex h-8 w-10 items-center justify-center rounded-lg text-ink-faint transition hover:bg-accent-soft hover:text-accent"
              >
                <ChevronLeftIcon />
              </button>

              <SectionLabel>History</SectionLabel>
              <RailBtn label="Undo" hint="Ctrl+Z" onClick={onUndo} disabled={!canUndo}><UndoIcon /></RailBtn>
              <RailBtn label="Redo" hint="Ctrl+Y" onClick={onRedo} disabled={!canRedo}><RedoIcon /></RailBtn>

              <Rule />

              <SectionLabel>Tools</SectionLabel>
              {DRAW_TOOLS.map((t) => (
                <RailBtn key={t.id} label={t.label} hint={`Key ${t.key}`} active={tool === t.id} onClick={() => setTool(t.id)}>
                  {t.icon}
                </RailBtn>
              ))}
              <RailBtn label="Eraser" hint="Key E" active={isEraser} onClick={() => setTool("eraser")}>
                <EraserIcon />
              </RailBtn>

              <Rule />

              <SectionLabel>Style</SectionLabel>

              <button
                onClick={() => setPanel(panel === "color" ? null : "color")}
                aria-label={`Color: ${isEraser ? "erasing" : color}`}
                aria-pressed={panel === "color"}
                className={`group relative flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-xl transition ${
                  panel === "color"
                    ? "bg-accent/10 ring-2 ring-accent"
                    : "hover:bg-accent-soft"
                }`}
              >
                <span
                  className="h-5 w-5 rounded-full border-2 border-white shadow"
                  style={{
                    backgroundColor: isEraser ? "transparent" : color,
                    outline: "1.5px solid var(--line-strong)",
                  }}
                />
                <Tooltip label="Color" hint="choose" />
              </button>

              <button
                onClick={() => setPanel(panel === "size" ? null : "size")}
                aria-label={`Brush size: ${brushWidth}px`}
                aria-pressed={panel === "size"}
                className={`group relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition ${
                  panel === "size"
                    ? "bg-accent/10 ring-2 ring-accent"
                    : "hover:bg-accent-soft"
                }`}
              >
                <span
                  className="rounded-full bg-ink"
                  style={{
                    width: Math.max(4, Math.min(brushWidth * 0.45, 20)),
                    height: Math.max(4, Math.min(brushWidth * 0.45, 20)),
                  }}
                />
                <span className="font-mono text-[8px] text-ink-faint leading-none">{brushWidth}px</span>
                <Tooltip label="Size" hint={`[ ]  ${brushWidth}px`} />
              </button>

              <Rule />

              <SectionLabel>Board</SectionLabel>
              <button
                onClick={handleClear}
                title={confirmClear ? "Tap again to confirm clear" : "Clear board"}
                aria-label="Clear board"
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  confirmClear
                    ? "bg-danger/12 text-danger ring-2 ring-danger"
                    : "text-ink-soft hover:bg-danger/10 hover:text-danger"
                }`}
              >
                {confirmClear
                  ? <span className="text-[9px] font-bold leading-tight text-center">Sure?</span>
                  : <TrashIcon />
                }
              </button>
            </div>

            {panel === "color" && (
              <Popover title="Color">
                <div className="grid grid-cols-4 gap-2">
                  {SWATCHES.map((s) => (
                    <button
                      key={s}
                      title={s}
                      onClick={() => pickColor(s, true)}
                      style={{ backgroundColor: s }}
                      className={`h-8 w-8 rounded-full border border-line-strong transition hover:scale-110 active:scale-95 ${
                        color === s && !isEraser ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
                      }`}
                    />
                  ))}
                </div>
                <label className="mt-3 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line text-[11px] font-medium text-ink-soft transition hover:border-accent hover:text-accent">
                  <PipetteIcon />
                  Custom color
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => pickColor(e.target.value)}
                    className="absolute h-0 w-0 opacity-0"
                  />
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1.5">
                  <span className="h-4 w-4 rounded-full border border-line-strong" style={{ backgroundColor: color }} />
                  <span className="font-mono text-[10px] text-ink-soft uppercase">{color}</span>
                </div>
              </Popover>
            )}

            {panel === "size" && (
              <Popover title={`Brush size · ${brushWidth}px`}>
                <div className="flex items-center gap-2 mb-3">
                  {SIZE_PRESETS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setBrushWidth(s)}
                      title={`${s}px`}
                      aria-label={`${s}px brush`}
                      className={`flex h-9 flex-1 items-center justify-center rounded-xl border transition hover:border-accent ${
                        brushWidth === s ? "border-accent bg-accent-soft" : "border-line"
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
                  className="w-full cursor-pointer accent-accent"
                />
                <div className="mt-2 flex items-center justify-between text-[10px] text-ink-faint font-mono">
                  <span>1px</span>
                  <span className="font-semibold text-ink">{brushWidth}px</span>
                  <span>60px</span>
                </div>
              </Popover>
            )}
          </>
        )}
      </div>

      {/* MOBILE - bottom dock */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 sm:hidden">

        {panel === "color" && (
          <div className="mx-3 mb-2 rounded-2xl border border-line glass p-3 shadow-xl animate-pop-in">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Color</p>
              <div className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full border border-line-strong shadow-sm" style={{ backgroundColor: color }} />
                <span className="font-mono text-[10px] text-ink-soft">{color}</span>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {SWATCHES.map((s) => (
                <button
                  key={s}
                  onClick={() => pickColor(s, true)}
                  style={{ backgroundColor: s }}
                  aria-label={`Color ${s}`}
                  className={`h-10 w-full rounded-xl border border-line-strong transition active:scale-90 ${
                    color === s && !isEraser ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""
                  }`}
                />
              ))}
              <label className="relative flex h-10 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-line text-ink-faint active:scale-90">
                <PipetteIcon />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => pickColor(e.target.value)}
                  className="absolute h-0 w-0 opacity-0"
                />
              </label>
            </div>
          </div>
        )}

        {panel === "size" && (
          <div className="mx-3 mb-2 rounded-2xl border border-line glass px-4 py-3 shadow-xl animate-pop-in">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Brush size</p>
              <div className="flex items-center gap-1.5">
                <span
                  className="rounded-full"
                  style={{
                    width: Math.max(8, Math.min(brushWidth * 0.5, 24)),
                    height: Math.max(8, Math.min(brushWidth * 0.5, 24)),
                    backgroundColor: isEraser ? "var(--ink-faint)" : color,
                  }}
                />
                <span className="font-mono text-sm font-semibold text-ink">{brushWidth}px</span>
              </div>
            </div>
            <input
              type="range" min={1} max={60} value={brushWidth}
              aria-label="Brush size"
              onChange={(e) => setBrushWidth(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="mt-3 flex items-center gap-2">
              {SIZE_PRESETS.map((s) => (
                <button
                  key={s}
                  onClick={() => setBrushWidth(s)}
                  aria-label={`${s}px`}
                  className={`flex h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border transition active:scale-95 ${
                    brushWidth === s ? "border-accent bg-accent-soft" : "border-line"
                  }`}
                >
                  <span
                    className="rounded-full bg-ink"
                    style={{ width: Math.min(s * 0.5 + 3, 22), height: Math.min(s * 0.5 + 3, 22) }}
                  />
                  <span className="font-mono text-[8px] text-ink-faint">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Row 1: Tool selector */}
        <div className="mx-3 mb-1.5 flex items-center gap-0.5 overflow-x-auto no-scrollbar rounded-2xl border border-line glass px-1.5 py-1.5 shadow-md">
          {DRAW_TOOLS.map((t) => (
            <MobileDockBtn
              key={t.id}
              label={t.label}
              active={tool === t.id}
              onClick={() => { setTool(t.id); setPanel(null); }}
            >
              {t.icon}
            </MobileDockBtn>
          ))}
          <MobileSep />
          <MobileDockBtn label="Eraser" active={isEraser} onClick={() => { setTool("eraser"); setPanel(null); }}>
            <EraserIcon />
          </MobileDockBtn>
        </div>

        {/* Row 2: Actions + color + size */}
        <div
          className="mx-3 mb-3 flex items-center gap-0.5 rounded-2xl border border-line glass px-1.5 py-1.5 shadow-md"
          style={{ paddingBottom: `calc(0.375rem + env(safe-area-inset-bottom))` }}
        >
          <div className="flex flex-1 items-center gap-2 px-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: isEraser ? "var(--ink-faint)" : color }}
            >
              {isEraser ? <EraserIcon /> : activeTool?.icon}
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-ink leading-tight">
                {isEraser ? "Eraser" : activeTool?.label}
              </span>
              <span className="font-mono text-[9px] text-ink-faint leading-tight">{brushWidth}px</span>
            </div>
          </div>

          <MobileSep />

          <MobileDockBtn label="Undo" onClick={onUndo} disabled={!canUndo}><UndoIcon /></MobileDockBtn>
          <MobileDockBtn label="Redo" onClick={onRedo} disabled={!canRedo}><RedoIcon /></MobileDockBtn>

          <MobileSep />

          <button
            onClick={() => setPanel(panel === "color" ? null : "color")}
            aria-label={`Color picker - current: ${color}`}
            aria-pressed={panel === "color"}
            className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-95 ${
              panel === "color" ? "bg-accent/10 ring-2 ring-accent" : ""
            }`}
          >
            <span
              className="h-6 w-6 rounded-full border-2 border-white shadow"
              style={{
                backgroundColor: isEraser ? "transparent" : color,
                outline: "1.5px solid var(--line-strong)",
              }}
            />
            <span className="font-mono text-[8px] text-ink-faint leading-none">color</span>
          </button>

          <button
            onClick={() => setPanel(panel === "size" ? null : "size")}
            aria-label={`Brush size: ${brushWidth}px`}
            aria-pressed={panel === "size"}
            className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-95 ${
              panel === "size" ? "bg-accent/10 ring-2 ring-accent" : ""
            }`}
          >
            <span
              className="rounded-full bg-ink"
              style={{
                width: Math.max(6, Math.min(brushWidth * 0.4, 20)),
                height: Math.max(6, Math.min(brushWidth * 0.4, 20)),
              }}
            />
            <span className="font-mono text-[8px] text-ink-faint leading-none">size</span>
          </button>

          <MobileSep />

          <button
            onClick={handleClear}
            aria-label="Clear board"
            className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-95 ${
              confirmClear ? "bg-danger/12 text-danger ring-2 ring-danger" : "text-ink-soft"
            }`}
          >
            {confirmClear
              ? <span className="text-[9px] font-bold leading-tight">Sure?</span>
              : <TrashIcon />
            }
            {!confirmClear && <span className="font-mono text-[8px] text-ink-faint leading-none">clear</span>}
          </button>
        </div>
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1 font-mono text-[8px] uppercase tracking-widest text-ink-faint px-1 leading-none">
      {children}
    </span>
  );
}

function Tooltip({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+14px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-ink shadow-lg group-hover:block">
      {label}
      {hint && <span className="ml-2 font-mono text-[10px] text-ink-faint">{hint}</span>}
    </span>
  );
}

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
        disabled
          ? "cursor-not-allowed text-ink-faint opacity-35"
          : active
            ? "bg-accent text-white shadow-sm ring-2 ring-accent/40"
            : "text-ink-soft hover:bg-accent-soft hover:text-accent"
      }`}
    >
      {children}
      {active && (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
      )}
      <Tooltip label={label} hint={hint} />
    </button>
  );
}

function MobileDockBtn({
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
      className={`relative flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl transition active:scale-90 ${
        disabled
          ? "cursor-not-allowed text-ink-faint opacity-35"
          : active
            ? "bg-accent text-white shadow-sm"
            : "text-ink-soft"
      }`}
    >
      {children}
      {active && (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
      )}
    </button>
  );
}

function Popover({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="absolute left-[calc(100%+12px)] top-1/2 w-52 -translate-y-1/2 animate-pop-in rounded-2xl border border-line bg-surface p-3 shadow-xl">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-ink-faint">{title}</p>
      <div className="relative">{children}</div>
    </div>
  );
}

function Rule() {
  return <span className="my-1 h-px w-8 bg-line rounded-full" />;
}

function MobileSep() {
  return <span className="mx-0.5 h-7 w-px shrink-0 bg-line rounded-full" />;
}

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
function ChevronLeftIcon() { return <I><path d="M15 18l-6-6 6-6"/></I>; }
function ChevronRightIcon(){ return <I><path d="M9 18l6-6-6-6"/></I>; }
