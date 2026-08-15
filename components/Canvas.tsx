"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { Point, Stroke, Tool, DrawTool } from "@/lib/types";

export const VIRTUAL_W = 4000;
export const VIRTUAL_H = 3000;
const WIDTH_REF = 900;

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
function mkRand(seed: number) {
  let s = (seed | 1) >>> 0;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0x100000000; };
}
function toPW(normW: number) { return normW * ((VIRTUAL_W + VIRTUAL_H) / 2); }


// ─── Catmull-Rom smooth stroke renderer ───────────────────────────────────────
function catmullRomPath(ctx: CanvasRenderingContext2D, pts: {x:number;y:number}[]) {
  if (pts.length < 2) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) { ctx.lineTo(pts[1].x, pts[1].y); return; }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i-1, 0)];
    const p1 = pts[i];
    const p2 = pts[i+1];
    const p3 = pts[Math.min(i+2, pts.length-1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

function renderSmoothStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length < 2) {
    renderPuff(ctx, stroke, stroke.points[0] ?? {x:0,y:0}, 0); return;
  }
  const pw = Math.max(1, toPW(stroke.width));
  const pts = stroke.points.map(p => ({ x: p.x * VIRTUAL_W, y: p.y * VIRTUAL_H }));
  ctx.save();
  ctx.globalAlpha = stroke.opacity ?? 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (stroke.tool) {
    case "pen": {
      ctx.strokeStyle = stroke.color;
      // Pressure-sensitive: vary lineWidth per segment using stored pressure
      const pressures = stroke.points.map((p: Point & { pressure?: number }) => p.pressure ?? 1);
      if (pressures.every(p => p === 1)) {
        // No pressure data — uniform width (remote strokes, old strokes)
        ctx.lineWidth = pw;
        ctx.beginPath(); catmullRomPath(ctx, pts); ctx.stroke();
      } else {
        // Draw segment-by-segment with varying width
        for (let i = 1; i < pts.length; i++) {
          const w = pw * (pressures[i-1] * 0.5 + pressures[i] * 0.5);
          ctx.lineWidth = Math.max(0.5, w);
          ctx.beginPath();
          const p0 = pts[Math.max(i-2, 0)], p1 = pts[i-1], p2 = pts[i], p3 = pts[Math.min(i+1, pts.length-1)];
          ctx.moveTo(p1.x, p1.y);
          ctx.bezierCurveTo(
            p1.x + (p2.x-p0.x)/6, p1.y + (p2.y-p0.y)/6,
            p2.x - (p3.x-p1.x)/6, p2.y - (p3.y-p1.y)/6,
            p2.x, p2.y
          );
          ctx.stroke();
        }
      }
      break;
    }

    case "pencil": {
      ctx.strokeStyle = stroke.color; ctx.lineWidth = Math.max(0.5, pw * 0.35);
      ctx.globalAlpha = (stroke.opacity ?? 1) * 0.85;
      ctx.beginPath(); catmullRomPath(ctx, pts); ctx.stroke();
      const rand = mkRand(hashStr(stroke.strokeId) ^ 0xdeadbeef);
      ctx.fillStyle = stroke.color;
      for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i+1].x - pts[i].x, dy = pts[i+1].y - pts[i].y;
        const len = Math.sqrt(dx*dx+dy*dy);
        for (let d = 0; d < len; d += 2.5) {
          const t = d / len;
          ctx.globalAlpha = rand() * 0.18 * (stroke.opacity ?? 1);
          ctx.beginPath();
          ctx.arc(pts[i].x+dx*t+(rand()-0.5)*pw*0.55, pts[i].y+dy*t+(rand()-0.5)*pw*0.55, rand()*0.6+0.1, 0, Math.PI*2);
          ctx.fill();
        }
      }
      break;
    }

    case "marker":
      ctx.strokeStyle = stroke.color; ctx.lineWidth = pw * 3.2;
      ctx.lineCap = "butt"; ctx.lineJoin = "miter";
      ctx.globalAlpha = (stroke.opacity ?? 1) * 0.22;
      ctx.beginPath(); catmullRomPath(ctx, pts); ctx.stroke();
      break;

    case "highlighter":
      ctx.strokeStyle = stroke.color; ctx.lineWidth = pw * 4;
      ctx.lineCap = "square"; ctx.lineJoin = "miter";
      ctx.globalAlpha = (stroke.opacity ?? 1) * 0.35;
      ctx.globalCompositeOperation = "multiply";
      ctx.beginPath(); catmullRomPath(ctx, pts); ctx.stroke();
      break;

    case "calligraphy": {
      ctx.fillStyle = stroke.color; ctx.globalAlpha = (stroke.opacity ?? 1) * 0.92;
      for (let i = 0; i < pts.length - 1; i++) {
        const cdx = pts[i+1].x-pts[i].x, cdy = pts[i+1].y-pts[i].y;
        const clen = Math.sqrt(cdx*cdx+cdy*cdy), steps = Math.max(1, Math.ceil(clen));
        for (let s = 0; s <= steps; s++) {
          const t = s/steps;
          ctx.beginPath();
          ctx.ellipse(pts[i].x+cdx*t, pts[i].y+cdy*t, pw*0.85, pw*0.16, Math.PI/4, 0, Math.PI*2);
          ctx.fill();
        }
      }
      break;
    }

    case "crayon": {
      for (let pass = 0; pass < 5; pass++) {
        const rand = mkRand(hashStr(stroke.strokeId) ^ (0xcafe + pass * 1000));
        const ox = (rand()-0.5)*pw*0.55, oy = (rand()-0.5)*pw*0.55;
        const offPts = pts.map(p => ({ x: p.x+ox, y: p.y+oy }));
        ctx.strokeStyle = stroke.color; ctx.lineWidth = pw*(0.25+rand()*0.42);
        ctx.globalAlpha = (stroke.opacity??1)*(0.18+rand()*0.26);
        ctx.beginPath(); catmullRomPath(ctx, offPts); ctx.stroke();
      }
      break;
    }

    case "oil": {
      for (let i = 0; i < 11; i++) {
        const rand = mkRand(hashStr(stroke.strokeId) ^ (0xbabe + i * 997));
        const t2 = i/10 - 0.5;
        const offPts = pts.map((p, j) => {
          const next = pts[Math.min(j+1, pts.length-1)];
          const dx = next.x-p.x, dy = next.y-p.y, len = Math.sqrt(dx*dx+dy*dy)||1;
          return { x: p.x + (-dy/len)*t2*pw*0.92, y: p.y + (dx/len)*t2*pw*0.92 };
        });
        ctx.strokeStyle = stroke.color; ctx.lineWidth = Math.max(0.5, pw*0.11);
        ctx.globalAlpha = (stroke.opacity??1)*(0.3+rand()*0.38);
        ctx.beginPath(); catmullRomPath(ctx, offPts); ctx.stroke();
      }
      break;
    }

    case "watercolour": {
      for (let pass = 0; pass < 6; pass++) {
        const rand = mkRand(hashStr(stroke.strokeId) ^ (0xf00d + pass * 777));
        const ox = (rand()-0.5)*pw*0.55, oy = (rand()-0.5)*pw*0.55;
        const offPts = pts.map(p => ({ x: p.x+ox, y: p.y+oy }));
        ctx.strokeStyle = stroke.color; ctx.lineWidth = pw*(0.65+rand()*0.75);
        ctx.globalAlpha = (stroke.opacity??1)*(0.025+rand()*0.035);
        ctx.beginPath(); catmullRomPath(ctx, offPts); ctx.stroke();
      }
      break;
    }

    case "eraser": {
      const smoothEraserBg = document.documentElement.classList.contains("dark") ? "#1b1f2e" : "#ffffff";
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = smoothEraserBg; ctx.lineWidth = pw; ctx.globalAlpha = 1;
      ctx.beginPath(); catmullRomPath(ctx, pts); ctx.stroke();
      break;
    }

    default: break;
  }
  ctx.restore();
}

