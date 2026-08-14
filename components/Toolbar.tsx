"use client";
import { useEffect, useRef, useState } from "react";
import BrushPreview from "@/components/BrushPreview";
import type { Tool, DrawTool, ShapeTool, PenSettings, EraserSettings, ShapeSettings, TextSettings } from "@/lib/types";

// ─── Constants ─────────────────────────────────────────────────────────────────
const SWATCHES = [
  "#000000","#ffffff","#e0473c","#f2a93b","#22a06b",
  "#2454ff","#9b5de5","#ec4899","#0ea5e9","#ff6b35","#06d6a0",
];
const SIZE_PRESETS = [2, 6, 14, 28, 48];
const FONT_SIZES   = [14, 20, 32, 48, 72];

type BrushDef = { id: DrawTool; label: string; desc: string };
const BRUSHES: BrushDef[] = [
  { id:"pen",         label:"Pen",         desc:"Smooth, precise" },
  { id:"pencil",      label:"Pencil",      desc:"Textured graphite" },
  { id:"marker",      label:"Marker",      desc:"Bold flat coverage" },
  { id:"highlighter", label:"Highlighter", desc:"Semi-transparent" },
  { id:"calligraphy", label:"Calligraphy", desc:"Variable-width nib" },
  { id:"crayon",      label:"Crayon",      desc:"Waxy rough texture" },
  { id:"oil",         label:"Oil",         desc:"Thick painterly" },
  { id:"watercolour", label:"Watercolour", desc:"Soft washes" },
  { id:"spray",       label:"Spray",       desc:"Scattered mist" },
];

type ShapeDef = { id: ShapeTool; label: string; icon: React.ReactNode };
const SHAPES: ShapeDef[] = [
  { id:"line",         label:"Line",         icon:<LineIcon/> },
  { id:"arrow",        label:"Arrow",        icon:<ArrowIcon/> },
  { id:"rect",         label:"Rectangle",    icon:<RectIcon/> },
  { id:"rect-rounded", label:"Rounded rect", icon:<RoundedRectIcon/> },
  { id:"ellipse",      label:"Ellipse",      icon:<EllipseIcon/> },
  { id:"triangle",     label:"Triangle",     icon:<TriangleIcon/> },
  { id:"diamond",      label:"Diamond",      icon:<DiamondIcon/> },
];

const DRAW_TOOLS   = new Set<Tool>(BRUSHES.map(b=>b.id));
const SHAPE_TOOLS  = new Set<Tool>(SHAPES.map(s=>s.id));
const isBrush      = (t: Tool): t is DrawTool  => DRAW_TOOLS.has(t);
const isShape      = (t: Tool): t is ShapeTool => SHAPE_TOOLS.has(t);

// ─── Panel type ────────────────────────────────────────────────────────────────
type PanelName = "brush"|"shape"|"stroke"|"fill"|"size"|"opacity"|"text";

// ─── Props ─────────────────────────────────────────────────────────────────────
interface ToolbarProps {
  tool:     Tool;
  setTool:  (t: Tool) => void;

  penSettings:    PenSettings;
  setPenSettings: (s: PenSettings) => void;

  eraserSettings:    EraserSettings;
  setEraserSettings: (s: EraserSettings) => void;

  shapeSettings:    ShapeSettings;
  setShapeSettings: (s: ShapeSettings) => void;

  textSettings:    TextSettings;
  setTextSettings: (s: TextSettings) => void;

  zoom: number; setZoom: (z: number) => void;

