"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { Point, Stroke, Tool } from "@/lib/types";

// ─── Seeded PRNG (xorshift32) ────────────────────────────────────────────────
// Used by the spray tool so both sender and receiver generate identical dot
// patterns from the same stroke-id + point-index seed, without sending every
// individual dot position over the wire.
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); }
  return h >>> 0;
}
function mkRand(seed: number) {
  let s = (seed | 1) >>> 0;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
}

// ─── Coordinate / width helpers ──────────────────────────────────────────────
const WIDTH_REF = 900; // fixed anchor for normalising brush widths

// ─── Per-tool rendering ───────────────────────────────────────────────────────
// Every tool has two draw calls:
//   renderSegment – draws the connection between two consecutive points
//   renderPuff    – draws at a single point (used for spray and for single-tap dots)
function renderSegment(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  from: Point,
  to: Point,
  w: number, h: number,
  pw: number,          // pixel brush width
) {
  const fx = from.x * w, fy = from.y * h;
  const tx = to.x * w, ty = to.y * h;
  ctx.save();

  switch (stroke.tool) {
    case "pen": {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = pw;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      break;
    }
    case "pencil": {
      // Thin line + scattered grain for a graphite feel
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(0.5, pw * 0.35);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalAlpha = 0.88;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      const dx = tx - fx, dy = ty - fy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        ctx.fillStyle = stroke.color;
        for (let i = 0; i < len; i += 2.5) {
          const t = i / len;
          ctx.globalAlpha = Math.random() * 0.22;
          ctx.beginPath();
          ctx.arc(
            fx + dx * t + (Math.random() - 0.5) * pw * 0.55,
            fy + dy * t + (Math.random() - 0.5) * pw * 0.55,
            Math.random() * 0.6 + 0.1, 0, Math.PI * 2,
          );
          ctx.fill();
        }
      }
      break;
    }
    case "marker": {
      // Wide, flat, semi-transparent — colour builds up where strokes overlap
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = pw * 3.2;
      ctx.lineCap = "butt"; ctx.lineJoin = "miter";
      ctx.globalAlpha = 0.22;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      break;
    }
    case "calligraphy": {
      // Rotated ellipse stepped along the path — thick at 45°, thin at 135°
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = 0.92;
      const cdx = tx - fx, cdy = ty - fy;
      const clen = Math.sqrt(cdx * cdx + cdy * cdy);
      const steps = Math.max(1, Math.ceil(clen));
      const angle = Math.PI / 4;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        ctx.beginPath();
        ctx.ellipse(fx + cdx * t, fy + cdy * t, pw * 0.85, pw * 0.16, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "crayon": {
      // Rough wax — multiple low-alpha strokes with jitter
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let pass = 0; pass < 5; pass++) {
        const ox = (Math.random() - 0.5) * pw * 0.55;
        const oy = (Math.random() - 0.5) * pw * 0.55;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = pw * (0.25 + Math.random() * 0.42);
        ctx.globalAlpha = 0.18 + Math.random() * 0.26;
        ctx.beginPath();
        ctx.moveTo(fx + ox, fy + oy); ctx.lineTo(tx + ox, ty + oy); ctx.stroke();
      }
      break;
    }
    case "oil": {
      // Bristle fan — parallel thin strokes spread perpendicularly
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";
      const odx = tx - fx, ody = ty - fy;
      const olen = Math.sqrt(odx * odx + ody * ody) || 1;
      const perpX = -ody / olen, perpY = odx / olen;
      const bristles = 11;
      for (let i = 0; i < bristles; i++) {
        const t = (i / (bristles - 1)) - 0.5;
        const off = t * pw * 0.92;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(0.5, pw * 0.11);
        ctx.globalAlpha = 0.3 + Math.random() * 0.38;
        ctx.beginPath();
        ctx.moveTo(fx + perpX * off, fy + perpY * off);
        ctx.lineTo(tx + perpX * off, ty + perpY * off);
        ctx.stroke();
      }
      break;
    }
    case "watercolour": {
      // Very soft washes — stacks of blurred, transparent passes
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      const spread = pw * 0.55;
      for (let pass = 0; pass < 6; pass++) {
        const ox = (Math.random() - 0.5) * spread;
        const oy = (Math.random() - 0.5) * spread;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = pw * (0.65 + Math.random() * 0.75);
        ctx.globalAlpha = 0.025 + Math.random() * 0.035;
        ctx.beginPath();
        ctx.moveTo(fx + ox, fy + oy); ctx.lineTo(tx + ox, ty + oy); ctx.stroke();
      }
      break;
    }
    case "spray":
      // Spray is point-based; segments are skipped — each point is a puff.
      break;
    case "eraser": {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = pw;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function renderPuff(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  point: Point,
  pointIdx: number,
  w: number, h: number,
  pw: number,
) {
  const px = point.x * w, py = point.y * h;
  ctx.save();

  if (stroke.tool === "spray") {
    // Seeded spray so sender + receiver see identical dot clouds
    const seed = hashStr(stroke.strokeId) ^ (pointIdx * 2654435761);
    const rand = mkRand(seed);
    const radius = pw * 0.92;
    ctx.fillStyle = stroke.color;
    for (let i = 0; i < 30; i++) {
      const angle = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * radius;
      ctx.globalAlpha = rand() * 0.45 + 0.08;
      ctx.beginPath();
      ctx.arc(px + Math.cos(angle) * r, py + Math.sin(angle) * r, rand() * 1.5 + 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Single-tap dot for non-spray tools
    const r = Math.max(0.5, pw / 2);
    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else if (stroke.tool === "marker") {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = 0.22;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = 1;
    }
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface CanvasHandle {
  redrawAll: (strokes: Stroke[]) => void;
  applyRemoteStrokeStart: (stroke: Stroke) => void;
  applyRemoteStrokePoint: (strokeId: string, point: Point) => void;
  applyRemoteStrokeEnd: (strokeId: string) => void;
  removeStroke: (strokeId: string) => void;
  addStroke: (stroke: Stroke) => void;
  clearCanvas: () => void;
}

interface CanvasProps {
  tool: Tool;
  color: string;
  width: number;
  onStrokeStart: (s: { strokeId: string; color: string; width: number; tool: Tool; point: Point }) => void;
  onStrokePoint: (strokeId: string, point: Point) => void;
  onStrokeEnd: (strokeId: string, stroke: Stroke) => void;
  onCursorMove: (point: Point) => void;
  disabled?: boolean;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { tool, color, width, onStrokeStart, onStrokePoint, onStrokeEnd, onCursorMove, disabled },
  ref,
) {
  const canvasRef   = useRef<HTMLCanvasElement | null>(null);
  const ctxRef      = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const historyRef  = useRef<Stroke[]>([]);
  const activeRef   = useRef<Map<string, Stroke>>(new Map());

  const localStrokeIdRef    = useRef<string | null>(null);
  const lastCursorSentRef   = useRef(0);
  const pointerActiveRef    = useRef(false);
  const sprayIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointerPosRef   = useRef<Point | null>(null);

  const getSize = () => {
    const c = canvasRef.current;
    if (!c) return { w: 1, h: 1 };
    const r = c.getBoundingClientRect();
    return { w: r.width || 1, h: r.height || 1 };
  };

  const toNorm = useCallback((cx: number, cy: number): Point => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (cx - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (cy - r.top)  / r.height)),
    };
  }, []);

  const toPW = useCallback((normW: number) => {
    const { w, h } = getSize();
    return normW * ((w + h) / 2);
  }, []); // eslint-disable-line

  const drawStroke = useCallback((stroke: Stroke) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { w, h } = getSize();
    const pw = Math.max(1, toPW(stroke.width));

    if (stroke.tool === "spray") {
      stroke.points.forEach((pt, idx) => renderPuff(ctx, stroke, pt, idx, w, h, pw));
    } else if (stroke.points.length === 1) {
      renderPuff(ctx, stroke, stroke.points[0], 0, w, h, pw);
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        renderSegment(ctx, stroke, stroke.points[i - 1], stroke.points[i], w, h, pw);
      }
    }
  }, [toPW]); // eslint-disable-line

  const redrawAll = useCallback((strokes: Stroke[]) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    historyRef.current = strokes;
    strokes.forEach(drawStroke);
    Array.from(activeRef.current.values()).forEach(drawStroke);
  }, [drawStroke]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width  = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctxRef.current = ctx; }
    redrawAll(historyRef.current);
  }, [redrawAll]);

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []); // eslint-disable-line

  useImperativeHandle(ref, () => ({
    redrawAll,
    applyRemoteStrokeStart: (stroke) => {
      activeRef.current.set(stroke.strokeId, { ...stroke, points: [...stroke.points] });
      if (stroke.points.length > 0) {
        const ctx = ctxRef.current; if (!ctx) return;
        const { w, h } = getSize();
        const pw = Math.max(1, toPW(stroke.width));
        renderPuff(ctx, stroke, stroke.points[0], 0, w, h, pw);
      }
    },
    applyRemoteStrokePoint: (strokeId, point) => {
      const stroke = activeRef.current.get(strokeId);
      if (!stroke) return;
      const ctx = ctxRef.current; if (!ctx) return;
      const { w, h } = getSize();
      const pw = Math.max(1, toPW(stroke.width));
      const idx = stroke.points.length;
      if (stroke.tool === "spray") {
        renderPuff(ctx, stroke, point, idx, w, h, pw);
      } else {
        const prev = stroke.points[stroke.points.length - 1];
        if (prev) renderSegment(ctx, stroke, prev, point, w, h, pw);
      }
      stroke.points.push(point);
    },
    applyRemoteStrokeEnd: (strokeId) => {
      const stroke = activeRef.current.get(strokeId);
      if (stroke) { historyRef.current = [...historyRef.current, stroke]; activeRef.current.delete(strokeId); }
    },
    removeStroke: (strokeId) => {
      historyRef.current = historyRef.current.filter(s => s.strokeId !== strokeId);
      redrawAll(historyRef.current);
    },
    addStroke: (stroke) => {
      historyRef.current = [...historyRef.current, stroke];
      drawStroke(stroke);
    },
    clearCanvas: () => { historyRef.current = []; activeRef.current.clear(); redrawAll([]); },
  }), [redrawAll, drawStroke, toPW]);

  // ── Spray: emit points continuously while pointer held ──
  const startSprayInterval = useCallback((strokeId: string) => {
    if (sprayIntervalRef.current) clearInterval(sprayIntervalRef.current);
    sprayIntervalRef.current = setInterval(() => {
      const pos = lastPointerPosRef.current;
      if (!pos || !pointerActiveRef.current) return;
      const stroke = activeRef.current.get(strokeId);
      if (!stroke) return;
      const ctx = ctxRef.current; if (!ctx) return;
      const { w, h } = getSize();
      const pw = Math.max(1, toPW(stroke.width));
      const idx = stroke.points.length;
      renderPuff(ctx, stroke, pos, idx, w, h, pw);
      stroke.points.push(pos);
      onStrokePoint(strokeId, pos);
    }, 40); // ~25 puffs/sec
  }, [onStrokePoint, toPW]); // eslint-disable-line

  const stopSprayInterval = () => {
    if (sprayIntervalRef.current) { clearInterval(sprayIntervalRef.current); sprayIntervalRef.current = null; }
  };

  // ── Pointer handlers ──
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const point = toNorm(e.clientX, e.clientY);
    lastPointerPosRef.current = point;
    const strokeId = crypto.randomUUID();
    localStrokeIdRef.current = strokeId;
    pointerActiveRef.current = true;

    const normW = width / WIDTH_REF;
    const stroke: Stroke = { strokeId, color, width: normW, tool, points: [point] };
    activeRef.current.set(strokeId, stroke);

    const ctx = ctxRef.current;
    if (ctx) {
      const { w, h } = getSize();
      const pw = Math.max(1, toPW(normW));
      renderPuff(ctx, stroke, point, 0, w, h, pw);
    }
    onStrokeStart({ strokeId, color, width: normW, tool, point });
    if (tool === "spray") startSprayInterval(strokeId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = toNorm(e.clientX, e.clientY);
    lastPointerPosRef.current = point;

    // Cursor broadcast throttled to ~20/sec
    const now = performance.now();
    if (now - lastCursorSentRef.current >= 50) {
      lastCursorSentRef.current = now;
      onCursorMove(point);
    }

    if (!pointerActiveRef.current || disabled) return;
    const strokeId = localStrokeIdRef.current;
    if (!strokeId) return;
    const stroke = activeRef.current.get(strokeId);
    if (!stroke) return;

    if (tool === "spray") return; // handled by interval

    const prev = stroke.points[stroke.points.length - 1];
    // Skip sub-pixel jitter
    if (prev) {
      const { w, h } = getSize();
      const ddx = (point.x - prev.x) * w, ddy = (point.y - prev.y) * h;
      if (ddx * ddx + ddy * ddy < 1.5) return;
    }

    const ctx = ctxRef.current;
    if (ctx) {
      const { w, h } = getSize();
      const pw = Math.max(1, toPW(stroke.width));
      if (prev) renderSegment(ctx, stroke, prev, point, w, h, pw);
    }
    stroke.points.push(point);
    onStrokePoint(strokeId, point);
  };

  const endStroke = () => {
    if (!pointerActiveRef.current) return;
    pointerActiveRef.current = false;
    stopSprayInterval();
    const strokeId = localStrokeIdRef.current;
    localStrokeIdRef.current = null;
    if (!strokeId) return;
    const stroke = activeRef.current.get(strokeId);
    if (stroke) {
      historyRef.current = [...historyRef.current, stroke];
      activeRef.current.delete(strokeId);
      onStrokeEnd(strokeId, stroke);
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full touch-none">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none bg-dot-grid bg-dot-grid"
        style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
      />
    </div>
  );
});

export default Canvas;
