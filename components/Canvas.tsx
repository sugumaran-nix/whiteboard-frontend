"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { Point, Stroke, Tool, DrawTool } from "@/lib/types";

// ─── Virtual canvas size ───────────────────────────────────────────────────────
export const VIRTUAL_W = 4000;
export const VIRTUAL_H = 3000;
const WIDTH_REF = 900;

// ─── PRNG for spray ───────────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
function mkRand(seed: number) {
  let s = (seed | 1) >>> 0;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0x100000000; };
}

function toPW(normW: number) {
  return normW * ((VIRTUAL_W + VIRTUAL_H) / 2);
}

// ─── Shape rendering ──────────────────────────────────────────────────────────
function renderShape(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const [start] = stroke.points;
  const end = stroke.shapeEnd ?? stroke.points[stroke.points.length - 1];
  if (!start || !end) return;

  const x1 = start.x * VIRTUAL_W, y1 = start.y * VIRTUAL_H;
  const x2 = end.x * VIRTUAL_W,   y2 = end.y * VIRTUAL_H;
  const pw = Math.max(1, toPW(stroke.width));

  ctx.save();
  ctx.globalAlpha = stroke.opacity ?? 1;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = pw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const applyFill = () => {
    if (stroke.fillColor) {
      ctx.fillStyle = stroke.fillColor;
      ctx.fill();
    }
  };

  ctx.beginPath();

  switch (stroke.tool) {
    case "line": {
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.stroke();
      break;
    }
    case "arrow": {
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = Math.max(pw * 4, 16);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 7), y2 - headLen * Math.sin(angle - Math.PI / 7));
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 7), y2 - headLen * Math.sin(angle + Math.PI / 7));
      ctx.closePath();
      ctx.fillStyle = stroke.color; ctx.fill();
      break;
    }
    case "rect": {
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
      ctx.rect(rx, ry, rw, rh);
      applyFill(); ctx.stroke();
      break;
    }
    case "rect-rounded": {
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
      const r = Math.min(rw, rh) * 0.18;
      ctx.roundRect(rx, ry, rw, rh, r);
      applyFill(); ctx.stroke();
      break;
    }
    case "ellipse": {
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      const rx2 = Math.abs(x2 - x1) / 2, ry2 = Math.abs(y2 - y1) / 2;
      ctx.ellipse(cx, cy, Math.max(1, rx2), Math.max(1, ry2), 0, 0, Math.PI * 2);
      applyFill(); ctx.stroke();
      break;
    }
    case "triangle": {
      const mx = (x1 + x2) / 2;
      ctx.moveTo(mx, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x1, y2);
      ctx.closePath();
      applyFill(); ctx.stroke();
      break;
    }
    case "diamond": {
      const cx2 = (x1 + x2) / 2, cy2 = (y1 + y2) / 2;
      ctx.moveTo(cx2, y1);
      ctx.lineTo(x2, cy2);
      ctx.lineTo(cx2, y2);
      ctx.lineTo(x1, cy2);
      ctx.closePath();
      applyFill(); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// ─── Text rendering ───────────────────────────────────────────────────────────
function renderText(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const [pt] = stroke.points;
  if (!pt || !stroke.textData) return;
  const x = pt.x * VIRTUAL_W, y = pt.y * VIRTUAL_H;
  const { text, fontSize, bold, italic } = stroke.textData;
  ctx.save();
  ctx.globalAlpha = stroke.opacity ?? 1;
  ctx.fillStyle = stroke.color;
  const style = `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontSize}px sans-serif`;
  ctx.font = style;
  ctx.textBaseline = "top";
  // Multi-line support
  const lines = text.split("\n");
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * fontSize * 1.3));
  ctx.restore();
}