  onUndo: () => void; onRedo: () => void;
  canUndo: boolean;   canRedo: boolean;
  onClear: () => void;
  onDownload: () => void;

  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ─── Toolbar ───────────────────────────────────────────────────────────────────
export default function Toolbar({
  tool, setTool,
  penSettings, setPenSettings,
  eraserSettings, setEraserSettings,
  shapeSettings, setShapeSettings,
  textSettings, setTextSettings,
  zoom, setZoom,
  onUndo, onRedo, canUndo, canRedo, onClear, onDownload,
  collapsed=false, onToggleCollapse,
}: ToolbarProps) {
  const [panel, setPanel] = useState<PanelName|null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [mounted, setMounted] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close panel on outside click / Escape
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key==="Escape") setPanel(null); };
    const onDown = (e: MouseEvent|TouchEvent) => {
      const t = e.target as Node;
      const inRail   = railRef.current?.contains(t);
      const inMobile = mobileRef.current?.contains(t);
      if (!inRail && !inMobile) setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown as EventListener, {passive:true});
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown as EventListener);
    };
  }, [panel]);

  if (!mounted) return null;

  const toggle = (p: PanelName) => setPanel(prev => prev===p ? null : p);

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 2500);
      return;
    }
    setConfirmClear(false);
    onClear();
  };

  // ── Derived: what colour/size/opacity does the active tool use? ──────────────
  const activeColor   = isShape(tool) ? shapeSettings.color
                      : tool==="text" ? textSettings.color
                      : penSettings.color;
  const activeFill    = isShape(tool) ? shapeSettings.fillColor : undefined;
  const activeSize    = tool==="eraser" ? eraserSettings.width
                      : isShape(tool)  ? shapeSettings.width
                      : penSettings.width;
  const activeOpacity = isShape(tool) ? shapeSettings.opacity
                      : tool==="text" ? textSettings.opacity
                      : penSettings.opacity;

  // ── Setters that target only the right tool's settings ───────────────────────
  const setColor = (c: string) => {
    if (isShape(tool))   setShapeSettings({...shapeSettings, color:c});
    else if (tool==="text") setTextSettings({...textSettings, color:c});
    else                 setPenSettings({...penSettings, color:c});
  };
  const setFill = (c: string|undefined) => {
    if (isShape(tool)) setShapeSettings({...shapeSettings, fillColor:c});
  };
  const setSize = (w: number) => {
    if (tool==="eraser")     setEraserSettings({...eraserSettings, width:w});
    else if (isShape(tool))  setShapeSettings({...shapeSettings, width:w});
    else                     setPenSettings({...penSettings, width:w});
  };
  const setOpacity = (o: number) => {
    if (isShape(tool))      setShapeSettings({...shapeSettings, opacity:o});
    else if (tool==="text") setTextSettings({...textSettings, opacity:o});
    else                    setPenSettings({...penSettings, opacity:o});
  };

  // ── Which brush is active ─────────────────────────────────────────────────────
  const activeBrush = BRUSHES.find(b=>b.id===tool) ?? BRUSHES[0];
  const activeShape = SHAPES.find(s=>s.id===tool);

  // ── Tool switchers ────────────────────────────────────────────────────────────
  const selectBrush = (id: DrawTool) => { setTool(id); setPanel(null); };
  const selectShape = (id: ShapeTool) => { setTool(id); setPanel(null); };
  const selectEraser = () => { setTool("eraser"); setPanel(panel==="size" ? "size" : null); };
  const selectText   = () => { setTool("text");   toggle("text"); };

  return (
    <>
      {/* ══════════════ DESKTOP (left rail) ══════════════ */}
      <div ref={railRef}
        className="pointer-events-auto fixed left-3 z-40 hidden sm:block"
        style={{ top:"calc(56px + 10px)", bottom:"10px" }}>

        {collapsed ? (
          <button onClick={onToggleCollapse} title="Expand toolbar"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft shadow-md hover:text-accent transition">
            <ChevRightIcon/>
          </button>
        ) : (
          <>
            <nav className="flex w-12 flex-col items-center gap-0.5 overflow-y-auto overflow-x-visible
              no-scrollbar rounded-2xl border border-line bg-surface py-2"
              style={{ boxShadow:"var(--shadow-md)", maxHeight:"100%" }}>

              {/* Collapse */}
              <button onClick={onToggleCollapse} title="Collapse"
                className="flex h-8 w-9 items-center justify-center rounded-lg text-ink-faint hover:text-ink transition">
                <ChevLeftIcon/>
              </button>
              <Divider/>

              {/* ── Live brush preview ───────────────────────── */}
              <BrushPreview
                tool={isBrush(tool)?tool:(tool as string)==="eraser"?"eraser":"pen"}
                color={tool==="eraser"?"#888888":activeColor}
                width={activeSize}
                opacity={tool==="eraser"?1:activeOpacity}
              />

              {/* ── Brush ────────────────────────────────────── */}
              <RailBtn label={activeBrush.label} active={isBrush(tool)||(panel==="brush")} onClick={()=>toggle("brush")}>
                {isBrush(tool)?<BrushActiveIcon/>:<PenIcon/>}
              </RailBtn>

              {/* ── Eraser (SEPARATE from brush) ─────────────── */}
              <RailBtn label="Eraser" hint="E" active={tool==="eraser"} onClick={selectEraser}>
                <EraserIcon/>
              </RailBtn>

              {/* ── Shapes ───────────────────────────────────── */}
              <RailBtn label={activeShape?.label??"Shapes"} active={isShape(tool)||(panel==="shape")} onClick={()=>toggle("shape")}>
                {activeShape?.icon??<ShapesIcon/>}
              </RailBtn>

              {/* ── Text ─────────────────────────────────────── */}
              <RailBtn label="Text" hint="T" active={tool==="text"} onClick={selectText}>
                <TextIcon/>
              </RailBtn>

              <Divider/>

              {/* ── Stroke colour ─────────────────────────────── */}
              {tool!=="eraser" && (
                <SwatchBtn label="Stroke" color={activeColor} active={panel==="stroke"}
                  onClick={()=>toggle("stroke")}/>
              )}

              {/* ── Fill (shapes only) ────────────────────────── */}
              {isShape(tool) && (
                <SwatchBtn label="Fill" color={activeFill} active={panel==="fill"}
                  dashed={!activeFill} onClick={()=>toggle("fill")}/>
              )}

              {/* ── Size ─────────────────────────────────────── */}
              <SizeBtn size={activeSize} active={panel==="size"} onClick={()=>toggle("size")}/>

              {/* ── Opacity ──────────────────────────────────── */}
              {tool!=="eraser" && (
                <OpacityBtn opacity={activeOpacity} color={activeColor} active={panel==="opacity"} onClick={()=>toggle("opacity")}/>
              )}

              <Divider/>

              {/* ── Eraser size (when eraser active) ─────────── */}
              {tool==="eraser" && (
                <SizeBtn size={eraserSettings.width} active={panel==="size"} onClick={()=>toggle("size")}/>
              )}

              {/* ── Undo / Redo ───────────────────────────────── */}
              <RailBtn label="Undo" hint="Ctrl+Z" onClick={onUndo} disabled={!canUndo}><UndoIcon/></RailBtn>
              <RailBtn label="Redo" hint="Ctrl+Y" onClick={onRedo} disabled={!canRedo}><RedoIcon/></RailBtn>

              <Divider/>

              {/* ── Zoom ─────────────────────────────────────── */}
              <RailBtn label="Zoom in" hint="+" onClick={()=>setZoom(Math.min(zoom+0.25,4))}><ZoomInIcon/></RailBtn>
              <span className="font-mono text-[9px] text-ink-faint">{Math.round(zoom*100)}%</span>
              <RailBtn label="Zoom out" hint="-" onClick={()=>setZoom(Math.max(zoom-0.25,0.25))}><ZoomOutIcon/></RailBtn>
              <RailBtn label="Reset zoom" onClick={()=>setZoom(1)}>
                <span className="font-mono text-[9px] font-semibold">fit</span>
              </RailBtn>

              <Divider/>

              {/* ── Download ─────────────────────────────────── */}
              <RailBtn label="Download PNG" hint="Ctrl+S" onClick={onDownload}><DownloadIcon/></RailBtn>

              {/* ── Clear ────────────────────────────────────── */}
              <button onClick={handleClear} title={confirmClear?"Tap again to confirm":"Clear board"}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition
                  ${confirmClear?"bg-danger/10 text-danger ring-2 ring-danger":"text-ink-faint hover:bg-danger/10 hover:text-danger"}`}>
                {confirmClear?<span className="text-[9px] font-bold">Sure?</span>:<TrashIcon/>}
              </button>
            </nav>

            {/* ── Popovers ──────────────────────────────────── */}

            {panel==="brush" && (
              <Popover>
                <PanelTitle>Brush style</PanelTitle>
                <div className="flex flex-col gap-0.5">
                  {BRUSHES.map(b=>(
                    <button key={b.id} onClick={()=>selectBrush(b.id)}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition
                        ${tool===b.id?"bg-accent text-white":"hover:bg-surface-2 text-ink"}`}>
                      <span className={`text-[13px] font-semibold flex-1`}>{b.label}</span>
                      <span className={`text-[11px] ${tool===b.id?"opacity-70":"text-ink-soft"}`}>{b.desc}</span>
                      {tool===b.id && <CheckIcon/>}
                    </button>
                  ))}
                </div>
              </Popover>
            )}

            {panel==="shape" && (
              <Popover>
                <PanelTitle>Shape</PanelTitle>
                <div className="grid grid-cols-2 gap-1.5">
                  {SHAPES.map(s=>(
                    <button key={s.id} onClick={()=>selectShape(s.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[12px] font-medium transition
                        ${tool===s.id?"bg-accent text-white":"hover:bg-surface-2 text-ink"}`}>
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </div>
              </Popover>
            )}

            {(panel==="stroke"||panel==="fill") && (
              <ColorPopover
                panel={panel}
                strokeColor={activeColor}
                fillColor={activeFill}
                showFill={isShape(tool)}
                onStroke={c=>setColor(c)}
                onFill={c=>setFill(c)}
                onClearFill={()=>setFill(undefined)}
                onSwitchPanel={setPanel as (p:PanelName)=>void}
              />
            )}

            {panel==="size" && (
              <Popover>
                <div className="mb-1 flex items-center justify-between">
                  <PanelTitle>{tool==="eraser"?"Eraser size":"Brush size"}</PanelTitle>
                  <span className="font-mono text-[13px] font-semibold">{activeSize}px</span>
                </div>
                <input type="range" min={1} max={80} value={activeSize} aria-label="Size"
                  onChange={e=>setSize(Number(e.target.value))} className="mb-3 w-full accent-accent"
                  onPointerDown={e=>e.stopPropagation()}/>
                <div className="flex gap-1.5">
                  {SIZE_PRESETS.map(s=>(
                    <button key={s} onClick={()=>setSize(s)}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 transition
                        ${activeSize===s?"border-accent bg-accent-soft":"border-line hover:border-accent"}`}>
                      <span className="rounded-full bg-ink" style={{width:Math.min(s*0.4+3,20),height:Math.min(s*0.4+3,20)}}/>
                      <span className="font-mono text-[8px] text-ink-faint">{s}</span>
                    </button>
                  ))}
                </div>
              </Popover>
            )}

            {panel==="opacity" && (
              <Popover>
                <div className="mb-1 flex items-center justify-between">
                  <PanelTitle>Opacity</PanelTitle>
                  <span className="font-mono text-[13px] font-semibold">{Math.round(activeOpacity*100)}%</span>
                </div>
                <input type="range" min={5} max={100} value={Math.round(activeOpacity*100)} aria-label="Opacity"
                  onChange={e=>setOpacity(Number(e.target.value)/100)} className="w-full accent-accent"
                  onPointerDown={e=>e.stopPropagation()}/>
                <div className="mt-3 flex gap-2">
                  {[25,50,75,100].map(v=>(
                    <button key={v} onClick={()=>setOpacity(v/100)}
                      className={`flex-1 rounded-lg border py-1.5 font-mono text-[10px] transition
                        ${Math.round(activeOpacity*100)===v?"border-accent bg-accent-soft text-accent":"border-line text-ink-faint hover:border-accent"}`}>
                      {v}%
                    </button>
                  ))}
                </div>
              </Popover>
            )}

            {panel==="text" && (
              <Popover>
                <PanelTitle>Text options</PanelTitle>
                <div className="flex gap-2 mb-3">
                  <button onClick={()=>setTextSettings({...textSettings,bold:!textSettings.bold})}
                    className={`flex-1 rounded-xl border py-2 text-[14px] font-bold transition
                      ${textSettings.bold?"border-accent bg-accent text-white":"border-line hover:border-accent"}`}>B</button>
                  <button onClick={()=>setTextSettings({...textSettings,italic:!textSettings.italic})}
                    className={`flex-1 rounded-xl border py-2 text-[14px] italic font-semibold transition
                      ${textSettings.italic?"border-accent bg-accent text-white":"border-line hover:border-accent"}`}>I</button>
                </div>
                <PanelTitle>Font size</PanelTitle>
                <div className="flex gap-1.5 mb-3">
                  {FONT_SIZES.map(s=>(
                    <button key={s} onClick={()=>setTextSettings({...textSettings,fontSize:s})}
                      className={`flex-1 rounded-xl border py-2 font-mono text-[9px] transition
                        ${textSettings.fontSize===s?"border-accent bg-accent-soft text-accent":"border-line text-ink-faint hover:border-accent"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-ink-faint leading-relaxed">Click on the canvas to place text.</p>
              </Popover>
            )}
          </>
        )}
      </div>

      {/* ══════════════ MOBILE (bottom dock) ══════════════ */}
      <div ref={mobileRef}
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 sm:hidden"
        onPointerDown={e=>e.stopPropagation()}
        onTouchStart={e=>e.stopPropagation()}>

        {/* Mobile panels */}
        {panel==="brush" && (
          <MobilePanel title="Brush" onClose={()=>setPanel(null)}>
            <div className="grid grid-cols-3 gap-2">
              {BRUSHES.map(b=>(
                <MobileToolBtn key={b.id} label={b.label}
                  active={tool===b.id}
                  onClick={()=>selectBrush(b.id)}>
                  <PenIcon/>
                </MobileToolBtn>
              ))}
            </div>
          </MobilePanel>
        )}

        {panel==="shape" && (
          <MobilePanel title="Shape" onClose={()=>setPanel(null)}>
            <div className="grid grid-cols-4 gap-2">
              {SHAPES.map(s=>(
                <MobileToolBtn key={s.id} label={s.label}
                  active={tool===s.id}
                  onClick={()=>selectShape(s.id)}>
                  {s.icon}
                </MobileToolBtn>
              ))}
            </div>
          </MobilePanel>
        )}

        {(panel==="stroke"||panel==="fill") && (
          <MobilePanel title={panel==="stroke"?"Stroke colour":"Fill colour"} onClose={()=>setPanel(null)}>
            {panel==="fill" && (
              <button onPointerDown={e=>{e.stopPropagation();setFill(undefined);setPanel(null);}}
                className={`mb-2 w-full rounded-xl border border-dashed py-2 text-[12px] font-medium text-ink-soft
                  ${!activeFill?"border-accent bg-accent-soft text-accent":"border-line"}`}>
                No fill
              </button>
            )}
            <div className="grid grid-cols-6 gap-2 mb-2">
              {SWATCHES.map(s=>(
                <button key={s}
                  onPointerDown={e=>{e.stopPropagation();
                    panel==="stroke"?setColor(s):setFill(s);
                    setPanel(null);}}
                  style={{backgroundColor:s}}
                  className={`h-10 w-full rounded-xl border-[3px] transition active:scale-90
                    ${(panel==="stroke"?activeColor:activeFill)===s?"border-accent":"border-transparent"}`}/>
              ))}
              <label className="relative h-10 w-full rounded-xl border-2 border-dashed border-line flex items-center justify-center text-ink-faint cursor-pointer">
                <PipetteIcon/>
                <input type="color" value={panel==="stroke"?activeColor:(activeFill??"#ffffff")}
                  onChange={e=>{panel==="stroke"?setColor(e.target.value):setFill(e.target.value);}}
                  className="absolute inset-0 w-0 h-0 opacity-0"/>
              </label>
            </div>
          </MobilePanel>
        )}

        {panel==="size" && (
          <MobilePanel title={`Size · ${activeSize}px`} onClose={()=>setPanel(null)}>
            <input type="range" min={1} max={80} value={activeSize} aria-label="Size"
              onPointerDown={e=>e.stopPropagation()}
              onChange={e=>setSize(Number(e.target.value))} className="mb-3 w-full accent-accent"/>
            <div className="flex gap-2">
              {SIZE_PRESETS.map(s=>(
                <button key={s} onPointerDown={e=>{e.stopPropagation();setSize(s);}}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 transition active:scale-95
                    ${activeSize===s?"border-accent bg-accent-soft":"border-line"}`}>
                  <span className="rounded-full bg-ink" style={{width:Math.min(s*0.4+3,20),height:Math.min(s*0.4+3,20)}}/>
                  <span className="font-mono text-[9px] text-ink-faint">{s}</span>
                </button>
              ))}
            </div>
          </MobilePanel>
        )}

        {panel==="opacity" && (
          <MobilePanel title={`Opacity · ${Math.round(activeOpacity*100)}%`} onClose={()=>setPanel(null)}>
            <input type="range" min={5} max={100} value={Math.round(activeOpacity*100)} aria-label="Opacity"
              onPointerDown={e=>e.stopPropagation()}
              onChange={e=>setOpacity(Number(e.target.value)/100)} className="mb-3 w-full accent-accent"/>
            <div className="flex gap-2">
              {[25,50,75,100].map(v=>(
                <button key={v} onPointerDown={e=>{e.stopPropagation();setOpacity(v/100);}}
                  className={`flex-1 rounded-xl border py-2.5 font-mono text-[11px] transition active:scale-95
                    ${Math.round(activeOpacity*100)===v?"border-accent bg-accent-soft text-accent":"border-line text-ink-faint"}`}>
                  {v}%
                </button>
              ))}
            </div>
          </MobilePanel>
        )}

        {panel==="text" && (
          <MobilePanel title="Text" onClose={()=>setPanel(null)}>
            <div className="flex gap-2 mb-3">
              <button onPointerDown={e=>{e.stopPropagation();setTextSettings({...textSettings,bold:!textSettings.bold});}}
                className={`flex-1 rounded-xl border py-2.5 text-[14px] font-bold active:scale-95 transition
                  ${textSettings.bold?"border-accent bg-accent text-white":"border-line"}`}>B</button>
              <button onPointerDown={e=>{e.stopPropagation();setTextSettings({...textSettings,italic:!textSettings.italic});}}
                className={`flex-1 rounded-xl border py-2.5 text-[14px] italic active:scale-95 transition
                  ${textSettings.italic?"border-accent bg-accent text-white":"border-line"}`}>I</button>
            </div>
            <div className="flex gap-1.5">
              {FONT_SIZES.map(s=>(
                <button key={s} onPointerDown={e=>{e.stopPropagation();setTextSettings({...textSettings,fontSize:s});}}
                  className={`flex-1 rounded-xl border py-2.5 font-mono text-[10px] active:scale-95 transition
                    ${textSettings.fontSize===s?"border-accent bg-accent-soft text-accent":"border-line text-ink-faint"}`}>
                  {s}
                </button>
              ))}
            </div>
          </MobilePanel>
        )}

        {/* Row 1: main tools */}
        <div className="mx-2 mb-1.5 flex items-center gap-1 rounded-2xl border border-line bg-surface px-2 py-1.5"
          style={{boxShadow:"var(--shadow-sm)"}}>

          {/* Brush */}
          <button onPointerDown={e=>{e.stopPropagation();toggle("brush");if(!isBrush(tool))setTool(BRUSHES[0].id);}}
            className={`flex flex-1 items-center gap-2 rounded-xl px-2.5 py-2 active:scale-95 transition
              ${isBrush(tool)?"ring-2 ring-accent bg-accent-soft":""}`}>
            <PenIcon/>
            <span className="text-[12px] font-semibold text-ink truncate">
              {isBrush(tool)?activeBrush.label:"Brush"}
            </span>
            <ChevDownIcon/>
          </button>
          <Vsep/>

          {/* Eraser — SEPARATE */}
          <MobileDockBtn label="Eraser" active={tool==="eraser"}
            onPointerDown={e=>{e.stopPropagation();selectEraser();}}>
            <EraserIcon/>
          </MobileDockBtn>

          {/* Shapes */}
          <MobileDockBtn label={activeShape?.label??"Shape"} active={isShape(tool)}
            onPointerDown={e=>{e.stopPropagation();toggle("shape");if(!isShape(tool))setTool(SHAPES[0].id);}}>
            {activeShape?.icon??<ShapesIcon/>}
          </MobileDockBtn>

          {/* Text */}
          <MobileDockBtn label="Text" active={tool==="text"}
            onPointerDown={e=>{e.stopPropagation();selectText();}}>
            <TextIcon/>
          </MobileDockBtn>
        </div>

        {/* Row 2: style + actions */}
        <div className="mx-2 mb-3 flex items-center gap-1 rounded-2xl border border-line bg-surface px-2 py-1"
          style={{paddingBottom:"calc(0.25rem + env(safe-area-inset-bottom,0px))", boxShadow:"var(--shadow-sm)"}}>

          <MobileDockBtn label="Undo" disabled={!canUndo}
            onPointerDown={e=>{e.stopPropagation();onUndo();}}><UndoIcon/></MobileDockBtn>
          <MobileDockBtn label="Redo" disabled={!canRedo}
            onPointerDown={e=>{e.stopPropagation();onRedo();}}><RedoIcon/></MobileDockBtn>
          <Vsep/>

          {tool!=="eraser" && (
            <button onPointerDown={e=>{e.stopPropagation();toggle("stroke");}}
              className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-90
                ${panel==="stroke"?"ring-2 ring-accent bg-accent-soft":""}`}>
              <span className="h-6 w-6 rounded-full border-2 border-white"
                style={{backgroundColor:activeColor,boxShadow:"0 0 0 1.5px var(--line-strong)"}}/>
              <span className="font-mono text-[7px] text-ink-faint leading-none">stroke</span>
            </button>
          )}

          {isShape(tool) && (
            <button onPointerDown={e=>{e.stopPropagation();toggle("fill");}}
              className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-90
                ${panel==="fill"?"ring-2 ring-accent bg-accent-soft":""}`}>
              <span className="h-6 w-6 rounded-full border-2 border-dashed border-line-strong"
                style={{backgroundColor:activeFill??"transparent"}}/>
              <span className="font-mono text-[7px] text-ink-faint leading-none">fill</span>
            </button>
          )}

          <button onPointerDown={e=>{e.stopPropagation();toggle("size");}}
            className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-90
              ${panel==="size"?"ring-2 ring-accent bg-accent-soft":""}`}>
            <span className="rounded-full bg-ink"
              style={{width:Math.max(5,Math.min(activeSize*0.38,18)),height:Math.max(5,Math.min(activeSize*0.38,18))}}/>
            <span className="font-mono text-[7px] text-ink-faint leading-none">{activeSize}px</span>
          </button>

          {tool!=="eraser" && (
            <button onPointerDown={e=>{e.stopPropagation();toggle("opacity");}}
              className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-90
                ${panel==="opacity"?"ring-2 ring-accent bg-accent-soft":""}`}>
              <span className="h-5 w-5 rounded-full border border-line-strong"
                style={{backgroundColor:activeColor,opacity:activeOpacity}}/>
              <span className="font-mono text-[7px] text-ink-faint leading-none">{Math.round(activeOpacity*100)}%</span>
            </button>
          )}

          <Vsep/>

          <button onPointerDown={e=>{e.stopPropagation();setZoom(Math.min(zoom+0.5,4));}}
            className="flex h-12 w-10 items-center justify-center rounded-xl text-ink-soft active:scale-90">
            <ZoomInIcon/>
          </button>
          <button onPointerDown={e=>{e.stopPropagation();setZoom(Math.max(zoom-0.5,0.25));}}
            className="flex h-12 w-10 items-center justify-center rounded-xl text-ink-soft active:scale-90">
            <ZoomOutIcon/>
          </button>
          <Vsep/>

          <button onPointerDown={e=>{e.stopPropagation();onDownload();}}
            className="flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 active:scale-95 text-ink-soft">
            <DownloadIcon/>
            <span className="font-mono text-[7px] text-ink-faint leading-none">save</span>
          </button>

          <button onPointerDown={e=>{e.stopPropagation();handleClear();}}
            className={`flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 active:scale-95 transition
              ${confirmClear?"bg-danger/10 text-danger ring-2 ring-danger":"text-ink-soft"}`}>
            <TrashIcon/>
            <span className="font-mono text-[7px] text-ink-faint leading-none">{confirmClear?"Sure?":"clear"}</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Color Popover (desktop) ───────────────────────────────────────────────────
