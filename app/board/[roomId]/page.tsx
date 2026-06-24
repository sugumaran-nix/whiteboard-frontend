"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Canvas, { type CanvasHandle } from "@/components/Canvas";
import Toolbar from "@/components/Toolbar";
import PresenceBar from "@/components/PresenceBar";
import CursorLayer from "@/components/CursorLayer";
import ThemeToggle from "@/components/ThemeToggle";
import NameModal from "@/components/NameModal";
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
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); handleRedo(); }
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
  };

  const handleJoin = (chosen: string) => {
    setName(chosen);
    nameRef.current = chosen;
    try { localStorage.setItem("sketchline-name", chosen); } catch {}
    setHasJoined(true);
  };

  return (
    <div className="flex h-dvh w-full flex-col bg-paper">
      {!hasJoined && (
        <NameModal roomId={roomId} defaultName={name || "Guest"} onJoin={handleJoin} />
      )}

      <PresenceBar
        roomId={roomId}
        users={users.filter(u => u.id !== selfId)}
        selfName={name || "You"}
        selfColor={selfColor}
        userCount={userCount}
        connectionStatus={connStatus}
      />

      <div className="relative flex min-h-0 flex-1">
        <Toolbar
          tool={tool} setTool={setTool}
          color={color} setColor={setColor}
          brushWidth={brushWidth} setBrushWidth={setBrushWidth}
          onClear={handleClear}
          onUndo={handleUndo} onRedo={handleRedo}
          canUndo={undoLen > 0} canRedo={redoLen > 0}
        />

        <div className="relative min-w-0 flex-1">
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
          <CursorLayer cursors={Object.values(cursors)} />

          {/* Connection status banner shown only when disconnected */}
          {connStatus === "closed" && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-red-300 bg-red-50 px-4 py-1.5 font-mono text-xs text-red-600 shadow dark:border-red-800 dark:bg-red-950/60 dark:text-red-400">
              Reconnecting… your strokes are safe
            </div>
          )}
          {connStatus === "connecting" && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface px-4 py-1.5 font-mono text-xs text-ink-soft shadow">
              Connecting…
            </div>
          )}

          <ThemeToggle className="absolute right-4 top-4 bg-surface shadow-sm" />
        </div>
      </div>
    </div>
  );
}