// ─── Freehand segment ─────────────────────────────────────────────────────────
function renderSegment(ctx: CanvasRenderingContext2D, stroke: Stroke, from: Point, to: Point) {
  const fx = from.x * VIRTUAL_W, fy = from.y * VIRTUAL_H;
  const tx = to.x * VIRTUAL_W,   ty = to.y * VIRTUAL_H;
  const pw = Math.max(1, toPW(stroke.width));
  ctx.save();
  ctx.globalAlpha = stroke.opacity ?? 1;

  switch (stroke.tool as DrawTool) {
    case "pen": {
      ctx.strokeStyle = stroke.color; ctx.lineWidth = pw;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      break;
    }
    case "pencil": {
      ctx.strokeStyle = stroke.color; ctx.lineWidth = Math.max(0.5, pw * 0.35);
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = (stroke.opacity ?? 1) * 0.88;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      const dx = tx - fx, dy = ty - fy, len = Math.sqrt(dx*dx+dy*dy);
      if (len > 0) {
        ctx.fillStyle = stroke.color;
        for (let i = 0; i < len; i += 2.5) {
          const t = i / len;
          ctx.globalAlpha = Math.random() * 0.22 * (stroke.opacity ?? 1);
          ctx.beginPath();
          ctx.arc(fx+dx*t+(Math.random()-0.5)*pw*0.55, fy+dy*t+(Math.random()-0.5)*pw*0.55, Math.random()*0.6+0.1, 0, Math.PI*2);
          ctx.fill();
        }
      }
      break;
    }
    case "marker": {
      ctx.strokeStyle = stroke.color; ctx.lineWidth = pw * 3.2;
      ctx.lineCap = "butt"; ctx.lineJoin = "miter";
      ctx.globalAlpha = (stroke.opacity ?? 1) * 0.22;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      break;
    }
    case "highlighter": {
      // Wide semi-transparent stroke — classic highlighter
      ctx.strokeStyle = stroke.color; ctx.lineWidth = pw * 4;
      ctx.lineCap = "square"; ctx.lineJoin = "miter";
      ctx.globalAlpha = (stroke.opacity ?? 1) * 0.35;
      ctx.globalCompositeOperation = "multiply";
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      break;
    }
    case "calligraphy": {
      ctx.fillStyle = stroke.color; ctx.globalAlpha = (stroke.opacity ?? 1) * 0.92;
      const cdx=tx-fx, cdy=ty-fy, clen=Math.sqrt(cdx*cdx+cdy*cdy);
      const steps=Math.max(1,Math.ceil(clen));
      for (let i=0;i<=steps;i++) {
        const t=i/steps;
        ctx.beginPath();
        ctx.ellipse(fx+cdx*t,fy+cdy*t,pw*0.85,pw*0.16,Math.PI/4,0,Math.PI*2);
        ctx.fill();
      }
      break;
    }
    case "crayon": {
      ctx.lineCap="round"; ctx.lineJoin="round";
      for (let pass=0;pass<5;pass++) {
        const ox=(Math.random()-0.5)*pw*0.55, oy=(Math.random()-0.5)*pw*0.55;
        ctx.strokeStyle=stroke.color; ctx.lineWidth=pw*(0.25+Math.random()*0.42);
        ctx.globalAlpha=(stroke.opacity??1)*(0.18+Math.random()*0.26);
        ctx.beginPath(); ctx.moveTo(fx+ox,fy+oy); ctx.lineTo(tx+ox,ty+oy); ctx.stroke();
      }
      break;
    }
    case "oil": {
      ctx.lineCap="round";
      const odx=tx-fx,ody=ty-fy,olen=Math.sqrt(odx*odx+ody*ody)||1;
      const perpX=-ody/olen,perpY=odx/olen,bristles=11;
      for (let i=0;i<bristles;i++) {
        const t=(i/(bristles-1))-0.5, off=t*pw*0.92;
        ctx.strokeStyle=stroke.color; ctx.lineWidth=Math.max(0.5,pw*0.11);
        ctx.globalAlpha=(stroke.opacity??1)*(0.3+Math.random()*0.38);
        ctx.beginPath(); ctx.moveTo(fx+perpX*off,fy+perpY*off); ctx.lineTo(tx+perpX*off,ty+perpY*off); ctx.stroke();
      }
      break;
    }
    case "watercolour": {
      ctx.lineCap="round"; ctx.lineJoin="round";
      for (let pass=0;pass<6;pass++) {
        const ox=(Math.random()-0.5)*pw*0.55, oy=(Math.random()-0.5)*pw*0.55;
        ctx.strokeStyle=stroke.color; ctx.lineWidth=pw*(0.65+Math.random()*0.75);
        ctx.globalAlpha=(stroke.opacity??1)*(0.025+Math.random()*0.035);
        ctx.beginPath(); ctx.moveTo(fx+ox,fy+oy); ctx.lineTo(tx+ox,ty+oy); ctx.stroke();
      }
      break;
    }
    case "spray": break;
    case "eraser": {
      ctx.globalCompositeOperation="destination-out";
      ctx.strokeStyle="rgba(0,0,0,1)"; ctx.lineWidth=pw;
      ctx.lineCap="round"; ctx.lineJoin="round"; ctx.globalAlpha=1;
      ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(tx,ty); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function renderPuff(ctx: CanvasRenderingContext2D, stroke: Stroke, point: Point, pointIdx: number) {
  const px=point.x*VIRTUAL_W, py=point.y*VIRTUAL_H;
  const pw=Math.max(1,toPW(stroke.width));
  ctx.save();
  ctx.globalAlpha=stroke.opacity??1;

  if (stroke.tool==="spray") {
    const seed=hashStr(stroke.strokeId)^(pointIdx*2654435761);
    const rand=mkRand(seed);
    const radius=pw*0.92;
    ctx.fillStyle=stroke.color;
    for (let i=0;i<30;i++) {
      const angle=rand()*Math.PI*2, r=Math.sqrt(rand())*radius;
      ctx.globalAlpha=(stroke.opacity??1)*(rand()*0.45+0.08);
      ctx.beginPath();
      ctx.arc(px+Math.cos(angle)*r,py+Math.sin(angle)*r,rand()*1.5+0.2,0,Math.PI*2);
      ctx.fill();
    }
  } else {
    const r=Math.max(0.5,pw/2);
    if (stroke.tool==="eraser") {
      ctx.globalCompositeOperation="destination-out"; ctx.fillStyle="rgba(0,0,0,1)"; ctx.globalAlpha=1;
    } else if (stroke.tool==="marker") {
      ctx.fillStyle=stroke.color; ctx.globalAlpha=(stroke.opacity??1)*0.22;
    } else if (stroke.tool==="highlighter") {
      ctx.fillStyle=stroke.color; ctx.globalAlpha=(stroke.opacity??1)*0.35;
      ctx.globalCompositeOperation="multiply";
    } else {
      ctx.fillStyle=stroke.color;
    }
    ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ─── Preview shape while dragging ─────────────────────────────────────────────
function renderShapePreview(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  end: Point,
) {
  renderShape(ctx, { ...stroke, shapeEnd: end });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface CanvasHandle {
  redrawAll: (strokes: Stroke[]) => void;
  applyRemoteStrokeStart: (stroke: Stroke) => void;
  applyRemoteStrokePoint: (strokeId: string, point: Point) => void;
  applyRemoteStrokeEnd: (strokeId: string, shapeEnd?: Point) => void;
  removeStroke: (strokeId: string) => void;
  addStroke: (stroke: Stroke) => void;
  clearCanvas: () => void;
}

const SHAPE_TOOLS = new Set(["line","arrow","rect","rect-rounded","ellipse","triangle","diamond"]);
const isShapeTool = (t: Tool) => SHAPE_TOOLS.has(t);

interface CanvasProps {
  tool: Tool;
  color: string;
  fillColor: string | undefined;
  width: number;
  opacity: number;
  textData?: { text: string; fontSize: number; bold: boolean; italic: boolean };
  shiftConstrain: boolean;
  onStrokeStart: (s: { strokeId: string; color: string; fillColor?: string; width: number; opacity: number; tool: Tool; point: Point; textData?: { text: string; fontSize: number; bold: boolean; italic: boolean } }) => void;
  onStrokePoint: (strokeId: string, point: Point) => void;
  onStrokeEnd: (strokeId: string, stroke: Stroke, shapeEnd?: Point) => void;
  onCursorMove: (point: Point) => void;
  disabled?: boolean;
  zoom: number;
  // Text input callback
  onTextPlace?: (point: Point) => void;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { tool, color, fillColor, width, opacity, shiftConstrain,
    onStrokeStart, onStrokePoint, onStrokeEnd, onCursorMove,
    disabled, zoom, onTextPlace },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef    = useRef<CanvasRenderingContext2D | null>(null);
  const historyRef = useRef<Stroke[]>([]);
  const activeRef  = useRef<Map<string, Stroke>>(new Map());
  const previewRef = useRef<{ strokeId: string; currentEnd: Point } | null>(null);

  const localStrokeIdRef   = useRef<string | null>(null);
  const lastCursorSentRef  = useRef(0);
  const pointerActiveRef   = useRef(false);
  const sprayIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointerPosRef  = useRef<Point | null>(null);
  const strokeStartPtRef   = useRef<Point | null>(null);

  const drawStroke = useCallback((stroke: Stroke) => {
    const ctx = ctxRef.current; if (!ctx) return;
    if (stroke.tool === "text") { renderText(ctx, stroke); return; }
    if (isShapeTool(stroke.tool)) { renderShape(ctx, stroke); return; }
    if (stroke.tool === "spray") {
      stroke.points.forEach((pt, idx) => renderPuff(ctx, stroke, pt, idx));
    } else if (stroke.points.length === 1) {
      renderPuff(ctx, stroke, stroke.points[0], 0);
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        renderSegment(ctx, stroke, stroke.points[i-1], stroke.points[i]);
      }
    }
  }, []);

  const redrawAll = useCallback((strokes: Stroke[]) => {
    const ctx = ctxRef.current; const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = strokes;
    strokes.forEach(drawStroke);
    Array.from(activeRef.current.values()).forEach(drawStroke);
  }, [drawStroke]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = VIRTUAL_W * dpr;
    canvas.height = VIRTUAL_H * dpr;
    canvas.style.width  = `${VIRTUAL_W}px`;
    canvas.style.height = `${VIRTUAL_H}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctxRef.current = ctx; }
    redrawAll(historyRef.current);
  }, []); // eslint-disable-line

  useImperativeHandle(ref, () => ({
    redrawAll,
    applyRemoteStrokeStart: (stroke) => {
      activeRef.current.set(stroke.strokeId, { ...stroke, points: [...stroke.points] });
      if (isShapeTool(stroke.tool) || stroke.tool === "text") return;
      if (stroke.points.length > 0) {
        const ctx = ctxRef.current; if (!ctx) return;
        renderPuff(ctx, stroke, stroke.points[0], 0);
      }
    },
    applyRemoteStrokePoint: (strokeId, point) => {
      const stroke = activeRef.current.get(strokeId); if (!stroke) return;
      if (isShapeTool(stroke.tool)) {
        // Update preview end
        activeRef.current.set(strokeId, { ...stroke, shapeEnd: point, points: stroke.points });
        redrawAll(historyRef.current);
        const ctx = ctxRef.current; if (!ctx) return;
        renderShapePreview(ctx, stroke, point);
        return;
      }
      const ctx = ctxRef.current; if (!ctx) return;
      const idx = stroke.points.length;
      if (stroke.tool === "spray") { renderPuff(ctx, stroke, point, idx); }
      else { const prev = stroke.points[stroke.points.length-1]; if (prev) renderSegment(ctx, stroke, prev, point); }
      stroke.points.push(point);
    },
    applyRemoteStrokeEnd: (strokeId, shapeEnd) => {
      const stroke = activeRef.current.get(strokeId);
      if (stroke) {
        const final = { ...stroke, ...(shapeEnd ? { shapeEnd } : {}) };
        historyRef.current = [...historyRef.current, final];
        activeRef.current.delete(strokeId);
        redrawAll(historyRef.current);
      }
    },
    removeStroke: (strokeId) => {
      historyRef.current = historyRef.current.filter(s => s.strokeId !== strokeId);
      redrawAll(historyRef.current);
    },
    addStroke: (stroke) => {
      historyRef.current = [...historyRef.current, stroke]; drawStroke(stroke);
    },
    clearCanvas: () => { historyRef.current = []; activeRef.current.clear(); redrawAll([]); },
  }), [redrawAll, drawStroke]);

  // Spray interval
  const startSprayInterval = useCallback((strokeId: string) => {
    if (sprayIntervalRef.current) clearInterval(sprayIntervalRef.current);
    sprayIntervalRef.current = setInterval(() => {
      const pos = lastPointerPosRef.current;
      if (!pos || !pointerActiveRef.current) return;
      const stroke = activeRef.current.get(strokeId); if (!stroke) return;
      const ctx = ctxRef.current; if (!ctx) return;
      const idx = stroke.points.length;
      renderPuff(ctx, stroke, pos, idx);
      stroke.points.push(pos);
      onStrokePoint(strokeId, pos);
    }, 40);
  }, [onStrokePoint]);

  const stopSpray = () => {
    if (sprayIntervalRef.current) { clearInterval(sprayIntervalRef.current); sprayIntervalRef.current = null; }
  };

  const toNorm = (clientX: number, clientY: number): Point => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - r.left) / VIRTUAL_W)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / VIRTUAL_H)),
    };
  };

  // Constrain to 45° multiples when shift held
  const constrain = (start: Point, end: Point): Point => {
    if (!shiftConstrain) return end;
    const dx = (end.x - start.x) * VIRTUAL_W;
    const dy = (end.y - start.y) * VIRTUAL_H;
    const angle = Math.atan2(dy, dx);
    const snap = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const dist = Math.sqrt(dx*dx + dy*dy);
    return {
      x: start.x + Math.cos(snap) * dist / VIRTUAL_W,
      y: start.y + Math.sin(snap) * dist / VIRTUAL_H,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    if (tool === "pan") return;

    // Text tool: just fire callback, don't draw
    if (tool === "text") {
      const point = toNorm(e.clientX, e.clientY);
      onTextPlace?.(point);
      return;
    }

    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const point = toNorm(e.clientX, e.clientY);
    lastPointerPosRef.current = point;
    strokeStartPtRef.current = point;
    const strokeId = crypto.randomUUID();
    localStrokeIdRef.current = strokeId;
    pointerActiveRef.current = true;

    const normW = width / WIDTH_REF;
    const stroke: Stroke = {
      strokeId, color, fillColor: fillColor || undefined,
      width: normW, opacity, tool, points: [point],
    };
    activeRef.current.set(strokeId, stroke);

    if (!isShapeTool(tool)) {
      const ctx = ctxRef.current;
      if (ctx) renderPuff(ctx, stroke, point, 0);
    }

    onStrokeStart({ strokeId, color, fillColor: fillColor || undefined, width: normW, opacity, tool, point });
    if (tool === "spray") startSprayInterval(strokeId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rawPoint = toNorm(e.clientX, e.clientY);
    lastPointerPosRef.current = rawPoint;

    const now = performance.now();
    if (now - lastCursorSentRef.current >= 50) {
      lastCursorSentRef.current = now;
      onCursorMove(rawPoint);
    }

    if (!pointerActiveRef.current || disabled || tool === "pan" || tool === "text") return;
    const strokeId = localStrokeIdRef.current; if (!strokeId) return;
    const stroke = activeRef.current.get(strokeId); if (!stroke) return;

    const point = strokeStartPtRef.current ? constrain(strokeStartPtRef.current, rawPoint) : rawPoint;

    // Shape preview: clear and redraw with preview
    if (isShapeTool(tool)) {
      const ctx = ctxRef.current; if (!ctx) return;
      redrawAll(historyRef.current);
      Array.from(activeRef.current.values()).forEach(s => {
        if (s.strokeId !== strokeId) drawStroke(s);
      });
      renderShapePreview(ctx, stroke, point);
      previewRef.current = { strokeId, currentEnd: point };
      return;
    }

    if (tool === "spray") return;

    const prev = stroke.points[stroke.points.length-1];
    if (prev) {
      const ddx=(point.x-prev.x)*VIRTUAL_W, ddy=(point.y-prev.y)*VIRTUAL_H;
      if (ddx*ddx+ddy*ddy < 1.5) return;
    }

    const ctx = ctxRef.current;
    if (ctx && prev) renderSegment(ctx, stroke, prev, point);
    stroke.points.push(point);
    onStrokePoint(strokeId, point);
  };

  const endStroke = (e?: React.PointerEvent) => {
    if (!pointerActiveRef.current) return;
    pointerActiveRef.current = false;
    stopSpray();
    const strokeId = localStrokeIdRef.current;
    localStrokeIdRef.current = null;
    if (!strokeId) return;
    const stroke = activeRef.current.get(strokeId);
    if (stroke) {
      let shapeEnd: Point | undefined;
      if (isShapeTool(tool) && strokeStartPtRef.current && e) {
        const rawEnd = toNorm(e.clientX, e.clientY);
        shapeEnd = constrain(strokeStartPtRef.current, rawEnd);
        const final = { ...stroke, shapeEnd };
        historyRef.current = [...historyRef.current, final];
        activeRef.current.delete(strokeId);
        redrawAll(historyRef.current);
        onStrokeEnd(strokeId, final, shapeEnd);
      } else {
        historyRef.current = [...historyRef.current, stroke];
        activeRef.current.delete(strokeId);
        onStrokeEnd(strokeId, stroke, undefined);
      }
      previewRef.current = null;
      strokeStartPtRef.current = null;
    }
  };

  const getCursor = () => {
    if (tool === "pan") return "grab";
    if (tool === "eraser") return "cell";
    if (tool === "text") return "text";
    if (isShapeTool(tool)) return "crosshair";
    return "crosshair";
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        cursor: getCursor(),
        display: "block",
        backgroundImage: "radial-gradient(circle, #bbbbc8 1.2px, transparent 1.2px)",
        backgroundSize: "28px 28px",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerLeave={endStroke}
      onPointerCancel={endStroke}
    />
  );
});

export default Canvas;