function ColorPopover({ panel, strokeColor, fillColor, showFill, onStroke, onFill, onClearFill, onSwitchPanel }:{
  panel: PanelName;
  strokeColor: string; fillColor: string|undefined;
  showFill: boolean;
  onStroke: (c:string)=>void; onFill: (c:string)=>void;
  onClearFill: ()=>void;
  onSwitchPanel: (p:PanelName)=>void;
}) {
  const current = panel==="stroke" ? strokeColor : (fillColor??"#ffffff");
  const pick = (c:string) => { panel==="stroke" ? onStroke(c) : onFill(c); };

  return (
    <Popover>
      {showFill && (
        <div className="mb-2 flex gap-1">
          <button onClick={()=>onSwitchPanel("stroke")}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition
              ${panel==="stroke"?"bg-accent text-white":"bg-surface-2 text-ink-soft hover:text-ink"}`}>Stroke</button>
          <button onClick={()=>onSwitchPanel("fill")}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition
              ${panel==="fill"?"bg-accent text-white":"bg-surface-2 text-ink-soft hover:text-ink"}`}>Fill</button>
        </div>
      )}
      {panel==="fill" && (
        <button onClick={onClearFill}
          className={`mb-2 w-full rounded-lg border border-dashed border-line py-1.5 text-[11px] font-medium text-ink-soft
            hover:border-accent hover:text-accent transition ${!fillColor?"border-accent bg-accent-soft text-accent":""}`}>
          No fill (outline only)
        </button>
      )}
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {SWATCHES.map(s=>(
          <button key={s} onClick={()=>pick(s)} title={s}
            style={{backgroundColor:s}}
            className={`h-8 w-8 rounded-full border-2 transition hover:scale-110 active:scale-95
              ${current===s?"border-accent scale-110":"border-line"}`}/>
        ))}
      </div>
      <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line
        text-[11px] font-medium text-ink-soft hover:border-accent hover:text-accent transition relative">
        <PipetteIcon/> Custom
        <input type="color" value={current} onChange={e=>pick(e.target.value)}
          className="absolute inset-0 h-0 w-0 opacity-0"/>
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1.5">
        <span className="h-4 w-4 rounded-full border border-line-strong" style={{backgroundColor:current}}/>
        <span className="font-mono text-[10px] uppercase text-ink-soft">{current}</span>
      </div>
    </Popover>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function RailBtn({ children, label, hint, active=false, disabled=false, onClick }:{
  children:React.ReactNode; label:string; hint?:string;
  active?:boolean; disabled?:boolean; onClick:()=>void;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} aria-label={label} aria-pressed={active}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition
        ${disabled?"cursor-not-allowed opacity-30 text-ink-faint"
          :active?"bg-accent text-white shadow-sm"
          :"text-ink-soft hover:bg-surface-2 hover:text-ink"}`}>
      {children}

      <Tip label={label} hint={hint}/>
    </button>
  );
}

function SwatchBtn({ color, label, active, dashed, onClick }:{
  color:string|undefined; label:string; active:boolean; dashed?:boolean; onClick:()=>void;
}) {
  return (
    <button onClick={onClick} title={label} aria-label={label} aria-pressed={active}
      className={`group relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition
        ${active?"ring-2 ring-accent bg-accent-soft":"hover:bg-surface-2"}`}>
      <span className={`h-5 w-5 rounded-full border-2 ${dashed?"border-dashed border-line-strong":"border-white"}`}
        style={{backgroundColor:color??"transparent",
          ...(dashed?{}:{boxShadow:"0 0 0 1.5px var(--line-strong)"})}}/>
      <span className="font-mono text-[7px] leading-none text-ink-faint">{label.toLowerCase()}</span>
      <Tip label={label}/>
    </button>
  );
}

function SizeBtn({ size, active, onClick }:{size:number; active:boolean; onClick:()=>void;}) {
  return (
    <button onClick={onClick} title="Size" aria-label="Size" aria-pressed={active}
      className={`group relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition
        ${active?"ring-2 ring-accent bg-accent-soft":"hover:bg-surface-2"}`}>
      <span className="rounded-full bg-ink"
        style={{width:Math.max(4,Math.min(size*0.45,18)),height:Math.max(4,Math.min(size*0.45,18))}}/>
      <span className="font-mono text-[7px] leading-none text-ink-faint">{size}px</span>
      <Tip label="Size"/>
    </button>
  );
}

function OpacityBtn({ opacity, color, active, onClick }:{opacity:number; color:string; active:boolean; onClick:()=>void;}) {
  return (
    <button onClick={onClick} title="Opacity" aria-label="Opacity" aria-pressed={active}
      className={`group relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition
        ${active?"ring-2 ring-accent bg-accent-soft":"hover:bg-surface-2"}`}>
      <span className="h-5 w-5 rounded-full border border-line-strong"
        style={{backgroundColor:color,opacity}}/>
      <span className="font-mono text-[7px] leading-none text-ink-faint">{Math.round(opacity*100)}%</span>
      <Tip label="Opacity"/>
    </button>
  );
}

function MobileToolBtn({ children, label, active, onClick }:{
  children:React.ReactNode; label:string; active:boolean; onClick:()=>void;
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 active:scale-95 transition
        ${active?"bg-accent text-white":"bg-surface-2 text-ink"}`}>
      {children}
      <span className="text-[11px] font-semibold leading-tight">{label}</span>
    </button>
  );
}

