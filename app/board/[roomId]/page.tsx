"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Canvas, { type CanvasHandle } from "@/components/Canvas";
import Toolbar from "@/components/Toolbar";
import PresenceBar from "@/components/PresenceBar";
import CursorLayer from "@/components/CursorLayer";
import ThemeToggle from "@/components/ThemeToggle";
import NameModal from "@/components/NameModal";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import Toast from "@/components/Toast";
import { rememberBoard } from "@/lib/recent";
import { wsUrlForRoom } from "@/lib/config";
import type {
  ClientMessage, CursorState, Point, RemoteUser,
  ServerMessage, Stroke, Tool,
} from "@/lib/types";

const RECONNECT_DELAYS = [500, 1000, 2000, 4000, 8000];
const CURSOR_STALE_MS  = 4000;
const MAX_UNDO         = 64;

export default function BoardPage() {
  const { roomId } = useParams<{ roomId: string }>();

  const [hasJoined, setHasJoined]   = useState(false);
  const [name, setName]             = useState("");
  const [tool, setTool]             = useState<Tool>("pen");
  const [color, setColor]           = useState("#2454FF");
  const [brushWidth, setBrushWidth] = useState(6);

  const [selfId, setSelfId]         = useState("");
  const [selfColor, setSelfColor]   = useState("#2454FF");
  const [users, setUsers]           = useState<RemoteUser[]>([]);
  const [userCount, setUserCount]   = useState(1);
  const [cursors, setCursors]       = useState<Record<string, CursorState>>({});
  const [connStatus, setConnStatus] = useState<"connecting"|"open"|"closed">("connecting");
  const [showHelp, setShowHelp]     = useState(false);
  const [toast, setToast]           = useState<string | null>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide header after 2.5s of no pointer movement / activity (desktop only).
  // Any mouse move, click, or key press brings it back immediately.
  useEffect(() => {
    const wake = () => {
      setHeaderHidden(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setHeaderHidden(true), 2500);
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    window.addEventListener("pointerdown", wake);
    return () => {
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("pointerdown", wake);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((m) => (m === message ? null : m)), 1800);
  }, []);

  // Undo / redo stacks (own strokes only)
  const undoStackRef = useRef<Stroke[]>([]);
  const redoStackRef = useRef<Stroke[]>([]);
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);

  const canvasRef = useRef<CanvasHandle | null>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const retryRef  = useRef(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadRef   = useRef(false);
  const nameRef   = useRef(name); // keep a ref so the ws closure always has latest name
  useEffect(() => { nameRef.current = name; }, [name]);

  useEffect(() => {
    try { const s = localStorage.getItem("sketchline-name"); if (s) setName(s); } catch {}
  }, []);

  useEffect(() => { if (roomId) rememberBoard(roomId); }, [roomId]);

  // ── Send helper ──────────────────────────────────────────────────────────
  const send = useCallback((msg: ClientMessage | { type: "pong" }) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  // ── Message handler ──────────────────────────────────────────────────────
  const handleMsg = useCallback((msg: ServerMessage | { type: "ping" }) => {
    // Respond to server keepalive pings immediately
    if (msg.type === "ping") {
      send({ type: "pong" });
      return;
    }

    switch (msg.type) {
      case "init":
        setSelfId(msg.clientId);
        setSelfColor(msg.color);
        setUsers(msg.users);
        setUserCount(msg.userCount);
        canvasRef.current?.redrawAll(msg.strokes);
        break;
      case "user_joined":
        setUsers(p => [...p.filter(u => u.id !== msg.user.id), msg.user]);
        break;
      case "user_left":
        setUsers(p => p.filter(u => u.id !== msg.id));
        setCursors(p => { const n = {...p}; delete n[msg.id]; return n; });
        break;
      case "user_renamed":
        setUsers(p => p.map(u => u.id === msg.id ? {...u, name: msg.name} : u));
        break;
      case "user_count":
        setUserCount(msg.count);
        break;
      case "stroke_start":
        canvasRef.current?.applyRemoteStrokeStart({
          strokeId: msg.strokeId, color: msg.color, width: msg.width,
          tool: msg.tool, points: [msg.point], authorId: msg.id,
        });
        break;
      case "stroke_point":
        canvasRef.current?.applyRemoteStrokePoint(msg.strokeId, msg.point);
        break;
      case "stroke_end":
        canvasRef.current?.applyRemoteStrokeEnd(msg.strokeId);
        break;
      case "clear":
        canvasRef.current?.clearCanvas();
        flash("Board cleared");
        break;
      case "cursor":
        setCursors(p => ({
          ...p,
          [msg.id]: {
            id: msg.id, x: msg.x, y: msg.y,
            name: msg.name, color: msg.color, lastSeen: Date.now(),
          },
        }));
        break;
      case "undo":
        canvasRef.current?.removeStroke(msg.strokeId);
        break;
      case "redo":
        canvasRef.current?.addStroke(msg.stroke);
        break;
    }
  }, [send]);

  // ── WebSocket lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hasJoined || !roomId) return;
    deadRef.current = false;

    const connect = () => {
      if (deadRef.current) return;
      setConnStatus("connecting");

      const url = wsUrlForRoom(roomId, nameRef.current);
      const ws  = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setConnStatus("open");
      };

      ws.onmessage = (e) => {
        try {
          handleMsg(JSON.parse(e.data) as ServerMessage | { type: "ping" });
        } catch { /* ignore malformed frames */ }
      };

      ws.onclose = (ev) => {
        setConnStatus("closed");
        if (deadRef.current) return;
        const delay = RECONNECT_DELAYS[Math.min(retryRef.current++, RECONNECT_DELAYS.length - 1)];
        console.log(`[ws] closed (code=${ev.code}) — reconnecting in ${delay}ms`);
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = (ev) => {
        console.error("[ws] error", ev);
        ws.close();
      };
    };

    connect();

    return () => {
      deadRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [hasJoined, roomId, handleMsg]);

  // ── Stale cursor cleanup ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setCursors(p => {
        const now = Date.now();
        const n: Record<string, CursorState> = {};
        for (const [id, c] of Object.entries(p)) {
          if (now - c.lastSeen < CURSOR_STALE_MS) n[id] = c;
        }
        return n;
      });
    }, 1500);
    return () => clearInterval(t);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const TOOL_KEYS: Record<string, Tool> = {
      "1": "pen", "2": "pencil", "3": "marker", "4": "calligraphy",
      "5": "crayon", "6": "oil", "7": "watercolour", "8": "spray",
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl) {
        if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
        if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) { e.preventDefault(); handleRedo(); }
        return;
      }

      if (typing || !hasJoined) return;

      if (e.key === "Escape") { setShowHelp(false); return; }
      if (e.key === "?") { e.preventDefault(); setShowHelp((v) => !v); return; }
      if (TOOL_KEYS[e.key]) { setTool(TOOL_KEYS[e.key]); return; }
      if (e.key.toLowerCase() === "e") { setTool("eraser"); return; }
      if (e.key === "[") { setBrushWidth(Math.max(1, brushWidth - 2)); return; }
      if (e.key === "]") { setBrushWidth(Math.min(60, brushWidth + 2)); return; }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Undo / Redo ──────────────────────────────────────────────────────────
  const handleUndo = () => {
    const stroke = undoStackRef.current.pop();
    if (!stroke) return;
    redoStackRef.current.push(stroke);
    setUndoLen(undoStackRef.current.length);
    setRedoLen(redoStackRef.current.length);
    canvasRef.current?.removeStroke(stroke.strokeId);
    send({ type: "undo", strokeId: stroke.strokeId });
  };

  const handleRedo = () => {
    const stroke = redoStackRef.current.pop();
    if (!stroke) return;
    undoStackRef.current.push(stroke);
    setUndoLen(undoStackRef.current.length);
    setRedoLen(redoStackRef.current.length);
    canvasRef.current?.addStroke(stroke);
    send({ type: "redo", stroke });
  };

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
    send({ type: "clear" });
    undoStackRef.current = []; redoStackRef.current = [];
    setUndoLen(0); setRedoLen(0);
    flash("Board cleared");
  };

  const handleJoin = (chosen: string) => {
    setName(chosen);
    nameRef.current = chosen;
    try { localStorage.setItem("sketchline-name", chosen); } catch {}
    setHasJoined(true);
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-paper">
      {!hasJoined && (
        <NameModal roomId={roomId} defaultName={name || "Guest"} onJoin={handleJoin} />
      )}

      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}

      <div
        className={`shrink-0 overflow-hidden transition-[height] duration-300 ease-out ${
          headerHidden ? "h-0" : "h-14"
        }`}
        onMouseEnter={() => setHeaderHidden(false)}
      >
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
      </div>

      {/* Thin hover strip to bring the header back when it's hidden */}
      {headerHidden && (
        <div
          className="pointer-events-auto fixed inset-x-0 top-0 z-30 h-2 sm:h-3"
          onMouseEnter={() => setHeaderHidden(false)}
        />
      )}

      {/* Canvas fills the viewport; the toolbar floats above it so drawing
          space is never cropped by a fixed sidebar. On mobile, add bottom
          padding to keep canvas content above the two-row dock. */}
      <div className="relative min-h-0 flex-1 pb-[130px] sm:pb-0">
        <div className="absolute inset-0">
          <Canvas
            ref={canvasRef}
            tool={tool} color={color} width={brushWidth}
            disabled={!hasJoined}
            onStrokeStart={(s) => {
              redoStackRef.current = []; setRedoLen(0);
              send({ type: "stroke_start", ...s });
            }}
            onStrokePoint={(strokeId, point) =>
              send({ type: "stroke_point", strokeId, point })
            }
            onStrokeEnd={(strokeId, stroke) => {
              undoStackRef.current = [...undoStackRef.current, stroke].slice(-MAX_UNDO);
              setUndoLen(undoStackRef.current.length);
              send({ type: "stroke_end", strokeId });
            }}
            onCursorMove={(p: Point) => send({ type: "cursor", x: p.x, y: p.y })}
          />
        </div>

        <CursorLayer cursors={Object.values(cursors)} />

        <div className="pointer-events-none absolute inset-0">
          <Toolbar
            tool={tool} setTool={setTool}
            color={color} setColor={setColor}
            brushWidth={brushWidth} setBrushWidth={setBrushWidth}
            onClear={handleClear}
            onUndo={handleUndo} onRedo={handleRedo}
            canUndo={undoLen > 0} canRedo={redoLen > 0}
            collapsed={railCollapsed} onToggleCollapse={() => setRailCollapsed(v => !v)}
          />
        </div>

        {/* Connection banner — only while not live */}
        {connStatus !== "open" && (
          <div
            role="status"
            className={`absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-xs shadow-md ${
              connStatus === "closed"
                ? "border-danger/40 bg-surface text-danger"
                : "border-line bg-surface text-ink-soft"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${connStatus === "closed" ? "bg-danger" : "bg-amber"} animate-cursor-blink`} />
            {connStatus === "closed" ? "Reconnecting… your strokes are safe" : "Connecting…"}
          </div>
        )}

        <div className="pointer-events-auto absolute right-4 top-4 z-30 flex items-center gap-2">
          <ThemeToggle className="bg-surface" />
        </div>

        {/* Empty-board hint, desktop only */}
        {hasJoined && userCount === 1 && (
          <p className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-center text-xs text-ink-faint sm:block">
            Start drawing — press <kbd className="rounded border border-line px-1 font-mono">?</kbd> for shortcuts, or share the link to invite someone.
          </p>
        )}
      </div>

      <Toast message={toast} />
    </div>
  );
}