function renderShape(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const [start] = stroke.points;
  const end = stroke.shapeEnd ?? stroke.points[stroke.points.length - 1];
  if (!start || !end) return;
  const x1 = start.x * VIRTUAL_W, y1 = start.y * VIRTUAL_H;
  const x2 = end.x * VIRTUAL_W, y2 = end.y * VIRTUAL_H;
  const pw = Math.max(1, toPW(stroke.width));
  ctx.save();
  ctx.globalAlpha = stroke.opacity ?? 1;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = pw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const fill = () => { if (stroke.fillColor) { ctx.fillStyle = stroke.fillColor; ctx.fill(); } };
  ctx.beginPath();
  switch (stroke.tool) {
    case "line": ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); break;
    case "arrow": {
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const ang = Math.atan2(y2 - y1, x2 - x1), hl = Math.max(pw * 4, 20);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hl * Math.cos(ang - Math.PI / 7), y2 - hl * Math.sin(ang - Math.PI / 7));
      ctx.lineTo(x2 - hl * Math.cos(ang + Math.PI / 7), y2 - hl * Math.sin(ang + Math.PI / 7));
      ctx.closePath(); ctx.fillStyle = stroke.color; ctx.fill(); break;
    }
    case "rect": { const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1); ctx.rect(rx, ry, rw, rh); fill(); ctx.stroke(); break; }
    case "rect-rounded": { const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1); ctx.roundRect(rx, ry, rw, rh, Math.min(rw, rh) * 0.18); fill(); ctx.stroke(); break; }
    case "ellipse": { ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.max(1, Math.abs(x2 - x1) / 2), Math.max(1, Math.abs(y2 - y1) / 2), 0, 0, Math.PI * 2); fill(); ctx.stroke(); break; }
    case "triangle": { ctx.moveTo((x1 + x2) / 2, y1); ctx.lineTo(x2, y2); ctx.lineTo(x1, y2); ctx.closePath(); fill(); ctx.stroke(); break; }
    case "diamond": { const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2; ctx.moveTo(cx, y1); ctx.lineTo(x2, cy); ctx.lineTo(cx, y2); ctx.lineTo(x1, cy); ctx.closePath(); fill(); ctx.stroke(); break; }
  }
  ctx.restore();
}