function MobileDockBtn({ children, label, active=false, disabled=false, onPointerDown }:{
  children:React.ReactNode; label:string; active?:boolean; disabled?:boolean;
  onPointerDown:(e:React.PointerEvent)=>void;
}) {
  return (
    <button onPointerDown={onPointerDown} disabled={disabled} aria-label={label}
      className={`flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 active:scale-90 transition
        ${disabled?"opacity-30 cursor-not-allowed text-ink-faint"
          :active?"ring-2 ring-accent bg-accent-soft text-accent"
          :"text-ink-soft"}`}>
      {children}
      <span className={`font-mono text-[7px] leading-none ${active?"text-accent":"text-ink-faint"}`}>{label}</span>
    </button>
  );
}

function Popover({ children }:{ children:React.ReactNode }) {
  return (
    <div className="animate-pop-in absolute left-[calc(100%+10px)] top-0 w-56 rounded-2xl border border-line bg-surface p-3"
      style={{boxShadow:"var(--shadow-lg)"}}>
      {children}
    </div>
  );
}

function MobilePanel({ title, onClose, children }:{ title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div className="mx-2 mb-2 rounded-2xl border border-line bg-surface p-3 animate-slide-up"
      style={{boxShadow:"var(--shadow-lg)"}}>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{title}</p>
        <button onPointerDown={e=>{e.stopPropagation();onClose();}}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint hover:text-ink text-[14px]">✕</button>
      </div>
      {children}
    </div>
  );
}

