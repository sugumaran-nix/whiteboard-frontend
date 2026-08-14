"use client";
// #8 — Minimap: thumbnail of full canvas showing current viewport
import { useEffect, useRef } from "react";
import { VIRTUAL_W, VIRTUAL_H } from "@/components/Canvas";

interface MinimapProps {
  canvasEl: HTMLCanvasElement | null;
  scrollEl: HTMLDivElement | null;
  zoom: number;
}

const MM_W = 160;
const MM_H = Math.round(MM_W * VIRTUAL_H / VIRTUAL_W);

export default function Minimap({ canvasEl, scrollEl, zoom }: MinimapProps) {
  const mmRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const draw = () => {
      const mm = mmRef.current; if (!mm || !canvasEl || !scrollEl) return;
      const ctx = mm.getContext("2d"); if (!ctx) return;
      ctx.clearRect(0, 0, MM_W, MM_H);
      // Draw scaled canvas
      ctx.drawImage(canvasEl, 0, 0, MM_W, MM_H);
      // Draw viewport rect
      const vw = scrollEl.clientWidth  / (VIRTUAL_W * zoom);
      const vh = scrollEl.clientHeight / (VIRTUAL_H * zoom);
      const vx = scrollEl.scrollLeft   / (VIRTUAL_W * zoom);
      const vy = scrollEl.scrollTop    / (VIRTUAL_H * zoom);
      ctx.strokeStyle = "var(--accent)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vx * MM_W, vy * MM_H, vw * MM_W, vh * MM_H);
      ctx.fillStyle = "oklch(0.68 0.18 264 / 0.12)";
      ctx.fillRect(vx * MM_W, vy * MM_H, vw * MM_W, vh * MM_H);
    };
    const loop = () => { draw(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasEl, scrollEl, zoom]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!scrollEl) return;
    const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const nx = (e.clientX - r.left) / MM_W;
    const ny = (e.clientY - r.top)  / MM_H;
    scrollEl.scrollTo({
      left: nx * VIRTUAL_W * zoom - scrollEl.clientWidth  / 2,
      top:  ny * VIRTUAL_H * zoom - scrollEl.clientHeight / 2,
      behavior: "smooth",
    });
  };

  return (
    <div className="fixed bottom-4 right-3 z-30 hidden overflow-hidden rounded-xl border border-line bg-surface shadow-md sm:block"
      style={{ boxShadow: "var(--shadow-md)", width: MM_W, marginBottom: 48 }}>
      <canvas ref={mmRef} width={MM_W} height={MM_H}
        onClick={handleClick}
        className="block cursor-crosshair"
        style={{ width: MM_W, height: MM_H }}
      />
      <div className="border-t border-line px-2 py-1 font-mono text-[9px] text-ink-faint text-center">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