function renderText(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const [pt] = stroke.points;
  if (!pt || !stroke.textData) return;
  const { text, fontSize, bold, italic } = stroke.textData;
  ctx.save();
  ctx.globalAlpha = stroke.opacity ?? 1;
  ctx.fillStyle = stroke.color;
  ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontSize}px sans-serif`;
  ctx.textBaseline = "top";
  text.split("\n").forEach((line, i) => ctx.fillText(line, pt.x * VIRTUAL_W, pt.y * VIRTUAL_H + i * fontSize * 1.3));
  ctx.restore();
}

function renderSegment(ctx: CanvasRenderingContext2D, stroke: Stroke, from: Point, to: Point, seed = 0) {
  const fx = from.x * VIRTUAL_W, fy = from.y * VIRTUAL_H;
  const tx = to.x * VIRTUAL_W, ty = to.y * VIRTUAL_H;
  const pw = Math.max(1, toPW(stroke.width));
  ctx.save();
  ctx.globalAlpha = stroke.opacity ?? 1;
  switch (stroke.tool as DrawTool) {
    case "pen": ctx.strokeStyle = stroke.color; ctx.lineWidth = pw; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke(); break;
    case "pencil": {
      const rand = mkRand(seed ^ 0xdeadbeef);
      ctx.strokeStyle = stroke.color; ctx.lineWidth = Math.max(0.5, pw * 0.35); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalAlpha = (stroke.opacity ?? 1) * 0.85; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      const dx = tx - fx, dy = ty - fy, len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) { ctx.fillStyle = stroke.color; for (let i = 0; i < len; i += 2.5) { const t = i / len; ctx.globalAlpha = rand() * 0.18 * (stroke.opacity ?? 1); ctx.beginPath(); ctx.arc(fx + dx * t + (rand() - 0.5) * pw * 0.55, fy + dy * t + (rand() - 0.5) * pw * 0.55, rand() * 0.6 + 0.1, 0, Math.PI * 2); ctx.fill(); } }
      break;
    }
    case "marker": ctx.strokeStyle = stroke.color; ctx.lineWidth = pw * 3.2; ctx.lineCap = "butt"; ctx.lineJoin = "miter"; ctx.globalAlpha = (stroke.opacity ?? 1) * 0.22; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke(); break;
    case "highlighter": ctx.strokeStyle = stroke.color; ctx.lineWidth = pw * 4; ctx.lineCap = "square"; ctx.lineJoin = "miter"; ctx.globalAlpha = (stroke.opacity ?? 1) * 0.35; ctx.globalCompositeOperation = "multiply"; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke(); break;
    case "calligraphy": {
      ctx.fillStyle = stroke.color; ctx.globalAlpha = (stroke.opacity ?? 1) * 0.92;
      const cdx = tx - fx, cdy = ty - fy, clen = Math.sqrt(cdx * cdx + cdy * cdy), steps = Math.max(1, Math.ceil(clen));
      for (let i = 0; i <= steps; i++) { const t = i / steps; ctx.beginPath(); ctx.ellipse(fx + cdx * t, fy + cdy * t, pw * 0.85, pw * 0.16, Math.PI / 4, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case "crayon": {
      const rand = mkRand(seed ^ 0xcafe); ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let p = 0; p < 5; p++) { const ox = (rand() - 0.5) * pw * 0.55, oy = (rand() - 0.5) * pw * 0.55; ctx.strokeStyle = stroke.color; ctx.lineWidth = pw * (0.25 + rand() * 0.42); ctx.globalAlpha = (stroke.opacity ?? 1) * (0.18 + rand() * 0.26); ctx.beginPath(); ctx.moveTo(fx + ox, fy + oy); ctx.lineTo(tx + ox, ty + oy); ctx.stroke(); }
      break;
    }
    case "oil": {
      const rand = mkRand(seed ^ 0xbabe); ctx.lineCap = "round";
      const odx = tx - fx, ody = ty - fy, olen = Math.sqrt(odx * odx + ody * ody) || 1;
      const perpX = -ody / olen, perpY = odx / olen;
      for (let i = 0; i < 11; i++) { const t = i / 10 - 0.5, off = t * pw * 0.92; ctx.strokeStyle = stroke.color; ctx.lineWidth = Math.max(0.5, pw * 0.11); ctx.globalAlpha = (stroke.opacity ?? 1) * (0.3 + rand() * 0.38); ctx.beginPath(); ctx.moveTo(fx + perpX * off, fy + perpY * off); ctx.lineTo(tx + perpX * off, ty + perpY * off); ctx.stroke(); }
      break;
    }
    case "watercolour": {
      const rand = mkRand(seed ^ 0xf00d); ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let p = 0; p < 6; p++) { const ox = (rand() - 0.5) * pw * 0.55, oy = (rand() - 0.5) * pw * 0.55; ctx.strokeStyle = stroke.color; ctx.lineWidth = pw * (0.65 + rand() * 0.75); ctx.globalAlpha = (stroke.opacity ?? 1) * (0.025 + rand() * 0.035); ctx.beginPath(); ctx.moveTo(fx + ox, fy + oy); ctx.lineTo(tx + ox, ty + oy); ctx.stroke(); }
      break;
    }
    case "eraser": {
      const eraserBg = document.documentElement.classList.contains("dark") ? "#1b1f2e" : "#ffffff";
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = eraserBg; ctx.lineWidth = pw; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke(); break;
    }
    case "spray": break;
  }
  ctx.restore();
}

function renderPuff(ctx: CanvasRenderingContext2D, stroke: Stroke, point: Point, pointIdx: number) {
  const px = point.x * VIRTUAL_W, py = point.y * VIRTUAL_H;
  const pw = Math.max(1, toPW(stroke.width));
  ctx.save();
  if (stroke.tool === "spray") {
    const rand = mkRand(hashStr(stroke.strokeId) ^ (pointIdx * 2654435761)), radius = pw * 0.92;
    ctx.fillStyle = stroke.color;
    for (let i = 0; i < 30; i++) { const angle = rand() * Math.PI * 2, r = Math.sqrt(rand()) * radius; ctx.globalAlpha = (stroke.opacity ?? 1) * (rand() * 0.45 + 0.08); ctx.beginPath(); ctx.arc(px + Math.cos(angle) * r, py + Math.sin(angle) * r, rand() * 1.5 + 0.2, 0, Math.PI * 2); ctx.fill(); }
  } else if (stroke.tool === "eraser") {
    const eraserBg2 = document.documentElement.classList.contains("dark") ? "#1b1f2e" : "#ffffff";
    ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = eraserBg2; ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, pw / 2), 0, Math.PI * 2); ctx.fill();
  } else if (stroke.tool === "marker") {
    ctx.fillStyle = stroke.color; ctx.globalAlpha = (stroke.opacity ?? 1) * 0.22;
    ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, pw / 2), 0, Math.PI * 2); ctx.fill();
  } else if (stroke.tool === "highlighter") {
    ctx.fillStyle = stroke.color; ctx.globalAlpha = (stroke.opacity ?? 1) * 0.35; ctx.globalCompositeOperation = "multiply";
    ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, pw / 2), 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = stroke.color; ctx.globalAlpha = stroke.opacity ?? 1;
    ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, pw / 2), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// RAF-batched remote point queue for performance
let _pendingPoints: Array<{strokeId: string; point: Point}> = [];
let _rafPending = false;

export interface CanvasHandle {
  redrawAll: (strokes: Stroke[]) => void;
  getCanvasEl: () => HTMLCanvasElement | null;
  applyRemoteStrokeStart: (stroke: Stroke) => void;
  applyRemoteStrokePoint: (strokeId: string, point: Point) => void;
  applyRemoteStrokeEnd: (strokeId: string, shapeEnd?: Point) => void;
  removeStroke: (strokeId: string) => void;
  addStroke: (stroke: Stroke) => void;
  clearCanvas: () => void;
  downloadPNG: (filename?: string) => void;
}

const SHAPE_TOOLS = new Set(["line", "arrow", "rect", "rect-rounded", "ellipse", "triangle", "diamond"]);
export const isShapeTool = (t: Tool) => SHAPE_TOOLS.has(t);

interface CanvasProps {
  tool: Tool; color: string; fillColor: string | undefined;
  width: number; opacity: number; shiftConstrain: boolean; zoom: number;
  onStrokeStart: (s: { strokeId: string; color: string; fillColor?: string; width: number; opacity: number; tool: Tool; point: Point }) => void;
  onStrokePoint: (strokeId: string, point: Point) => void;
  onStrokeEnd: (strokeId: string, stroke: Stroke, shapeEnd?: Point) => void;
  onCursorMove: (point: Point) => void;
  disabled?: boolean;
  onTextPlace?: (point: Point) => void;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { tool, color, fillColor, width, opacity, shiftConstrain, zoom,
    onStrokeStart, onStrokePoint, onStrokeEnd, onCursorMove, disabled, onTextPlace },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const historyRef = useRef<Stroke[]>([]);
  const activeRef = useRef<Map<string, Stroke>>(new Map());
  const localIdRef = useRef<string | null>(null);
  const lastCursorRef = useRef(0);
  const pointerActiveRef = useRef(false);
  const sprayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPosRef = useRef<Point | null>(null);
  const startPtRef = useRef<Point | null>(null);
  const lastSpeedRef     = useRef<number>(0);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Pinch-to-zoom state
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const activeTouchesRef = useRef<Map<number, Touch>>(new Map());

  const drawStroke = useCallback((stroke: Stroke) => {
    const ctx = ctxRef.current; if (!ctx) return;
    if (stroke.tool === "text") { renderText(ctx, stroke); return; }
    if (isShapeTool(stroke.tool)) { renderShape(ctx, stroke); return; }
    if (stroke.tool === "spray") { stroke.points.forEach((pt, i) => renderPuff(ctx, stroke, pt, i)); }
    else if (stroke.points.length === 1) { renderPuff(ctx, stroke, stroke.points[0], 0); }
    else { renderSmoothStroke(ctx, stroke); }
  }, []);

  const getCanvasBg = useCallback(() => {
    // Read CSS variable so dark mode canvas matches the UI
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
      if (raw) return `oklch(${raw.replace("oklch(","").replace(")","")})`;
    } catch {}
    return "#ffffff";
  }, []);

  const fillBg = useCallback(() => {
    const ctx = ctxRef.current, c = canvasRef.current; if (!ctx || !c) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    // Use CSS variable for paper color so dark mode works
    const bg = document.documentElement.classList.contains("dark")
      ? getComputedStyle(document.documentElement).getPropertyValue("--paper-hex").trim() || "#1b1f2e"
      : "#ffffff";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    ctx.restore();
  }, []);

  const redrawAll = useCallback((strokes: Stroke[]) => {
    const ctx = ctxRef.current; if (!ctx) return;
    fillBg(); historyRef.current = strokes;
    strokes.forEach(drawStroke);
    Array.from(activeRef.current.values()).forEach(drawStroke);
  }, [drawStroke, fillBg]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = VIRTUAL_W * dpr; canvas.height = VIRTUAL_H * dpr;
    canvas.style.width = `${VIRTUAL_W}px`; canvas.style.height = `${VIRTUAL_H}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctxRef.current = ctx; }
    fillBg(); redrawAll(historyRef.current);
  }, []); // eslint-disable-line

  // Redraw when dark mode class changes on <html>
  useEffect(() => {
    const obs = new MutationObserver(() => redrawAll(historyRef.current));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [redrawAll]);

  useImperativeHandle(ref, () => ({
    redrawAll,
    getCanvasEl: () => canvasRef.current,
    applyRemoteStrokeStart: (stroke) => {
      activeRef.current.set(stroke.strokeId, { ...stroke, points: [...stroke.points] });
      if (isShapeTool(stroke.tool) || stroke.tool === "text") return;
      if (stroke.points.length > 0) { const ctx = ctxRef.current; if (ctx) renderPuff(ctx, stroke, stroke.points[0], 0); }
    },
    applyRemoteStrokePoint: (strokeId, point) => {
      const stroke = activeRef.current.get(strokeId); if (!stroke) return;
      if (isShapeTool(stroke.tool)) {
        const prev2 = stroke.shapeEnd;
        if (prev2) {
          const dx2=(point.x-prev2.x)*VIRTUAL_W, dy2=(point.y-prev2.y)*VIRTUAL_H;
          if (dx2*dx2+dy2*dy2 < 9) return;
        }
        activeRef.current.set(strokeId, { ...stroke, shapeEnd: point });
        redrawAll(historyRef.current); const ctx = ctxRef.current; if (ctx) renderShape(ctx, { ...stroke, shapeEnd: point }); return;
      }
      // Batch remote points via RAF — renders many points in one frame
      _pendingPoints.push({ strokeId, point });
      if (!_rafPending) {
        _rafPending = true;
        requestAnimationFrame(() => {
          _rafPending = false;
          const ctx = ctxRef.current; if (!ctx) return;
          for (const { strokeId: sid, point: pt } of _pendingPoints) {
            const s = activeRef.current.get(sid); if (!s) continue;
            if (isShapeTool(s.tool)) continue;
            const idx = s.points.length;
            if (s.tool === "spray") renderPuff(ctx, s, pt, idx);
            else { const prev = s.points[idx-1]; if (prev) renderSegment(ctx, s, prev, pt, hashStr(s.strokeId)^(idx*1234567)); }
            s.points.push(pt);
          }
          _pendingPoints = [];
        });
      }
    },
    applyRemoteStrokeEnd: (strokeId, shapeEnd) => {
      const stroke = activeRef.current.get(strokeId);
      if (stroke) { const final = { ...stroke, ...(shapeEnd ? { shapeEnd } : {}) }; historyRef.current = [...historyRef.current, final]; activeRef.current.delete(strokeId); redrawAll(historyRef.current); }
    },
    removeStroke: (strokeId) => { historyRef.current = historyRef.current.filter(s => s.strokeId !== strokeId); redrawAll(historyRef.current); },
    addStroke: (stroke) => { historyRef.current = [...historyRef.current, stroke]; drawStroke(stroke); },
    clearCanvas: () => { historyRef.current = []; activeRef.current.clear(); redrawAll([]); },
    downloadPNG: (filename = "sketchline-board.png") => {
      const canvas = canvasRef.current; if (!canvas) return;
      // Create a clean export canvas (no DPR scaling visible to user)
      const exp = document.createElement("canvas");
      exp.width = VIRTUAL_W; exp.height = VIRTUAL_H;
      const ectx = exp.getContext("2d"); if (!ectx) return;
      ectx.fillStyle = "#ffffff"; ectx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      ectx.drawImage(canvas, 0, 0, VIRTUAL_W, VIRTUAL_H);
      const link = document.createElement("a");
      link.download = filename; link.href = exp.toDataURL("image/png");
      link.click();
    },
  }), [redrawAll, drawStroke]);

  const stopSpray = () => { if (sprayTimerRef.current) { clearInterval(sprayTimerRef.current); sprayTimerRef.current = null; } };

  const toNorm = (cx: number, cy: number): Point => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (cx - r.left) / r.width)), y: Math.min(1, Math.max(0, (cy - r.top) / r.height)) };
  };

  const constrain = (start: Point, end: Point): Point => {
    if (!shiftConstrain) return end;
    const dx = (end.x - start.x) * VIRTUAL_W, dy = (end.y - start.y) * VIRTUAL_H;
    const snap = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    const dist = Math.sqrt(dx * dx + dy * dy);
    return { x: start.x + Math.cos(snap) * dist / VIRTUAL_W, y: start.y + Math.sin(snap) * dist / VIRTUAL_H };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || tool === "pan" || tool === "select") return;
    if (e.pointerType === "touch") return; // handled by touch events
    if (tool === "text") { onTextPlace?.(toNorm(e.clientX, e.clientY)); return; }
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const point = toNorm(e.clientX, e.clientY);
    lastPosRef.current = point; startPtRef.current = point;
    const strokeId = crypto.randomUUID();
    localIdRef.current = strokeId; pointerActiveRef.current = true;
    lastSpeedRef.current = 0;
    const normW = width / WIDTH_REF;
    const stroke: Stroke = { strokeId, color: tool === "eraser" ? "#ffffff" : color, fillColor: tool === "eraser" ? undefined : (fillColor || undefined), width: normW, opacity: tool === "eraser" ? 1 : opacity, tool, points: [point] };
    activeRef.current.set(strokeId, stroke);
    if (!isShapeTool(tool)) { const ctx = ctxRef.current; if (ctx) renderPuff(ctx, stroke, point, 0); }
    onStrokeStart({ strokeId, color: stroke.color, fillColor: stroke.fillColor, width: normW, opacity: stroke.opacity, tool, point });
    if (tool === "spray") {
      sprayTimerRef.current = setInterval(() => {
        const pos = lastPosRef.current; if (!pos || !pointerActiveRef.current) return;
        const s = activeRef.current.get(strokeId); if (!s) return;
        const ctx = ctxRef.current; if (!ctx) return;
        const idx = s.points.length; renderPuff(ctx, s, pos, idx); s.points.push(pos); onStrokePoint(strokeId, pos);
      }, 40);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") return;
    const raw = toNorm(e.clientX, e.clientY);
    lastPosRef.current = raw;
    const now = performance.now();
    if (now - lastCursorRef.current >= 100) { lastCursorRef.current = now; onCursorMove(raw); }
    if (!pointerActiveRef.current || disabled || tool === "pan" || tool === "text" || tool === "select") return;
    const strokeId = localIdRef.current; if (!strokeId) return;
    const stroke = activeRef.current.get(strokeId); if (!stroke) return;
    const point = startPtRef.current ? constrain(startPtRef.current, raw) : raw;
    if (isShapeTool(tool)) {
      const ctx = ctxRef.current; if (!ctx) return;
      redrawAll(historyRef.current);
      Array.from(activeRef.current.values()).forEach(s => { if (s.strokeId !== strokeId) drawStroke(s); });
      renderShape(ctx, { ...stroke, shapeEnd: point }); return;
    }
    if (tool === "spray") return;
    const prev = stroke.points[stroke.points.length - 1];
    if (prev) {
      const ddx = (point.x - prev.x) * VIRTUAL_W, ddy = (point.y - prev.y) * VIRTUAL_H;
      if (ddx * ddx + ddy * ddy < 1.5) return;
      const ctx = ctxRef.current;
      if (ctx) renderSegment(ctx, stroke, prev, point, hashStr(strokeId) ^ (stroke.points.length * 1234567));
    }
    // Pressure from speed: fast = thin, slow = thick
    const now2 = performance.now();
    const rawSpeed = (() => {
      const prev2 = stroke.points[stroke.points.length - 1];
      if (!prev2) return 0;
      const ddx = (point.x - prev2.x) * VIRTUAL_W;
      const ddy = (point.y - prev2.y) * VIRTUAL_H;
      return Math.sqrt(ddx*ddx + ddy*ddy);
    })();
    // Smooth speed with exponential moving average
    lastSpeedRef.current = lastSpeedRef.current * 0.6 + rawSpeed * 0.4;
    const pressure = Math.max(0.35, Math.min(1.0, 1.0 - lastSpeedRef.current / 120));
    (point as Point & { pressure?: number }).pressure = pressure;
    stroke.points.push(point); onStrokePoint(strokeId, point);
  };

  const endStroke = (e?: React.PointerEvent) => {
    if (!pointerActiveRef.current) return;
    pointerActiveRef.current = false; stopSpray();
    const strokeId = localIdRef.current; localIdRef.current = null; if (!strokeId) return;
    const stroke = activeRef.current.get(strokeId); if (!stroke) return;
    if (isShapeTool(tool) && startPtRef.current && e) {
      const shapeEnd = constrain(startPtRef.current, toNorm(e.clientX, e.clientY));
      const dx = (shapeEnd.x - startPtRef.current.x) * VIRTUAL_W, dy = (shapeEnd.y - startPtRef.current.y) * VIRTUAL_H;
      if (Math.sqrt(dx * dx + dy * dy) < 3) { activeRef.current.delete(strokeId); redrawAll(historyRef.current); startPtRef.current = null; return; }
      const final = { ...stroke, shapeEnd };
      historyRef.current = [...historyRef.current, final]; activeRef.current.delete(strokeId);
      redrawAll(historyRef.current); onStrokeEnd(strokeId, final, shapeEnd);
    } else {
      historyRef.current = [...historyRef.current, stroke]; activeRef.current.delete(strokeId); onStrokeEnd(strokeId, stroke, undefined);
    }
    startPtRef.current = null;
  };

  // ── Touch: single-finger draw, two-finger pinch-zoom ─────────────────────────
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    Array.from(e.changedTouches).forEach(t => activeTouchesRef.current.set(t.identifier, t as unknown as Touch));
    if (activeTouchesRef.current.size === 2) {
      // Stop any drawing stroke
      if (pointerActiveRef.current) { pointerActiveRef.current = false; stopSpray(); localIdRef.current = null; }
      const touches = Array.from(activeTouchesRef.current.values());
      const dx = touches[1].clientX - touches[0].clientX, dy = touches[1].clientY - touches[0].clientY;
      pinchRef.current = { dist: Math.sqrt(dx * dx + dy * dy), midX: (touches[0].clientX + touches[1].clientX) / 2, midY: (touches[0].clientY + touches[1].clientY) / 2 };
      return;
    }
    if (activeTouchesRef.current.size === 1 && !disabled && tool !== "pan" && tool !== "select") {
      const t = e.changedTouches[0];
      if (tool === "text") { onTextPlace?.(toNorm(t.clientX, t.clientY)); return; }
      const point = toNorm(t.clientX, t.clientY);
      lastPosRef.current = point; startPtRef.current = point;
      const strokeId = crypto.randomUUID();
      localIdRef.current = strokeId; pointerActiveRef.current = true;
      const normW = width / WIDTH_REF;
      const stroke: Stroke = { strokeId, color: tool === "eraser" ? "#ffffff" : color, fillColor: tool === "eraser" ? undefined : (fillColor || undefined), width: normW, opacity: tool === "eraser" ? 1 : opacity, tool, points: [point] };
      activeRef.current.set(strokeId, stroke);
      if (!isShapeTool(tool)) { const ctx = ctxRef.current; if (ctx) renderPuff(ctx, stroke, point, 0); }
      onStrokeStart({ strokeId, color: stroke.color, fillColor: stroke.fillColor, width: normW, opacity: stroke.opacity, tool, point });
      if (tool === "spray") {
        sprayTimerRef.current = setInterval(() => {
          const pos = lastPosRef.current; if (!pos || !pointerActiveRef.current) return;
          const s = activeRef.current.get(strokeId); if (!s) return;
          const ctx = ctxRef.current; if (!ctx) return;
          const idx = s.points.length; renderPuff(ctx, s, pos, idx); s.points.push(pos); onStrokePoint(strokeId, pos);
        }, 40);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t => activeTouchesRef.current.set(t.identifier, t as unknown as Touch));
    if (activeTouchesRef.current.size === 2 && pinchRef.current) {
      const touches = Array.from(activeTouchesRef.current.values());
      const dx = touches[1].clientX - touches[0].clientX, dy = touches[1].clientY - touches[0].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const scale = newDist / pinchRef.current.dist;
      // Dispatch zoom via custom event (page.tsx listens)
      const newZoom = Math.min(4, Math.max(0.25, zoomRef.current * scale));
      window.dispatchEvent(new CustomEvent("canvas-pinch-zoom", { detail: { zoom: newZoom } }));
      pinchRef.current = { dist: newDist, midX: (touches[0].clientX + touches[1].clientX) / 2, midY: (touches[0].clientY + touches[1].clientY) / 2 };
      return;
    }
    if (!pointerActiveRef.current || activeTouchesRef.current.size !== 1) return;
    const t = e.changedTouches[0];
    const raw = toNorm(t.clientX, t.clientY);
    lastPosRef.current = raw;
    const strokeId = localIdRef.current; if (!strokeId) return;
    const stroke = activeRef.current.get(strokeId); if (!stroke) return;
    const point = startPtRef.current ? constrain(startPtRef.current, raw) : raw;
    if (isShapeTool(tool)) {
      const ctx = ctxRef.current; if (!ctx) return;
      redrawAll(historyRef.current);
      Array.from(activeRef.current.values()).forEach(s => { if (s.strokeId !== strokeId) drawStroke(s); });
      renderShape(ctx, { ...stroke, shapeEnd: point }); return;
    }
    if (tool === "spray") return;
    const prev = stroke.points[stroke.points.length - 1];
    if (prev) {
      const ddx = (point.x - prev.x) * VIRTUAL_W, ddy = (point.y - prev.y) * VIRTUAL_H;
      if (ddx * ddx + ddy * ddy < 1.5) return;
      const ctx = ctxRef.current;
      if (ctx) renderSegment(ctx, stroke, prev, point, hashStr(strokeId) ^ (stroke.points.length * 1234567));
    }
    // Pressure from speed: fast = thin, slow = thick
    const now2 = performance.now();
    const rawSpeed = (() => {
      const prev2 = stroke.points[stroke.points.length - 1];
      if (!prev2) return 0;
      const ddx = (point.x - prev2.x) * VIRTUAL_W;
      const ddy = (point.y - prev2.y) * VIRTUAL_H;
      return Math.sqrt(ddx*ddx + ddy*ddy);
    })();
    // Smooth speed with exponential moving average
    lastSpeedRef.current = lastSpeedRef.current * 0.6 + rawSpeed * 0.4;
    const pressure = Math.max(0.35, Math.min(1.0, 1.0 - lastSpeedRef.current / 120));
    (point as Point & { pressure?: number }).pressure = pressure;
    stroke.points.push(point); onStrokePoint(strokeId, point);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    Array.from(e.changedTouches).forEach(t => activeTouchesRef.current.delete(t.identifier));
    if (activeTouchesRef.current.size < 2) pinchRef.current = null;
    if (activeTouchesRef.current.size === 0 && pointerActiveRef.current) {
      pointerActiveRef.current = false; stopSpray();
      const strokeId = localIdRef.current; localIdRef.current = null; if (!strokeId) return;
      const stroke = activeRef.current.get(strokeId); if (!stroke) return;
      if (isShapeTool(tool) && startPtRef.current) {
        const t = e.changedTouches[0];
        const shapeEnd = t ? constrain(startPtRef.current, toNorm(t.clientX, t.clientY)) : startPtRef.current;
        const dx = (shapeEnd.x - startPtRef.current.x) * VIRTUAL_W, dy = (shapeEnd.y - startPtRef.current.y) * VIRTUAL_H;
        if (Math.sqrt(dx * dx + dy * dy) < 3) { activeRef.current.delete(strokeId); redrawAll(historyRef.current); startPtRef.current = null; return; }
        const final = { ...stroke, shapeEnd };
        historyRef.current = [...historyRef.current, final]; activeRef.current.delete(strokeId); redrawAll(historyRef.current); onStrokeEnd(strokeId, final, shapeEnd);
      } else {
        historyRef.current = [...historyRef.current, stroke]; activeRef.current.delete(strokeId); onStrokeEnd(strokeId, stroke, undefined);
      }
      startPtRef.current = null;
    }
  };

  const getCursor = () => {
    if (tool === "pan") return "grab";
    if (tool === "eraser") return "cell";
    if (tool === "text") return "text";
    if (tool === "select") return "default";
    return "crosshair";
  };

  return (
    <canvas ref={canvasRef}
      style={{ cursor: getCursor(), display: "block", touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerLeave={endStroke}
      onPointerCancel={endStroke}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    />
  );
});

export default Canvas;