function PanelTitle({ children }:{ children:React.ReactNode }) {
  return <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-ink-faint">{children}</p>;
}

function Tip({ label, hint }:{ label:string; hint?:string }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 hidden -translate-y-1/2
      whitespace-nowrap rounded-xl border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-ink shadow-lg
      group-hover:block">
      {label}
      {hint&&<span className="ml-2 font-mono text-[10px] text-ink-faint">{hint}</span>}
    </span>
  );
}

function Divider() { return <span className="my-1 h-px w-8 shrink-0 rounded-full bg-line"/>; }
function Vsep()    { return <span className="mx-0.5 h-8 w-px shrink-0 rounded-full bg-line"/>; }

// ─── Icons ─────────────────────────────────────────────────────────────────────
const Ic = ({ children, w=16, h=16 }:{ children:React.ReactNode; w?:number; h?:number }) => (
  <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
function PenIcon()         { return <Ic><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></Ic>; }
function BrushActiveIcon() { return <Ic><path d="M3 17c3-3 6-5 9-5s5 2 5 5-2 3-5 3-5-3-5-3"/><path d="M9 5l6 6"/><path d="M13 3l8 8-3 3-8-8 3-3z"/></Ic>; }
function EraserIcon()      { return <Ic><path d="M20 20H7L3.5 16.5a2 2 0 0 1 0-2.83l8.17-8.17a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83L13.5 20"/><path d="M7 20l-4-4"/></Ic>; }
function ShapesIcon()      { return <Ic><rect x="3" y="3" width="8" height="8" rx="1"/><circle cx="17" cy="7" r="4"/><path d="M3 21l5-10 5 10"/><path d="M14 21h8"/></Ic>; }
function TextIcon()        { return <Ic><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></Ic>; }
function LineIcon()        { return <Ic><path d="M5 19L19 5"/></Ic>; }
function ArrowIcon()       { return <Ic><path d="M5 19L19 5"/><path d="M19 5h-6M19 5v6"/></Ic>; }
function RectIcon()        { return <Ic><rect x="3" y="3" width="18" height="18" rx="0"/></Ic>; }
function RoundedRectIcon() { return <Ic><rect x="3" y="3" width="18" height="18" rx="5"/></Ic>; }
function EllipseIcon()     { return <Ic><ellipse cx="12" cy="12" rx="10" ry="6"/></Ic>; }
function TriangleIcon()    { return <Ic><path d="M12 3L21 21H3z"/></Ic>; }
function DiamondIcon()     { return <Ic><path d="M12 2l10 10-10 10L2 12z"/></Ic>; }
function UndoIcon()        { return <Ic><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></Ic>; }
function RedoIcon()        { return <Ic><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></Ic>; }
function TrashIcon()       { return <Ic><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></Ic>; }
function DownloadIcon()    { return <Ic><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Ic>; }
function PipetteIcon()     { return <Ic><path d="M2 22l4-4"/><path d="M14 4l6 6-9 9-6-6 9-9z"/><path d="M5 11l3 3"/></Ic>; }
function ZoomInIcon()      { return <Ic><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></Ic>; }
function ZoomOutIcon()     { return <Ic><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></Ic>; }
function ChevLeftIcon()    { return <Ic><path d="M15 18l-6-6 6-6"/></Ic>; }
function ChevRightIcon()   { return <Ic><path d="M9 18l6-6-6-6"/></Ic>; }
function ChevDownIcon()    { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto shrink-0 text-ink-faint"><path d="M6 9l6 6 6-6"/></svg>; }
function CheckIcon()       { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>; }
