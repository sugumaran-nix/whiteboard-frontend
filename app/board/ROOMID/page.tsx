"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Canvas, { type CanvasHandle, VIRTUAL_W, VIRTUAL_H } from "@/components/Canvas";
import Toolbar from "@/components/Toolbar";
import PresenceBar from "@/components/PresenceBar";
import CursorLayer from "@/components/CursorLayer";
import NameModal from "@/components/NameModal";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import Toast from "@/components/Toast";
import { rememberBoard } from "@/lib/recent";
import { wsUrlForRoom } from "@/lib/config";
import type {
  ClientMessage, CursorState, EraserSettings,
  PenSettings, Point, RemoteUser, ServerMessage,
  ShapeSettings, Stroke, TextSettings, Tool,
} from "@/lib/types";

const RECONNECT_DELAYS = [500, 1000, 2000, 4000, 8000];
const CURSOR_STALE_MS  = 4000;
const MAX_UNDO  = 64;
const NAVBAR_H  = 56;
const NAME_KEY  = "sketchline-name";

function getSavedName() { try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; } }
function saveName(n: string) { try { localStorage.setItem(NAME_KEY, n); } catch {} }

const DEFAULT_PEN:    PenSettings    = { color: "#2454FF", width: 6,  opacity: 1 };
const DEFAULT_ERASER: EraserSettings = { width: 24 };
const DEFAULT_SHAPE:  ShapeSettings  = { color: "#2454FF", fillColor: undefined, width: 4, opacity: 1 };
const DEFAULT_TEXT:   TextSettings   = { color: "#2454FF", fontSize: 32, bold: false, italic: false, opacity: 1 };

const SHAPE_TOOL_SET = new Set(["line","arrow","rect","rect-rounded","ellipse","triangle","diamond"]);

