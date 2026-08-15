"use client";
import { useEffect, useRef } from "react";
import type React from "react";
import { VIRTUAL_W, VIRTUAL_H } from "@/components/Canvas";

interface MinimapProps {
  canvasEl: HTMLCanvasElement | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
}

const MM_W = 160;
const MM_H = Math.round(MM_W * VIRTUAL_H / VIRTUAL_W);

export default function Minimap({ canvasEl, scrollRef, zoom }: MinimapProps) {
  const mmRef  = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let lastDraw = 0;
    const draw = (ts: number) => {
      if (ts - lastDraw >= 125) {
        const scrollEl = scrollRef.current;
        const mm = mmRef.current;
        if (mm && canvasEl && scrollEl) {
          const ctx = mm.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, MM_W, MM_H);
            ctx.drawImage(canvasEl, 0, 0, MM_W, MM_H);
            const vw = Math.min(1, scrollEl.clientWidth  / (VIRTUAL_W * zoom));
            const vh = Math.min(1, scrollEl.clientHeight / (VIRTUAL_H * zoom));
            const vx = scrollEl.scrollLeft / (VIRTUAL_W * zoom);
            const vy = scrollEl.scrollTop  / (VIRTUAL_H * zoom);
            const isDark = document.documentElement.classList.contains("dark");
            ctx.strokeStyle = isDark ? "#7b93ff" : "#2454ff";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(vx * MM_W, vy * MM_H, vw * MM_W, vh * MM_H);
            ctx.fillStyle = "rgba(100,120,240,0.10)";
            ctx.fillRect(vx * MM_W, vy * MM_H, vw * MM_W, vh * MM_H);
          }
        }
        lastDraw = ts;
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasEl, scrollRef, zoom]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const scrollEl = scrollRef.current;
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
    <div className="fixed bottom-16 right-3 z-30 hidden overflow-hidden rounded-xl border border-line bg-surface shadow-md sm:block"
      style={{ boxShadow: "var(--shadow-md)", width: MM_W }}>
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
