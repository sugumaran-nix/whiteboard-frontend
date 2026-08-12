"use client";
import { useEffect, useRef, useState } from "react";
import type { Tool } from "@/lib/types";

const SWATCHES = [
  "#000000","#ffffff","#e0473c","#f2a93b",
  "#22a06b","#2454ff","#9b5de5","#ec4899",
  "#0ea5e9","#ff6b35","#f59e0b","#06d6a0",
];

const SIZE_PRESETS = [2, 6, 14, 28, 48];

const FONT_SIZES = [16, 24, 36, 56, 80];

// ─── Tool groups ──────────────────────────────────────────────────────────────
type BrushDef = { id: Tool; label: string; key?: string; description: string; preview: React.ReactNode; icon: React.ReactNode };

const BRUSHES: BrushDef[] = [
  { id:"pen",         label:"Pen",         key:"1", description:"Smooth, precise",      preview:<path d="M4,20 C20,16 28,8 44,6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>,                                                                    icon:<PenIcon/> },
  { id:"pencil",      label:"Pencil",      key:"2", description:"Textured graphite",    preview:<path d="M4,18 C14,14 24,10 44,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8"/>,                                                       icon:<PencilIcon/> },
  { id:"marker",      label:"Marker",      key:"3", description:"Bold flat coverage",   preview:<path d="M4,22 C16,18 28,10 44,8" stroke="currentColor" strokeWidth="7" strokeLinecap="butt" fill="none" opacity="0.5"/>,                                                         icon:<MarkerIcon/> },
  { id:"highlighter", label:"Highlighter", key:"4", description:"Semi-transparent",     preview:<path d="M4,18 C16,14 28,14 44,14" stroke="currentColor" strokeWidth="9" strokeLinecap="square" fill="none" opacity="0.4"/>,                                                      icon:<HighlighterIcon/> },
  { id:"calligraphy", label:"Calligraphy", key:"5", description:"Variable-width nib",   preview:<><path d="M4,24 C16,18 28,10 44,6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none"/><path d="M4,26 C16,20 28,12 44,8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/></>, icon:<CalligraphyIcon/> },
  { id:"crayon",      label:"Crayon",      key:"6", description:"Waxy rough texture",   preview:<path d="M4,20 C16,16 28,12 44,10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.55" strokeDasharray="3 1"/>,                               icon:<CrayonIcon/> },
  { id:"oil",         label:"Oil brush",   key:"7", description:"Thick painterly",      preview:<><path d="M4,22 C16,18 28,12 44,10" stroke="currentColor" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.4"/><path d="M4,22 C16,18 28,12 44,10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9"/></>, icon:<OilIcon/> },
  { id:"watercolour", label:"Watercolour", key:"8", description:"Soft washes",          preview:<><circle cx="14" cy="16" r="8" fill="currentColor" opacity="0.18"/><circle cx="24" cy="14" r="7" fill="currentColor" opacity="0.18"/><circle cx="34" cy="16" r="8" fill="currentColor" opacity="0.18"/></>, icon:<WatercolourIcon/> },
  { id:"spray",       label:"Spray",       key:"9", description:"Scattered mist",       preview:<>{[12,8,16,6,14,10,18,8,14,12].map((cx,i)=><circle key={i} cx={cx+i*2.8} cy={14+(i%3)*3-3} r="1" fill="currentColor" opacity={0.4+(i%4)*0.15}/>)}</>,                           icon:<SprayIcon/> },
];

const SHAPES = [
  { id:"line" as Tool,         label:"Line",            icon:<LineIcon/> },
  { id:"arrow" as Tool,        label:"Arrow",           icon:<ArrowIcon/> },
  { id:"rect" as Tool,         label:"Rectangle",       icon:<RectIcon/> },
  { id:"rect-rounded" as Tool, label:"Rounded rect",    icon:<RectRoundedIcon/> },
  { id:"ellipse" as Tool,      label:"Ellipse",         icon:<EllipseIcon/> },
  { id:"triangle" as Tool,     label:"Triangle",        icon:<TriangleIcon/> },
  { id:"diamond" as Tool,      label:"Diamond",         icon:<DiamondIcon/> },
];

const SHAPE_IDS = new Set(SHAPES.map(s => s.id));
const isShape = (t: Tool) => SHAPE_IDS.has(t);
const isBrush = (t: Tool) => BRUSHES.some(b => b.id === t);

type PanelId = "brush" | "shape" | "color" | "fill" | "size" | "opacity" | "text";
type Panel = PanelId | null;

interface ToolbarProps {
  tool: Tool; setTool: (t: Tool) => void;
  color: string; setColor: (c: string) => void;
  fillColor: string | undefined; setFillColor: (c: string | undefined) => void;
  brushWidth: number; setBrushWidth: (w: number) => void;
  opacity: number; setOpacity: (o: number) => void;
  textBold: boolean; setTextBold: (v: boolean) => void;
  textItalic: boolean; setTextItalic: (v: boolean) => void;
  textFontSize: number; setTextFontSize: (s: number) => void;
  zoom: number; setZoom: (z: number) => void;
  onClear: () => void; onUndo: () => void; onRedo: () => void;
  canUndo: boolean; canRedo: boolean;
  collapsed?: boolean; onToggleCollapse?: () => void;
}

export default function Toolbar({
  tool, setTool, color, setColor, fillColor, setFillColor,
  brushWidth, setBrushWidth, opacity, setOpacity,
  textBold, setTextBold, textItalic, setTextItalic,
  textFontSize, setTextFontSize,
  zoom, setZoom,
  onClear, onUndo, onRedo, canUndo, canRedo,
  collapsed = false, onToggleCollapse,
}: ToolbarProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const railRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close panel on outside click
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPanel(null); };
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (railRef.current && !railRef.current.contains(target)) setPanel(null);
      if (mobileRef.current && !mobileRef.current.contains(target)) setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown as EventListener, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown as EventListener);
    };
  }, [panel]);

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 2500); return; }
    setConfirmClear(false); onClear();
  };

  const pickColor = (s: string, close = false) => {
    setColor(s);
    if (tool === "eraser") setTool("pen");
    setRecentColors(prev => [s, ...prev.filter(c => c !== s)].slice(0, 6));
    if (close) setPanel(null);
  };

  const chooseBrush = (id: Tool) => { setTool(id); setPanel(null); };
  const chooseShape = (id: Tool) => { setTool(id); setPanel(null); };
  const togglePanel = (p: PanelId) => setPanel(prev => prev === p ? null : p);

  if (!mounted) return null;

  const isEraser = tool === "eraser";
  const activeBrush = BRUSHES.find(b => b.id === tool) ?? BRUSHES[0];
  const activeShape = SHAPES.find(s => s.id === tool);

  const brushButtonIcon = isEraser ? <EraserIcon/> : isBrush(tool) ? activeBrush.icon : <PenIcon/>;
  const brushButtonLabel = isEraser ? "Eraser" : isBrush(tool) ? activeBrush.label : "Pen";

  return (
    <>
      {/* ══════════════════════════════════════════
          DESKTOP — fixed vertical rail (sm+)
      ══════════════════════════════════════════ */}
      <div ref={railRef} className="pointer-events-auto fixed left-3 z-40 hidden sm:block"
        style={{ top: "calc(56px + 10px)", bottom: "10px" }}>

        {collapsed ? (
          <button onClick={onToggleCollapse} title="Show toolbar" aria-label="Show toolbar"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft shadow-md transition hover:text-accent"
            style={{ boxShadow: "var(--shadow-md)" }}>
            <ChevronRightIcon/>
          </button>
        ) : (
          <>
            {/* Rail */}
            <div className="flex w-12 flex-col items-center gap-0.5 overflow-y-auto overflow-x-visible no-scrollbar rounded-2xl border border-line bg-surface py-2"
              style={{ boxShadow: "var(--shadow-md)", maxHeight: "100%" }}>

              <button onClick={onToggleCollapse} title="Collapse" aria-label="Collapse toolbar"
                className="flex h-8 w-9 items-center justify-center rounded-lg text-ink-faint transition hover:text-ink">
                <ChevronLeftIcon/>
              </button>

              <Divider/>

              {/* Brush picker */}
              <RailBtn label={brushButtonLabel} active={(panel as Panel) === "brush" || (isBrush(tool) && (panel as Panel) !== "brush") || isEraser}
                onClick={() => togglePanel("brush")}>
                <span style={{ color: isEraser ? "var(--ink-soft)" : color }}>{brushButtonIcon}</span>
              </RailBtn>

              {/* Shape picker */}
              <RailBtn label={activeShape?.label ?? "Shapes"} active={isShape(tool) || panel === "shape"}
                onClick={() => togglePanel("shape")}>
                <span style={{ color: isShape(tool) ? color : "var(--ink-soft)" }}>
                  {activeShape?.icon ?? <ShapesIcon/>}
                </span>
              </RailBtn>

              {/* Eraser */}
              <RailBtn label="Eraser" hint="E" active={isEraser} onClick={() => { setTool("eraser"); setPanel(null); }}>
                <EraserIcon/>
              </RailBtn>

              {/* Text */}
              <RailBtn label="Text" hint="T" active={tool === "text"} onClick={() => { setTool("text"); setPanel(panel === "text" ? null : "text"); }}>
                <TextIcon/>
              </RailBtn>

              <Divider/>

              {/* Stroke color */}
              <button onClick={() => togglePanel("color")} aria-label={`Stroke color: ${color}`} aria-pressed={panel==="color"} title="Stroke color"
                className={`group relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition ${panel==="color" ? "ring-2 ring-accent bg-accent-soft" : "hover:bg-surface-2"}`}>
                <span className="h-5 w-5 rounded-full border-2 border-white"
                  style={{ backgroundColor: isEraser ? "transparent" : color, boxShadow: "0 0 0 1.5px var(--line-strong)" }}/>
                <span className="font-mono text-[7px] leading-none text-ink-faint">stroke</span>
                <Tip label="Stroke color"/>
              </button>

              {/* Fill color */}
              <button onClick={() => togglePanel("fill")} aria-label="Fill color" aria-pressed={panel==="fill"} title="Fill color"
                className={`group relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition ${panel==="fill" ? "ring-2 ring-accent bg-accent-soft" : "hover:bg-surface-2"}`}>
                <span className="h-5 w-5 rounded-full border-2 border-dashed border-line-strong"
                  style={{ backgroundColor: fillColor ?? "transparent" }}/>
                <span className="font-mono text-[7px] leading-none text-ink-faint">fill</span>
                <Tip label="Fill color"/>
              </button>

              {/* Size */}
              <button onClick={() => togglePanel("size")} aria-label={`Size: ${brushWidth}px`} aria-pressed={panel==="size"} title="Brush size"
                className={`group relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition ${panel==="size" ? "ring-2 ring-accent bg-accent-soft" : "hover:bg-surface-2"}`}>
                <span className="rounded-full bg-ink"
                  style={{ width: Math.max(4, Math.min(brushWidth*0.45,18)), height: Math.max(4, Math.min(brushWidth*0.45,18)) }}/>
                <span className="font-mono text-[7px] leading-none text-ink-faint">{brushWidth}px</span>
                <Tip label="Size"/>
              </button>

              {/* Opacity */}
              <button onClick={() => togglePanel("opacity")} aria-label={`Opacity: ${Math.round(opacity*100)}%`} aria-pressed={panel==="opacity"} title="Opacity"
                className={`group relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition ${panel==="opacity" ? "ring-2 ring-accent bg-accent-soft" : "hover:bg-surface-2"}`}>
                <span className="h-5 w-5 rounded-full border border-line-strong"
                  style={{ backgroundColor: color, opacity }}/>
                <span className="font-mono text-[7px] leading-none text-ink-faint">{Math.round(opacity*100)}%</span>
                <Tip label="Opacity"/>
              </button>

              <Divider/>

              {/* Undo / Redo */}
              <RailBtn label="Undo" hint="Ctrl+Z" onClick={onUndo} disabled={!canUndo}><UndoIcon/></RailBtn>
              <RailBtn label="Redo" hint="Ctrl+Y" onClick={onRedo} disabled={!canRedo}><RedoIcon/></RailBtn>

              <Divider/>

              {/* Zoom */}
              <button onClick={() => setZoom(Math.min(zoom + 0.25, 3))} title="Zoom in" aria-label="Zoom in"
                className="group relative flex h-8 w-10 items-center justify-center rounded-lg text-ink-soft transition hover:bg-surface-2 hover:text-ink">
                <ZoomInIcon/><Tip label="Zoom in" hint="+"/>
              </button>
              <span className="font-mono text-[9px] text-ink-faint">{Math.round(zoom*100)}%</span>
              <button onClick={() => setZoom(Math.max(zoom - 0.25, 0.25))} title="Zoom out" aria-label="Zoom out"
                className="group relative flex h-8 w-10 items-center justify-center rounded-lg text-ink-soft transition hover:bg-surface-2 hover:text-ink">
                <ZoomOutIcon/><Tip label="Zoom out" hint="-"/>
              </button>
              <button onClick={() => setZoom(1)} title="Reset zoom" aria-label="Fit canvas"
                className="group relative flex h-7 w-10 items-center justify-center rounded-lg font-mono text-[9px] text-ink-faint transition hover:bg-surface-2 hover:text-ink">
                fit<Tip label="Fit (reset zoom)"/>
              </button>

              <Divider/>

              {/* Clear */}
              <button onClick={handleClear} title={confirmClear ? "Tap again to confirm" : "Clear board"} aria-label="Clear board"
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${confirmClear ? "bg-danger/10 text-danger ring-2 ring-danger" : "text-ink-faint hover:bg-danger/10 hover:text-danger"}`}>
                {confirmClear ? <span className="text-[9px] font-bold">Sure?</span> : <TrashIcon/>}
              </button>
            </div>

            {/* ── Popovers ── */}
            {panel === "brush" && (
              <Popover>
                <PanelTitle>Brush</PanelTitle>
                <div className="flex flex-col gap-0.5">
                  {BRUSHES.map(b => (
                    <button key={b.id} onClick={() => chooseBrush(b.id)}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${tool===b.id ? "bg-accent text-white" : "hover:bg-surface-2 text-ink"}`}>
                      <svg width="48" height="28" viewBox="0 0 48 28" className="shrink-0">
                        <g style={{ color: tool===b.id ? "white" : color }}>{b.preview}</g>
                      </svg>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-semibold">{b.label}</span>
                          {b.key && <span className={`font-mono text-[9px] ${tool===b.id ? "opacity-70" : "text-ink-faint"}`}>{b.key}</span>}
                        </div>
                        <span className={`text-[11px] ${tool===b.id ? "opacity-70" : "text-ink-soft"}`}>{b.description}</span>
                      </div>
                      {tool===b.id && <CheckIcon/>}
                    </button>
                  ))}
                  <button onClick={() => chooseBrush("eraser")}
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${isEraser ? "bg-accent text-white" : "hover:bg-surface-2 text-ink"}`}>
                    <svg width="48" height="28" viewBox="0 0 48 28" className="shrink-0">
                      <rect x="8" y="10" width="32" height="10" rx="2" fill="currentColor" opacity="0.3"/>
                    </svg>
                    <div>
                      <div className="text-[13px] font-semibold">Eraser</div>
                      <div className={`text-[11px] ${isEraser ? "opacity-70" : "text-ink-soft"}`}>Remove strokes</div>
                    </div>
                    {isEraser && <CheckIcon/>}
                  </button>
                </div>
              </Popover>
            )}

            {panel === "shape" && (
              <Popover>
                <PanelTitle>Shapes</PanelTitle>
                <div className="grid grid-cols-2 gap-1.5">
                  {SHAPES.map(s => (
                    <button key={s.id} onClick={() => chooseShape(s.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[12px] font-medium transition ${tool===s.id ? "bg-accent text-white" : "hover:bg-surface-2 text-ink"}`}>
                      <span style={{ color: tool===s.id ? "white" : color }}>{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </Popover>
            )}

            {(panel === "color" || panel === "fill") && (
              <Popover>
                <div className="mb-2 flex gap-1">
                  <button onClick={() => setPanel("color")}
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${panel==="color" ? "bg-accent text-white" : "bg-surface-2 text-ink-soft hover:text-ink"}`}>
                    Stroke
                  </button>
                  <button onClick={() => setPanel("fill")}
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${panel==="fill" ? "bg-accent text-white" : "bg-surface-2 text-ink-soft hover:text-ink"}`}>
                    Fill
                  </button>
                </div>
                {panel === "fill" && (
                  <button onClick={() => { setFillColor(undefined); }}
                    className={`mb-2 w-full rounded-lg border border-dashed border-line py-1.5 text-[11px] font-medium text-ink-soft transition hover:border-accent hover:text-accent ${!fillColor ? "border-accent bg-accent-soft text-accent" : ""}`}>
                    No fill (outline only)
                  </button>
                )}
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {SWATCHES.map(s => (
                    <button key={s} title={s}
                      onClick={() => panel==="color" ? pickColor(s, true) : (setFillColor(s), setPanel(null))}
                      style={{ backgroundColor: s }}
                      className={`h-8 w-8 rounded-full border-2 transition hover:scale-110 active:scale-95 ${
                        (panel==="color" ? color : fillColor)===s ? "border-accent scale-110" : "border-line"}`}/>
                  ))}
                </div>
                {recentColors.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 font-mono text-[8px] uppercase tracking-widest text-ink-faint">Recent</p>
                    <div className="flex gap-1.5">
                      {recentColors.map(s => (
                        <button key={s} onClick={() => panel==="color" ? pickColor(s, true) : (setFillColor(s), setPanel(null))}
                          style={{ backgroundColor: s }}
                          className="h-6 w-6 rounded-full border border-line transition hover:scale-110"/>
                      ))}
                    </div>
                  </div>
                )}
                <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line text-[11px] font-medium text-ink-soft transition hover:border-accent hover:text-accent relative">
                  <PipetteIcon/>Custom
                  <input type="color" value={panel==="color" ? color : (fillColor ?? "#ffffff")}
                    onChange={e => panel==="color" ? pickColor(e.target.value) : setFillColor(e.target.value)}
                    className="absolute inset-0 h-0 w-0 opacity-0"/>
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1.5">
                  <span className="h-4 w-4 rounded-full border border-line-strong"
                    style={{ backgroundColor: panel==="color" ? color : (fillColor ?? "transparent") }}/>
                  <span className="font-mono text-[10px] uppercase text-ink-soft">
                    {panel==="color" ? color : (fillColor ?? "none")}
                  </span>
                </div>
              </Popover>
            )}

            {panel === "size" && (
              <Popover>
                <div className="mb-2 flex items-center justify-between">
                  <PanelTitle>Size</PanelTitle>
                  <span className="font-mono text-[13px] font-semibold text-ink">{brushWidth}px</span>
                </div>
                <input type="range" min={1} max={60} value={brushWidth} aria-label="Brush size"
                  onChange={e => setBrushWidth(Number(e.target.value))} className="mb-3 w-full accent-accent"/>
                <div className="flex gap-1.5">
                  {SIZE_PRESETS.map(s => (
                    <button key={s} onClick={() => setBrushWidth(s)} aria-label={`${s}px`}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 transition ${brushWidth===s ? "border-accent bg-accent-soft" : "border-line hover:border-accent"}`}>
                      <span className="rounded-full bg-ink" style={{ width: Math.min(s*0.45+3,18), height: Math.min(s*0.45+3,18) }}/>
                      <span className="font-mono text-[8px] text-ink-faint">{s}</span>
                    </button>
                  ))}
                </div>
              </Popover>
            )}

            {panel === "opacity" && (
              <Popover>
                <div className="mb-2 flex items-center justify-between">
                  <PanelTitle>Opacity</PanelTitle>
                  <span className="font-mono text-[13px] font-semibold text-ink">{Math.round(opacity*100)}%</span>
                </div>
                <input type="range" min={5} max={100} value={Math.round(opacity*100)} aria-label="Opacity"
                  onChange={e => setOpacity(Number(e.target.value)/100)} className="w-full accent-accent"
                  style={{ background: `linear-gradient(to right, ${color}11, ${color})` }}/>
                <div className="mt-3 flex gap-2">
                  {[25,50,75,100].map(v => (
                    <button key={v} onClick={() => setOpacity(v/100)}
                      className={`flex-1 rounded-lg border py-1.5 font-mono text-[10px] transition ${Math.round(opacity*100)===v ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-faint hover:border-accent"}`}>
                      {v}%
                    </button>
                  ))}
                </div>
              </Popover>
            )}

            {panel === "text" && (
              <Popover>
                <PanelTitle>Text options</PanelTitle>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setTextBold(!textBold)}
                    className={`flex-1 rounded-xl border py-2 text-[13px] font-bold transition ${textBold ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>
                    B
                  </button>
                  <button onClick={() => setTextItalic(!textItalic)}
                    className={`flex-1 rounded-xl border py-2 text-[13px] italic font-semibold transition ${textItalic ? "border-accent bg-accent text-white" : "border-line hover:border-accent"}`}>
                    I
                  </button>
                </div>
                <PanelTitle>Font size</PanelTitle>
                <div className="flex gap-1.5">
                  {FONT_SIZES.map(s => (
                    <button key={s} onClick={() => setTextFontSize(s)}
                      className={`flex-1 rounded-xl border py-2 font-mono text-[9px] transition ${textFontSize===s ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-faint hover:border-accent"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-ink-faint leading-relaxed">Click anywhere on the canvas to place text. Press Enter for new lines, Escape to finish.</p>
              </Popover>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════
          MOBILE — fixed bottom dock
      ══════════════════════════════════════════ */}
      <div ref={mobileRef} className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 sm:hidden"
        onPointerDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>

        {/* Brush panel */}
        {panel === "brush" && (
          <MobilePanel title="Brush" onClose={() => setPanel(null)}>
            <div className="grid grid-cols-3 gap-2">
              {BRUSHES.map(b => (
                <button key={b.id} onPointerDown={e => { e.stopPropagation(); chooseBrush(b.id); }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 active:scale-95 transition ${tool===b.id ? "bg-accent text-white" : "bg-surface-2 text-ink"}`}>
                  <svg width="44" height="22" viewBox="0 0 48 28">
                    <g style={{ color: tool===b.id ? "white" : color }}>{b.preview}</g>
                  </svg>
                  <span className="text-[11px] font-semibold leading-tight">{b.label}</span>
                </button>
              ))}
              <button onPointerDown={e => { e.stopPropagation(); chooseBrush("eraser"); }}
                className={`flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 active:scale-95 transition ${isEraser ? "bg-accent text-white" : "bg-surface-2 text-ink"}`}>
                <span className="flex h-[22px] items-center"><EraserIcon/></span>
                <span className="text-[11px] font-semibold">Eraser</span>
              </button>
            </div>
          </MobilePanel>
        )}

        {/* Shape panel */}
        {panel === "shape" && (
          <MobilePanel title="Shapes" onClose={() => setPanel(null)}>
            <div className="grid grid-cols-4 gap-2">
              {SHAPES.map(s => (
                <button key={s.id} onPointerDown={e => { e.stopPropagation(); chooseShape(s.id); }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 active:scale-95 transition ${tool===s.id ? "bg-accent text-white" : "bg-surface-2 text-ink"}`}>
                  <span style={{ color: tool===s.id ? "white" : color }}>{s.icon}</span>
                  <span className="text-[10px] font-semibold leading-tight text-center">{s.label}</span>
                </button>
              ))}
            </div>
          </MobilePanel>
        )}

        {/* Color panel */}
        {panel === "color" && (
          <MobilePanel title="Stroke color" onClose={() => setPanel(null)}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full border-2 border-white" style={{ backgroundColor: color, boxShadow: "0 0 0 1.5px var(--line-strong)" }}/>
              <span className="font-mono text-[11px] text-ink-soft">{color}</span>
            </div>
            <div className="grid grid-cols-6 gap-2 mb-2">
              {SWATCHES.map(s => (
                <button key={s} onPointerDown={e => { e.stopPropagation(); pickColor(s, true); }}
                  style={{ backgroundColor: s }}
                  className={`h-11 w-full rounded-xl border-[3px] active:scale-90 transition ${color===s ? "border-accent" : "border-transparent"}`}/>
              ))}
              <label className="relative flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-line text-ink-faint">
                <PipetteIcon/>
                <input type="color" value={color} onChange={e => pickColor(e.target.value)} className="absolute inset-0 h-0 w-0 opacity-0"/>
              </label>
            </div>
            {recentColors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Recent</span>
                {recentColors.map(s => (
                  <button key={s} onPointerDown={e => { e.stopPropagation(); pickColor(s, true); }}
                    style={{ backgroundColor: s }}
                    className="h-7 w-7 rounded-full border border-line active:scale-90"/>
                ))}
              </div>
            )}
          </MobilePanel>
        )}

        {/* Fill panel */}
        {panel === "fill" && (
          <MobilePanel title="Fill color" onClose={() => setPanel(null)}>
            <button onPointerDown={e => { e.stopPropagation(); setFillColor(undefined); setPanel(null); }}
              className={`mb-2 w-full rounded-xl border border-dashed border-line py-2 text-[12px] font-medium text-ink-soft active:scale-95 ${!fillColor ? "border-accent bg-accent-soft text-accent" : ""}`}>
              No fill
            </button>
            <div className="grid grid-cols-6 gap-2">
              {SWATCHES.map(s => (
                <button key={s} onPointerDown={e => { e.stopPropagation(); setFillColor(s); setPanel(null); }}
                  style={{ backgroundColor: s }}
                  className={`h-11 w-full rounded-xl border-[3px] active:scale-90 transition ${fillColor===s ? "border-accent" : "border-transparent"}`}/>
              ))}
              <label className="relative flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-line text-ink-faint">
                <PipetteIcon/>
                <input type="color" value={fillColor ?? "#ffffff"} onChange={e => setFillColor(e.target.value)} className="absolute inset-0 h-0 w-0 opacity-0"/>
              </label>
            </div>
          </MobilePanel>
        )}

        {/* Size panel */}
        {panel === "size" && (
          <MobilePanel title={`Size · ${brushWidth}px`} onClose={() => setPanel(null)}>
            <input type="range" min={1} max={60} value={brushWidth} aria-label="Brush size"
              onPointerDown={e => e.stopPropagation()} onChange={e => setBrushWidth(Number(e.target.value))}
              className="mb-3 w-full accent-accent"/>
            <div className="flex gap-2">
              {SIZE_PRESETS.map(s => (
                <button key={s} onPointerDown={e => { e.stopPropagation(); setBrushWidth(s); }}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 active:scale-95 transition ${brushWidth===s ? "border-accent bg-accent-soft" : "border-line"}`}>
                  <span className="rounded-full bg-ink" style={{ width: Math.min(s*0.4+3,20), height: Math.min(s*0.4+3,20) }}/>
                  <span className="font-mono text-[9px] text-ink-faint">{s}</span>
                </button>
              ))}
            </div>
          </MobilePanel>
        )}

        {/* Opacity panel */}
        {panel === "opacity" && (
          <MobilePanel title={`Opacity · ${Math.round(opacity*100)}%`} onClose={() => setPanel(null)}>
            <input type="range" min={5} max={100} value={Math.round(opacity*100)} aria-label="Opacity"
              onPointerDown={e => e.stopPropagation()} onChange={e => setOpacity(Number(e.target.value)/100)}
              className="mb-3 w-full accent-accent"/>
            <div className="flex gap-2">
              {[25,50,75,100].map(v => (
                <button key={v} onPointerDown={e => { e.stopPropagation(); setOpacity(v/100); }}
                  className={`flex-1 rounded-xl border py-2.5 font-mono text-[11px] active:scale-95 transition ${Math.round(opacity*100)===v ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-faint"}`}>
                  {v}%
                </button>
              ))}
            </div>
          </MobilePanel>
        )}

        {/* Text options panel */}
        {panel === "text" && (
          <MobilePanel title="Text" onClose={() => setPanel(null)}>
            <div className="flex gap-2 mb-3">
              <button onPointerDown={e => { e.stopPropagation(); setTextBold(!textBold); }}
                className={`flex-1 rounded-xl border py-2.5 text-[14px] font-bold active:scale-95 transition ${textBold ? "border-accent bg-accent text-white" : "border-line"}`}>B</button>
              <button onPointerDown={e => { e.stopPropagation(); setTextItalic(!textItalic); }}
                className={`flex-1 rounded-xl border py-2.5 text-[14px] italic font-semibold active:scale-95 transition ${textItalic ? "border-accent bg-accent text-white" : "border-line"}`}>I</button>
            </div>
            <div className="flex gap-1.5">
              {FONT_SIZES.map(s => (
                <button key={s} onPointerDown={e => { e.stopPropagation(); setTextFontSize(s); setPanel(null); }}
                  className={`flex-1 rounded-xl border py-2.5 font-mono text-[10px] active:scale-95 transition ${textFontSize===s ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-faint"}`}>{s}</button>
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] text-ink-faint">Tap canvas to place text</p>
          </MobilePanel>
        )}

        {/* Row 1: Tool selector row */}
        <div className="mx-2 mb-1.5 flex items-center gap-1 rounded-2xl border border-line bg-surface px-2 py-1.5" style={{ boxShadow: "var(--shadow-sm)" }}>
          {/* Brush */}
          <button onPointerDown={e => { e.stopPropagation(); togglePanel("brush"); }}
            aria-label="Brush picker" aria-pressed={panel==="brush"}
            className={`flex flex-1 items-center gap-2 rounded-xl px-2.5 py-2 active:scale-95 transition ${panel==="brush" ? "bg-accent-soft ring-2 ring-accent" : ""}`}>
            <span style={{ color: isEraser ? "var(--ink-soft)" : color }}>{brushButtonIcon}</span>
            <span className="text-[12px] font-semibold text-ink truncate">{brushButtonLabel}</span>
            <ChevDownIcon/>
          </button>
          <Vsep/>
          {/* Shape */}
          <button onPointerDown={e => { e.stopPropagation(); togglePanel("shape"); }}
            aria-label="Shape picker" aria-pressed={panel==="shape"}
            className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl active:scale-95 transition ${panel==="shape" ? "bg-accent-soft ring-2 ring-accent" : ""}`}>
            <span style={{ color: isShape(tool) ? color : "var(--ink-soft)" }}>
              {activeShape?.icon ?? <ShapesIcon/>}
            </span>
            <span className="font-mono text-[7px] text-ink-faint leading-none">shape</span>
          </button>
          {/* Text */}
          <button onPointerDown={e => { e.stopPropagation(); setTool("text"); togglePanel("text"); }}
            aria-label="Text tool" aria-pressed={tool==="text"}
            className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl active:scale-95 transition ${tool==="text" ? "bg-accent text-white" : "text-ink-soft"}`}>
            <TextIcon/>
            <span className="font-mono text-[7px] leading-none" style={{ color: tool==="text" ? "white" : "var(--ink-faint)" }}>text</span>
          </button>
        </div>

        {/* Row 2: Style controls */}
        <div className="mx-2 mb-3 flex items-center gap-1 rounded-2xl border border-line bg-surface px-2 py-1"
          style={{ paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom, 0px))", boxShadow: "var(--shadow-sm)" }}>

          {/* Undo */}
          <MobileBtn label="Undo" disabled={!canUndo} onPointerDown={e => { e.stopPropagation(); onUndo(); }}><UndoIcon/></MobileBtn>
          {/* Redo */}
          <MobileBtn label="Redo" disabled={!canRedo} onPointerDown={e => { e.stopPropagation(); onRedo(); }}><RedoIcon/></MobileBtn>

          <Vsep/>

          {/* Stroke color */}
          <button onPointerDown={e => { e.stopPropagation(); togglePanel("color"); }}
            aria-label={`Stroke color: ${color}`} aria-pressed={panel==="color"}
            className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl active:scale-90 transition ${panel==="color" ? "ring-2 ring-accent bg-accent-soft" : ""}`}>
            <span className="h-6 w-6 rounded-full border-2 border-white"
              style={{ backgroundColor: isEraser ? "transparent" : color, boxShadow: "0 0 0 1.5px var(--line-strong)" }}/>
            <span className="font-mono text-[7px] text-ink-faint leading-none">stroke</span>
          </button>

          {/* Fill color */}
          <button onPointerDown={e => { e.stopPropagation(); togglePanel("fill"); }}
            aria-label="Fill color" aria-pressed={panel==="fill"}
            className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl active:scale-90 transition ${panel==="fill" ? "ring-2 ring-accent bg-accent-soft" : ""}`}>
            <span className="h-6 w-6 rounded-full border-2 border-dashed border-line-strong"
              style={{ backgroundColor: fillColor ?? "transparent" }}/>
            <span className="font-mono text-[7px] text-ink-faint leading-none">fill</span>
          </button>

          {/* Size */}
          <button onPointerDown={e => { e.stopPropagation(); togglePanel("size"); }}
            aria-label={`Size: ${brushWidth}px`} aria-pressed={panel==="size"}
            className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl active:scale-90 transition ${panel==="size" ? "ring-2 ring-accent bg-accent-soft" : ""}`}>
            <span className="rounded-full bg-ink" style={{ width: Math.max(5,Math.min(brushWidth*0.38,18)), height: Math.max(5,Math.min(brushWidth*0.38,18)) }}/>
            <span className="font-mono text-[7px] text-ink-faint leading-none">{brushWidth}px</span>
          </button>

          {/* Opacity */}
          <button onPointerDown={e => { e.stopPropagation(); togglePanel("opacity"); }}
            aria-label={`Opacity: ${Math.round(opacity*100)}%`} aria-pressed={panel==="opacity"}
            className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl active:scale-90 transition ${panel==="opacity" ? "ring-2 ring-accent bg-accent-soft" : ""}`}>
            <span className="h-5 w-5 rounded-full border border-line-strong" style={{ backgroundColor: color, opacity }}/>
            <span className="font-mono text-[7px] text-ink-faint leading-none">{Math.round(opacity*100)}%</span>
          </button>

          <Vsep/>

          {/* Zoom */}
          <button onPointerDown={e => { e.stopPropagation(); setZoom(Math.min(zoom+0.5,3)); }}
            aria-label="Zoom in"
            className="flex h-12 w-10 items-center justify-center rounded-xl text-ink-soft active:scale-90">
            <ZoomInIcon/>
          </button>
          <button onPointerDown={e => { e.stopPropagation(); setZoom(Math.max(zoom-0.5,0.25)); }}
            aria-label="Zoom out"
            className="flex h-12 w-10 items-center justify-center rounded-xl text-ink-soft active:scale-90">
            <ZoomOutIcon/>
          </button>

          <Vsep/>

          {/* Clear */}
          <button onPointerDown={e => { e.stopPropagation(); handleClear(); }}
            aria-label="Clear board"
            className={`flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 active:scale-95 transition ${confirmClear ? "bg-danger/10 text-danger ring-2 ring-danger" : "text-ink-soft"}`}>
            {confirmClear ? <span className="text-[10px] font-bold">Sure?</span> : <><TrashIcon/><span className="font-mono text-[7px] text-ink-faint leading-none">clear</span></>}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */
function RailBtn({ children, label, hint, active=false, disabled=false, onClick }: {
  children: React.ReactNode; label: string; hint?: string;
  active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={active} title={label}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
        disabled ? "cursor-not-allowed opacity-30 text-ink-faint"
        : active ? "bg-accent text-white shadow-sm"
        : "text-ink-soft hover:bg-surface-2 hover:text-ink"}`}>
      {children}
      {active && !disabled && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface"/>}
      <Tip label={label} hint={hint}/>
    </button>
  );
}

function MobileBtn({ children, label, disabled=false, onPointerDown }: {
  children: React.ReactNode; label: string; disabled?: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <button onPointerDown={onPointerDown} disabled={disabled} aria-label={label}
      className={`flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 active:scale-90 transition ${disabled ? "cursor-not-allowed opacity-30 text-ink-faint" : "text-ink-soft"}`}>
      {children}
      <span className="font-mono text-[7px] leading-none text-ink-faint">{label}</span>
    </button>
  );
}

function Popover({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-pop-in absolute left-[calc(100%+10px)] top-0 w-56 rounded-2xl border border-line bg-surface p-3"
      style={{ boxShadow: "var(--shadow-lg)" }}>
      {children}
    </div>
  );
}

function MobilePanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="mx-2 mb-2 rounded-2xl border border-line bg-surface p-3 animate-slide-up" style={{ boxShadow: "var(--shadow-lg)" }}>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{title}</p>
        <button onPointerDown={e => { e.stopPropagation(); onClose(); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint text-[14px] hover:text-ink">✕</button>
      </div>
      {children}
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-ink-faint">{children}</p>;
}

function Tip({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-ink shadow-lg group-hover:block">
      {label}{hint && <span className="ml-2 font-mono text-[10px] text-ink-faint">{hint}</span>}
    </span>
  );
}

function Divider() { return <span className="my-1 h-px w-8 shrink-0 rounded-full bg-line"/>; }
function Vsep()    { return <span className="mx-0.5 h-8 w-px shrink-0 rounded-full bg-line"/>; }

/* ── Icons ─────────────────────────────────────────────────────────────────── */
const Ic = ({ d, children, w=16, h=16 }: { d?: string; children?: React.ReactNode; w?: number; h?: number }) => (
  <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d}/> : children}
  </svg>
);
function PenIcon()          { return <Ic><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></Ic>; }
function PencilIcon()       { return <Ic><line x1="18" y1="2" x2="22" y2="6"/><path d="M7.5 20.5L19 9l-4-4L3.5 16.5 2 22z"/><line x1="15" y1="5" x2="19" y2="9"/></Ic>; }
function MarkerIcon()       { return <Ic><path d="M9 11l4 4L20 8a2 2 0 0 0-3-3L9 11z"/><path d="M9 11L5 15a2 2 0 0 0 0 3l1 1a2 2 0 0 0 3 0l4-4"/><line x1="5" y1="20" x2="3" y2="22"/></Ic>; }
function HighlighterIcon()  { return <Ic><path d="M15.5 2.1L21.9 8.5 8.5 21.9 2.1 15.5z"/><path d="M2 22l4-4"/><path d="M9 3l3 3"/></Ic>; }
function CalligraphyIcon()  { return <Ic><path d="M3 17c3-3 6-6 8-8"/><path d="M11 9c2-2 4-3 6-3 0 2-1 4-3 6"/><path d="M5 21c1-2 4-7 6-9"/><circle cx="19" cy="5" r="2"/></Ic>; }
function CrayonIcon()       { return <Ic><path d="M6 20L17 9l-4-4L2 16l4 4z"/><path d="M17 9l3-3a1 1 0 0 0-3-3l-3 3"/><line x1="8" y1="18" x2="12" y2="14"/></Ic>; }
function OilIcon()          { return <Ic><path d="M3 22l9-9"/><path d="M6 6l2 2-4 4 4 4 4-4"/><path d="M17.5 3A3.5 3.5 0 0 1 21 6.5c0 2-2 4-4 6l-3-3c2-2 4-4 4-6 0-.83-.67-1.5-1.5-1.5"/></Ic>; }
function WatercolourIcon()  { return <Ic><path d="M12 2a5 5 0 0 1 5 5c0 5-5 13-5 13S7 12 7 7a5 5 0 0 1 5-5z"/><circle cx="12" cy="7" r="2" fill="currentColor"/></Ic>; }
function SprayIcon()        { return <Ic><path d="M3 3h2v2H3z" fill="currentColor"/><path d="M7 3h2v2H7z" fill="currentColor"/><path d="M3 7h2v2H3z" fill="currentColor"/><path d="M11 7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1z"/><circle cx="15" cy="13" r="2" fill="currentColor"/></Ic>; }
function EraserIcon()       { return <Ic><path d="M20 20H7L3.5 16.5a2 2 0 0 1 0-2.83l8.17-8.17a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83L13.5 20"/><path d="M7 20l-4-4"/></Ic>; }
function TextIcon()         { return <Ic><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></Ic>; }
function ShapesIcon()       { return <Ic><rect x="3" y="3" width="8" height="8" rx="1"/><circle cx="17" cy="7" r="4"/><path d="M3 21l5-10 5 10"/><path d="M14 21h8"/></Ic>; }
function LineIcon()         { return <Ic d="M5 19L19 5"/>; }
function ArrowIcon()        { return <Ic><path d="M5 19L19 5"/><path d="M19 5l-6 0M19 5l0 6"/></Ic>; }
function RectIcon()         { return <Ic><rect x="3" y="3" width="18" height="18" rx="0"/></Ic>; }
function RectRoundedIcon()  { return <Ic><rect x="3" y="3" width="18" height="18" rx="4"/></Ic>; }
function EllipseIcon()      { return <Ic><ellipse cx="12" cy="12" rx="10" ry="6"/></Ic>; }
function TriangleIcon()     { return <Ic><path d="M12 3L21 21H3z"/></Ic>; }
function DiamondIcon()      { return <Ic><path d="M12 2l10 10-10 10L2 12z"/></Ic>; }
function UndoIcon()         { return <Ic><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></Ic>; }
function RedoIcon()         { return <Ic><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></Ic>; }
function TrashIcon()        { return <Ic><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></Ic>; }
function PipetteIcon()      { return <Ic><path d="M2 22l4-4"/><path d="M14 4l6 6-9 9-6-6 9-9z"/><path d="M5 11l3 3"/></Ic>; }
function ZoomInIcon()       { return <Ic><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></Ic>; }
function ZoomOutIcon()      { return <Ic><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></Ic>; }
function ChevronLeftIcon()  { return <Ic d="M15 18l-6-6 6-6"/>; }
function ChevronRightIcon() { return <Ic d="M9 18l6-6-6-6"/>; }
function ChevDownIcon()     { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto shrink-0 text-ink-faint"><path d="M6 9l6 6 6-6"/></svg>; }
function CheckIcon()        { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>; }