export default function BoardPage() {
  const { roomId } = useParams<{ roomId: string }>();

  const [name,      setName]      = useState(() => getSavedName());
  const [hasJoined, setHasJoined] = useState(() => !!getSavedName());

  const [tool, setTool] = useState<Tool>("pen");

  const [penSettings,    setPenSettings]    = useState<PenSettings>(DEFAULT_PEN);
  const [eraserSettings, setEraserSettings] = useState<EraserSettings>(DEFAULT_ERASER);
  const [shapeSettings,  setShapeSettings]  = useState<ShapeSettings>(DEFAULT_SHAPE);
  const [textSettings,   setTextSettings]   = useState<TextSettings>(DEFAULT_TEXT);

  const [shiftHeld, setShiftHeld] = useState(false);

  const [zoom,      setZoom]      = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selfId,     setSelfId]     = useState("");
  const [selfColor,  setSelfColor]  = useState("#2454FF");
  const [users,      setUsers]      = useState<RemoteUser[]>([]);
  const [userCount,  setUserCount]  = useState(1);
  const [cursors,    setCursors]    = useState<Record<string, CursorState>>({});
  const [connStatus, setConnStatus] = useState<"connecting"|"open"|"closed">("connecting");

  const [showHelp,      setShowHelp]      = useState(false);
  const [toast,         setToast]         = useState<string|null>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);

  const [textInput, setTextInput] = useState<{ point: Point; value: string }|null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (textInput) textareaRef.current?.focus(); }, [textInput]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(m => m === msg ? null : m), 1800);
  }, []);

  const undoStackRef = useRef<Stroke[]>([]);
  const redoStackRef = useRef<Stroke[]>([]);
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);

  const canvasRef = useRef<CanvasHandle|null>(null);
  const wsRef     = useRef<WebSocket|null>(null);
  const retryRef  = useRef(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const deadRef   = useRef(false);
  const nameRef   = useRef(name);
  useEffect(() => { nameRef.current = name; }, [name]);

  useEffect(() => { if (roomId) rememberBoard(roomId); }, [roomId]);

  const send = useCallback((msg: ClientMessage | { type: "pong" }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
  }, []);

  const handleMsg = useCallback((msg: ServerMessage | { type: "ping" }) => {
    if (msg.type === "ping") { send({ type: "pong" }); return; }
    switch (msg.type) {
      case "init":
        setSelfId(msg.clientId); setSelfColor(msg.color);
        setUsers(msg.users); setUserCount(msg.userCount);
        canvasRef.current?.redrawAll(msg.strokes); break;
      case "user_joined": setUsers(p => [...p.filter(u => u.id !== msg.user.id), msg.user]); break;
      case "user_left":
        setUsers(p => p.filter(u => u.id !== msg.id));
        setCursors(p => { const n = { ...p }; delete n[msg.id]; return n; }); break;
      case "user_renamed": setUsers(p => p.map(u => u.id === msg.id ? { ...u, name: msg.name } : u)); break;
      case "user_count": setUserCount(msg.count); break;
      case "stroke_start":
        canvasRef.current?.applyRemoteStrokeStart({
          strokeId: msg.strokeId, color: msg.color, fillColor: msg.fillColor,
          width: msg.width, opacity: msg.opacity, tool: msg.tool,
          points: [msg.point], authorId: msg.id, textData: msg.textData,
        }); break;
      case "stroke_point": canvasRef.current?.applyRemoteStrokePoint(msg.strokeId, msg.point); break;
      case "stroke_end":   canvasRef.current?.applyRemoteStrokeEnd(msg.strokeId, msg.shapeEnd); break;
      case "clear": canvasRef.current?.clearCanvas(); flash("Board cleared"); break;
      case "cursor":
        setCursors(p => ({ ...p, [msg.id]: { id: msg.id, x: msg.x, y: msg.y, name: msg.name, color: msg.color, lastSeen: Date.now() } })); break;
      case "undo": canvasRef.current?.removeStroke(msg.strokeId); break;
      case "redo": canvasRef.current?.addStroke(msg.stroke); break;
    }
  }, [send, flash]);

  useEffect(() => {
    if (!hasJoined || !roomId) return;
    deadRef.current = false;
    const connect = () => {
      if (deadRef.current) return;
      setConnStatus("connecting");
      const ws = new WebSocket(wsUrlForRoom(roomId, nameRef.current));
      wsRef.current = ws;
      ws.onopen    = () => { retryRef.current = 0; setConnStatus("open"); };
      ws.onmessage = e => { try { handleMsg(JSON.parse(e.data)); } catch {} };
      ws.onclose   = () => {
        setConnStatus("closed");
        if (deadRef.current) return;
        timerRef.current = setTimeout(connect, RECONNECT_DELAYS[Math.min(retryRef.current++, RECONNECT_DELAYS.length - 1)]);
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => { deadRef.current = true; if (timerRef.current) clearTimeout(timerRef.current); wsRef.current?.close(); };
  }, [hasJoined, roomId, handleMsg]);

  // Stale cursor cleanup
  useEffect(() => {
    const t = setInterval(() => setCursors(p => {
      const now = Date.now(), n: Record<string, CursorState> = {};
      for (const [id, c] of Object.entries(p)) if (now - c.lastSeen < CURSOR_STALE_MS) n[id] = c;
      return n;
    }), 1500);
    return () => clearInterval(t);
  }, []);

  // Pinch-zoom from canvas
  useEffect(() => {
    const handler = (e: Event) => {
      const { zoom: newZoom } = (e as CustomEvent).detail;
      setZoom(newZoom);
    };
    window.addEventListener("canvas-pinch-zoom", handler);
    return () => window.removeEventListener("canvas-pinch-zoom", handler);
  }, []);

  const handleUndo = useCallback(() => {
    const s = undoStackRef.current.pop(); if (!s) return;
    redoStackRef.current.push(s);
    setUndoLen(undoStackRef.current.length); setRedoLen(redoStackRef.current.length);
    canvasRef.current?.removeStroke(s.strokeId);
    send({ type: "undo", strokeId: s.strokeId });
  }, [send]);

  const handleRedo = useCallback(() => {
    const s = redoStackRef.current.pop(); if (!s) return;
    undoStackRef.current.push(s);
    setUndoLen(undoStackRef.current.length); setRedoLen(redoStackRef.current.length);
    canvasRef.current?.addStroke(s);
    send({ type: "redo", stroke: s });
  }, [send]);

  const handleClear = useCallback(() => {
    canvasRef.current?.clearCanvas();
    send({ type: "clear" });
    undoStackRef.current = []; redoStackRef.current = [];
    setUndoLen(0); setRedoLen(0);
    flash("Board cleared");
  }, [send, flash]);

  const handleDownload = useCallback(() => {
    canvasRef.current?.downloadPNG(`sketchline-${roomId}.png`);
    flash("Board saved as PNG");
  }, [roomId, flash]);

  // Shift key
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftHeld(false); };
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const TOOL_KEYS: Record<string, Tool> = {
      "1":"pen","2":"pencil","3":"marker","4":"highlighter",
      "5":"calligraphy","6":"crayon","7":"oil","8":"watercolour","9":"spray",
    };
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement|null;
      const typing = tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable);
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl) {
        if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); return; }
        if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) { e.preventDefault(); handleRedo(); return; }
        if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(z => Math.min(z + 0.25, 4)); return; }
        if (e.key === "-") { e.preventDefault(); setZoom(z => Math.max(z - 0.25, 0.25)); return; }
        if (e.key === "0") { e.preventDefault(); setZoom(1); return; }
        if (e.key.toLowerCase() === "s") { e.preventDefault(); handleDownload(); return; }
        return;
      }

      if (typing || !hasJoined) return;
      if (e.key === "Escape") { setShowHelp(false); setTextInput(null); return; }
      if (e.key === "?")      { e.preventDefault(); setShowHelp(v => !v); return; }
      if (TOOL_KEYS[e.key])   { setTool(TOOL_KEYS[e.key]); return; }
      if (e.key.toLowerCase() === "e") { setTool("eraser"); return; }
      if (e.key.toLowerCase() === "t") { setTool("text"); return; }
      if (e.key === "[") {
        if (tool === "eraser") setEraserSettings(s => ({ ...s, width: Math.max(2, s.width - 2) }));
        else setPenSettings(s => ({ ...s, width: Math.max(1, s.width - 2) }));
        return;
      }
      if (e.key === "]") {
        if (tool === "eraser") setEraserSettings(s => ({ ...s, width: Math.min(80, s.width + 2) }));
        else setPenSettings(s => ({ ...s, width: Math.min(80, s.width + 2) }));
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasJoined, handleUndo, handleRedo, handleDownload, tool]);

  // Ctrl+wheel zoom
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z => Math.min(4, Math.max(0.25, z - e.deltaY * 0.001)));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleJoin = (chosen: string) => {
    const n = chosen || "Guest";
    setName(n); nameRef.current = n; saveName(n); setHasJoined(true);
  };

  const handleTextPlace = useCallback((point: Point) => {
    setTextInput({ point, value: "" });
  }, []);

  const commitText = useCallback(() => {
    if (!textInput || !textInput.value.trim()) { setTextInput(null); return; }
    const strokeId = crypto.randomUUID();
    const normW = textSettings.fontSize / 900;
    const td = { text: textInput.value, fontSize: textSettings.fontSize, bold: textSettings.bold, italic: textSettings.italic };
    const stroke: Stroke = {
      strokeId, color: textSettings.color, width: normW, opacity: textSettings.opacity,
      tool: "text", points: [textInput.point], textData: td,
    };
    undoStackRef.current = [...undoStackRef.current, stroke].slice(-MAX_UNDO);
    setUndoLen(undoStackRef.current.length);
    canvasRef.current?.addStroke(stroke);
    send({ type: "stroke_start", strokeId, color: textSettings.color, width: normW, opacity: textSettings.opacity, tool: "text", point: textInput.point, textData: td });
    send({ type: "stroke_end", strokeId });
    setTextInput(null);
    flash("Text placed");
  }, [textInput, textSettings, send, flash]);

  // Derive canvas props from active tool
  const isShapeTool = SHAPE_TOOL_SET.has(tool);
  const canvasColor   = isShapeTool ? shapeSettings.color    : penSettings.color;
  const canvasFill    = isShapeTool ? shapeSettings.fillColor : undefined;
  const canvasWidth   = tool === "eraser" ? eraserSettings.width : isShapeTool ? shapeSettings.width : penSettings.width;
  const canvasOpacity = isShapeTool ? shapeSettings.opacity : penSettings.opacity;

  // Text overlay position
  const getTextStyle = (): React.CSSProperties => {
    if (!textInput || !scrollRef.current) return { display: "none" };
    const scroll = scrollRef.current;
    const railOffset = railCollapsed ? 52 : 60;
    return {
      position: "fixed",
      left: textInput.point.x * VIRTUAL_W * zoom - scroll.scrollLeft + railOffset,
      top:  textInput.point.y * VIRTUAL_H * zoom - scroll.scrollTop  + NAVBAR_H,
      minWidth: 160, zIndex: 60,
    };
  };

  return (
    <div className="h-dvh w-full overflow-hidden bg-paper">
      {!hasJoined && <NameModal roomId={roomId} defaultName={name || "Guest"} onJoin={handleJoin}/>}
      {showHelp    && <ShortcutsHelp onClose={() => setShowHelp(false)}/>}

      <PresenceBar
        roomId={roomId}
        users={users.filter(u => u.id !== selfId)}
        selfName={name || "Guest"}
        selfColor={selfColor}
        userCount={userCount}
        connectionStatus={connStatus}
        onCopied={() => flash("Board link copied")}
        onShowShortcuts={() => setShowHelp(true)}
      />

      {/* Scrollable canvas area */}
      <div ref={scrollRef}
        className="absolute inset-x-0 bottom-0 overflow-auto"
        style={{ top: `${NAVBAR_H}px`, paddingBottom: "134px" }}>
        <div style={{ width: VIRTUAL_W * zoom, height: VIRTUAL_H * zoom, position: "relative" }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: VIRTUAL_W, height: VIRTUAL_H }}>
            <Canvas
              ref={canvasRef}
              tool={tool}
              color={canvasColor}
              fillColor={canvasFill}
              width={canvasWidth}
              opacity={canvasOpacity}
              shiftConstrain={shiftHeld}
              disabled={!hasJoined}
              zoom={zoom}
              onTextPlace={handleTextPlace}
              onStrokeStart={s => {
                redoStackRef.current = []; setRedoLen(0);
                send({ type: "stroke_start", ...s });
              }}
              onStrokePoint={(strokeId, point) => send({ type: "stroke_point", strokeId, point })}
              onStrokeEnd={(strokeId, stroke, shapeEnd) => {
                undoStackRef.current = [...undoStackRef.current, stroke].slice(-MAX_UNDO);
                setUndoLen(undoStackRef.current.length);
                send({ type: "stroke_end", strokeId, ...(shapeEnd ? { shapeEnd } : {}) });
              }}
              onCursorMove={(p: Point) => send({ type: "cursor", x: p.x, y: p.y })}
            />
          </div>
        </div>
        <CursorLayer cursors={Object.values(cursors)}/>
      </div>

      {/* Text input overlay */}
      {textInput && (
        <div style={getTextStyle()}>
          <textarea
            ref={textareaRef}
            value={textInput.value}
            onChange={e => setTextInput(t => t ? { ...t, value: e.target.value } : null)}
            onKeyDown={e => {
              if (e.key === "Escape") { e.preventDefault(); setTextInput(null); }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); }
            }}
            placeholder="Type… Enter to place, Shift+Enter for newline"
            style={{
              font: `${textSettings.italic ? "italic " : ""}${textSettings.bold ? "bold " : ""}${textSettings.fontSize}px sans-serif`,
              color: textSettings.color,
              background: "var(--surface)",
              border: "2px solid var(--accent)",
              borderRadius: 8, padding: "6px 8px", outline: "none",
              minWidth: 200, resize: "both", lineHeight: 1.3,
            }}
          />
          <div className="mt-1 flex gap-1">
            <button onClick={commitText}
              className="rounded-lg bg-accent px-3 py-1 text-[12px] font-semibold text-white">Place</button>
            <button onClick={() => setTextInput(null)}
              className="rounded-lg border border-line px-3 py-1 text-[12px] text-ink-soft">Cancel</button>
          </div>
        </div>
      )}

      {/* Connection status banner */}
      {connStatus !== "open" && (
        <div role="status"
          className="fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 font-mono text-xs"
          style={{ top: `${NAVBAR_H + 12}px`, boxShadow: "var(--shadow-md)" }}>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: connStatus === "closed" ? "var(--danger)" : "var(--amber)" }}/>
          <span className={connStatus === "closed" ? "text-danger" : "text-ink-soft"}>
            {connStatus === "closed" ? "Reconnecting…" : "Connecting…"}
          </span>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="fixed bottom-4 right-3 z-30 hidden rounded-xl border border-line bg-surface px-2.5 py-1.5 font-mono text-[11px] text-ink-faint sm:block"
        style={{ boxShadow: "var(--shadow-sm)" }}>
        {Math.round(zoom * 100)}%
      </div>

      {/* Download button (desktop, bottom-right) */}
      <button onClick={handleDownload} title="Download as PNG (Ctrl+S)"
        className="fixed bottom-4 right-16 z-30 hidden items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-soft transition hover:border-accent hover:text-accent sm:flex"
        style={{ boxShadow: "var(--shadow-sm)" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        PNG
      </button>

      {/* Hint bar */}
      {hasJoined && userCount === 1 && (
        <p className="pointer-events-none fixed bottom-4 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-surface/80 px-4 py-2 font-mono text-[11px] text-ink-faint backdrop-blur-sm sm:block">
          Draw on the canvas — hold{" "}
          <kbd className="mx-0.5 rounded border border-line bg-surface px-1 font-mono text-[10px]">Shift</kbd> to snap ·{" "}
          <kbd className="mx-0.5 rounded border border-line bg-surface px-1 font-mono text-[10px]">Ctrl ±</kbd> to zoom ·{" "}
          <kbd className="mx-0.5 rounded border border-line bg-surface px-1 font-mono text-[10px]">?</kbd> for shortcuts
        </p>
      )}

      <Toolbar
        tool={tool} setTool={setTool}
        penSettings={penSettings}       setPenSettings={setPenSettings}
        eraserSettings={eraserSettings} setEraserSettings={setEraserSettings}
        shapeSettings={shapeSettings}   setShapeSettings={setShapeSettings}
        textSettings={textSettings}     setTextSettings={setTextSettings}
        zoom={zoom} setZoom={setZoom}
        onClear={handleClear}
        onUndo={handleUndo} onRedo={handleRedo}
        canUndo={undoLen > 0} canRedo={redoLen > 0}
        onDownload={handleDownload}
        collapsed={railCollapsed} onToggleCollapse={() => setRailCollapsed(v => !v)}
      />

      <Toast message={toast}/>
    </div>
  );
}
