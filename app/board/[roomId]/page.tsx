"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Canvas, { type CanvasHandle } from "@/components/Canvas";
import Toolbar from "@/components/Toolbar";
import PresenceBar from "@/components/PresenceBar";
import CursorLayer from "@/components/CursorLayer";
import NameModal from "@/components/NameModal";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import Toast from "@/components/Toast";
import { rememberBoard } from "@/lib/recent";
import { wsUrlForRoom } from "@/lib/config";
import type { ClientMessage, CursorState, Point, RemoteUser, ServerMessage, Stroke, Tool } from "@/lib/types";

const RECONNECT_DELAYS = [500, 1000, 2000, 4000, 8000];
const CURSOR_STALE_MS  = 4000;
const MAX_UNDO         = 64;
const NAVBAR_H         = 56; // px — matches PresenceBar h-14

export default function BoardPage() {
  const { roomId } = useParams<{ roomId: string }>();

  const [hasJoined,  setHasJoined]  = useState(false);
  const [name,       setName]       = useState("");
  const [tool,       setTool]       = useState<Tool>("pen");
  const [color,      setColor]      = useState("#2454FF");
  const [brushWidth, setBrushWidth] = useState(6);
  const [selfId,     setSelfId]     = useState("");
  const [selfColor,  setSelfColor]  = useState("#2454FF");
  const [users,      setUsers]      = useState<RemoteUser[]>([]);
  const [userCount,  setUserCount]  = useState(1);
  const [cursors,    setCursors]    = useState<Record<string, CursorState>>({});
  const [connStatus, setConnStatus] = useState<"connecting"|"open"|"closed">("connecting");
  const [showHelp,   setShowHelp]   = useState(false);
  const [toast,      setToast]      = useState<string | null>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(m => m === msg ? null : m), 1800);
  }, []);

  const undoStackRef = useRef<Stroke[]>([]);
  const redoStackRef = useRef<Stroke[]>([]);
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);

  const canvasRef = useRef<CanvasHandle | null>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const retryRef  = useRef(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadRef   = useRef(false);
  const nameRef   = useRef(name);
  useEffect(() => { nameRef.current = name; }, [name]);

  useEffect(() => {
    try { const s = localStorage.getItem("sketchline-name"); if (s) setName(s); } catch {}
  }, []);

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
      case "user_joined":
        setUsers(p => [...p.filter(u => u.id !== msg.user.id), msg.user]); break;
      case "user_left":
        setUsers(p => p.filter(u => u.id !== msg.id));
        setCursors(p => { const n = { ...p }; delete n[msg.id]; return n; }); break;
      case "user_renamed":
        setUsers(p => p.map(u => u.id === msg.id ? { ...u, name: msg.name } : u)); break;
      case "user_count": setUserCount(msg.count); break;
      case "stroke_start":
        canvasRef.current?.applyRemoteStrokeStart({ strokeId: msg.strokeId, color: msg.color, width: msg.width, tool: msg.tool, points: [msg.point], authorId: msg.id }); break;
      case "stroke_point":
        canvasRef.current?.applyRemoteStrokePoint(msg.strokeId, msg.point); break;
      case "stroke_end":
        canvasRef.current?.applyRemoteStrokeEnd(msg.strokeId); break;
      case "clear":
        canvasRef.current?.clearCanvas(); flash("Board cleared"); break;
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
      ws.onopen  = () => { retryRef.current = 0; setConnStatus("open"); };
      ws.onmessage = e => { try { handleMsg(JSON.parse(e.data)); } catch {} };
      ws.onclose = () => {
        setConnStatus("closed");
        if (deadRef.current) return;
        const delay = RECONNECT_DELAYS[Math.min(retryRef.current++, RECONNECT_DELAYS.length - 1)];
        timerRef.current = setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => {
      deadRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [hasJoined, roomId, handleMsg]);

  useEffect(() => {
    const t = setInterval(() => {
      setCursors(p => {
        const now = Date.now(), n: Record<string, CursorState> = {};
        for (const [id, c] of Object.entries(p)) if (now - c.lastSeen < CURSOR_STALE_MS) n[id] = c;
        return n;
      });
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const handleUndo = useCallback(() => {
    const s = undoStackRef.current.pop(); if (!s) return;
    redoStackRef.current.push(s);
    setUndoLen(undoStackRef.current.length);
    setRedoLen(redoStackRef.current.length);
    canvasRef.current?.removeStroke(s.strokeId);
    send({ type: "undo", strokeId: s.strokeId });
  }, [send]);

  const handleRedo = useCallback(() => {
    const s = redoStackRef.current.pop(); if (!s) return;
    undoStackRef.current.push(s);
    setUndoLen(undoStackRef.current.length);
    setRedoLen(redoStackRef.current.length);
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

  useEffect(() => {
    const TOOL_KEYS: Record<string, Tool> = { "1": "pen", "2": "pencil", "3": "marker", "4": "calligraphy", "5": "crayon", "6": "oil", "7": "watercolour", "8": "spray" };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl) {
        if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
        if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) { e.preventDefault(); handleRedo(); }
        return;
      }
      if (typing || !hasJoined) return;
      if (e.key === "Escape") { setShowHelp(false); return; }
      if (e.key === "?") { e.preventDefault(); setShowHelp(v => !v); return; }
      if (TOOL_KEYS[e.key]) { setTool(TOOL_KEYS[e.key]); return; }
      if (e.key.toLowerCase() === "e") { setTool("eraser"); return; }
      if (e.key === "[") { setBrushWidth(w => Math.max(1, w - 2)); return; }
      if (e.key === "]") { setBrushWidth(w => Math.min(60, w + 2)); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasJoined, handleUndo, handleRedo]);

  const handleJoin = (chosen: string) => {
    setName(chosen); nameRef.current = chosen;
    try { localStorage.setItem("sketchline-name", chosen); } catch {}
    setHasJoined(true);
  };

  return (
    /* Full screen — navbar is fixed so canvas fills remaining height */
    <div className="h-dvh w-full overflow-hidden bg-[var(--paper)]">

      {!hasJoined && <NameModal roomId={roomId} defaultName={name || "Guest"} onJoin={handleJoin} />}
      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}

      {/* Fixed navbar — always visible, never hides */}
      <PresenceBar
        roomId={roomId}
        users={users.filter(u => u.id !== selfId)}
        selfName={name || "You"}
        selfColor={selfColor}
        userCount={userCount}
        connectionStatus={connStatus}
        onCopied={() => flash("Board link copied")}
        onShowShortcuts={() => setShowHelp(true)}
      />

      {/* Canvas area — offset by navbar height, fills rest */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ top: `${NAVBAR_H}px` }}
      >
        {/* Mobile: leave space for bottom dock (approx 130px) */}
        <div className="absolute inset-0 sm:bottom-0 bottom-[130px]">
          <Canvas
            ref={canvasRef}
            tool={tool}
            color={color}
            width={brushWidth}
            disabled={!hasJoined}
            onStrokeStart={s => {
              redoStackRef.current = []; setRedoLen(0);
              send({ type: "stroke_start", ...s });
            }}
            onStrokePoint={(strokeId, point) => send({ type: "stroke_point", strokeId, point })}
            onStrokeEnd={(strokeId, stroke) => {
              undoStackRef.current = [...undoStackRef.current, stroke].slice(-MAX_UNDO);
              setUndoLen(undoStackRef.current.length);
              send({ type: "stroke_end", strokeId });
            }}
            onCursorMove={(p: Point) => send({ type: "cursor", x: p.x, y: p.y })}
          />
        </div>

        <CursorLayer cursors={Object.values(cursors)} />

        {/* Reconnect banner */}
        {connStatus !== "open" && (
          <div
            role="status"
            className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-1.5 font-mono text-xs"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-cursor-blink"
              style={{ backgroundColor: connStatus === "closed" ? "var(--danger)" : "var(--amber)" }}
            />
            <span className={connStatus === "closed" ? "text-[var(--danger)]" : "text-ink-soft"}>
              {connStatus === "closed" ? "Reconnecting…" : "Connecting…"}
            </span>
          </div>
        )}

        {/* Hint — visible only when alone and canvas is fresh */}
        {hasJoined && userCount === 1 && (
          <p className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-[var(--line)] bg-[var(--surface)]/80 px-4 py-2 font-mono text-[11px] text-ink-faint backdrop-blur-sm sm:block">
            Start drawing — press <kbd className="mx-0.5 rounded border border-[var(--line)] bg-[var(--surface)] px-1 font-mono text-[10px]">?</kbd> for shortcuts
          </p>
        )}
      </div>

      {/* Toolbar — fixed, starts below navbar */}
      <Toolbar
        tool={tool} setTool={setTool}
        color={color} setColor={setColor}
        brushWidth={brushWidth} setBrushWidth={setBrushWidth}
        onClear={handleClear}
        onUndo={handleUndo} onRedo={handleRedo}
        canUndo={undoLen > 0} canRedo={redoLen > 0}
        collapsed={railCollapsed}
        onToggleCollapse={() => setRailCollapsed(v => !v)}
      />

      <Toast message={toast} />
    </div>
  );
}
