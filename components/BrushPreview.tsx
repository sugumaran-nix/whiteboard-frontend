"use client";
// #2 — Live brush stroke preview strip in toolbar
import { useEffect, useRef } from "react";

interface BrushPreviewProps {
  tool: string;
  color: string;
  width: number;   // px at 900 ref width
  opacity: number;
}

const PREVIEW_W = 152;
const PREVIEW_H = 36;
const VIRTUAL_SCALE = (4000 + 3000) / 2;

// Sample bezier curve path for preview
const SAMPLE_PTS = [
  { x: 8,  y: 26 }, { x: 24, y: 10 }, { x: 44, y: 28 },
  { x: 64, y: 10 }, { x: 84, y: 24 }, { x: 104, y: 12 },
  { x: 124, y: 22 }, { x: 144, y: 14 },
];

function drawPreview(
  ctx: CanvasRenderingContext2D,
  tool: string,
  color: string,
  widthPx: number,
  opacity: number,
  isDark: boolean,
) {
  const W = PREVIEW_W, H = PREVIEW_H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = isDark ? "#1b1f2e" : "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const pw = Math.max(1, (widthPx / 900) * VIRTUAL_SCALE * (W / 4000));
  ctx.save();

  const path = () => {
    ctx.beginPath();
    ctx.moveTo(SAMPLE_PTS[0].x, SAMPLE_PTS[0].y);
    for (let i = 0; i < SAMPLE_PTS.length - 1; i++) {
      const p0 = SAMPLE_PTS[Math.max(i-1,0)], p1 = SAMPLE_PTS[i];
      const p2 = SAMPLE_PTS[i+1], p3 = SAMPLE_PTS[Math.min(i+2,SAMPLE_PTS.length-1)];
      ctx.bezierCurveTo(
        p1.x+(p2.x-p0.x)/6, p1.y+(p2.y-p0.y)/6,
        p2.x-(p3.x-p1.x)/6, p2.y-(p3.y-p1.y)/6,
        p2.x, p2.y
      );
    }
  };

  ctx.globalAlpha = opacity;
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  switch (tool) {
    case "pen":
      ctx.strokeStyle = color; ctx.lineWidth = pw;
      path(); ctx.stroke(); break;
    case "pencil":
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.5, pw * 0.4);
      ctx.globalAlpha = opacity * 0.85;
      path(); ctx.stroke(); break;
    case "marker":
      ctx.strokeStyle = color; ctx.lineWidth = pw * 3.2;
      ctx.lineCap = "butt";
      ctx.globalAlpha = opacity * 0.22;
      path(); ctx.stroke(); break;
    case "highlighter":
      ctx.strokeStyle = color; ctx.lineWidth = pw * 4;
      ctx.lineCap = "square";
      ctx.globalAlpha = opacity * 0.35;
      ctx.globalCompositeOperation = "multiply";
      path(); ctx.stroke(); break;
    case "calligraphy":
      ctx.fillStyle = color; ctx.globalAlpha = opacity * 0.92;
      for (let i=0;i<SAMPLE_PTS.length-1;i++){
        const dx=SAMPLE_PTS[i+1].x-SAMPLE_PTS[i].x, dy=SAMPLE_PTS[i+1].y-SAMPLE_PTS[i].y;
        const len=Math.sqrt(dx*dx+dy*dy), steps=Math.max(1,Math.ceil(len/2));
        for(let s=0;s<=steps;s++){const t=s/steps;ctx.beginPath();ctx.ellipse(SAMPLE_PTS[i].x+dx*t,SAMPLE_PTS[i].y+dy*t,pw*0.85,pw*0.16,Math.PI/4,0,Math.PI*2);ctx.fill();}
      } break;
    case "crayon":
      for(let p=0;p<4;p++){
        const ox=(Math.sin(p*1.7)-0.5)*pw*0.55,oy=(Math.cos(p*2.3)-0.5)*pw*0.55;
        ctx.strokeStyle=color;ctx.lineWidth=pw*(0.3+p*0.12);
        ctx.globalAlpha=opacity*(0.2+p*0.07);
        ctx.beginPath();ctx.moveTo(SAMPLE_PTS[0].x+ox,SAMPLE_PTS[0].y+oy);
        for(let i=1;i<SAMPLE_PTS.length;i++)ctx.lineTo(SAMPLE_PTS[i].x+ox,SAMPLE_PTS[i].y+oy);
        ctx.stroke();
      } break;
    case "oil":
      for(let i=0;i<7;i++){
        const t=i/6-0.5,off=t*pw*0.92;
        ctx.strokeStyle=color;ctx.lineWidth=Math.max(0.5,pw*0.12);
        ctx.globalAlpha=opacity*0.45;
        ctx.beginPath();
        ctx.moveTo(SAMPLE_PTS[0].x-SAMPLE_PTS[0].y*0+off,SAMPLE_PTS[0].y+off*0.3);
        for(let j=1;j<SAMPLE_PTS.length;j++)ctx.lineTo(SAMPLE_PTS[j].x+off*0.2,SAMPLE_PTS[j].y+off*0.8);
        ctx.stroke();
      } break;
    case "watercolour":
      for(let p=0;p<5;p++){
        const ox=(Math.sin(p*2.1)-0.5)*pw*0.5,oy=(Math.cos(p*1.9)-0.5)*pw*0.5;
        ctx.strokeStyle=color;ctx.lineWidth=pw*(0.7+p*0.15);
        ctx.globalAlpha=opacity*0.04;
        ctx.beginPath();ctx.moveTo(SAMPLE_PTS[0].x+ox,SAMPLE_PTS[0].y+oy);
        for(let i=1;i<SAMPLE_PTS.length;i++)ctx.lineTo(SAMPLE_PTS[i].x+ox,SAMPLE_PTS[i].y+oy);
        ctx.stroke();
      } break;
    case "spray": {
      ctx.fillStyle=color;
      const cxs=[30,60,90,120],cys=[20,12,24,15];
      cxs.forEach((cx,i)=>{
        for(let d=0;d<12;d++){
          const angle=d/12*Math.PI*2,r=Math.sqrt(Math.random())*pw*0.7;
          ctx.globalAlpha=opacity*(0.1+Math.random()*0.3);
          ctx.beginPath();ctx.arc(cx+Math.cos(angle)*r,cys[i]+Math.sin(angle)*r,0.8,0,Math.PI*2);ctx.fill();
        }
      }); break;
    }
    case "eraser":
      ctx.strokeStyle=isDark?"#1b1f2e":"#ffffff";ctx.lineWidth=pw;
      ctx.globalAlpha=1;path();ctx.stroke();
      ctx.strokeStyle="#bbbbcc";ctx.lineWidth=1;ctx.setLineDash([3,3]);
      path();ctx.stroke();ctx.setLineDash([]);break;
    default: break;
  }
  ctx.restore();
}

export default function BrushPreview({ tool, color, width, opacity }: BrushPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    // Only resize if needed — avoids flicker on re-renders
    if (canvas.width !== PREVIEW_W * dpr) {
      canvas.width = PREVIEW_W * dpr; canvas.height = PREVIEW_H * dpr;
      canvas.style.width = PREVIEW_W + "px"; canvas.style.height = PREVIEW_H + "px";
    }
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const isDark = document.documentElement.classList.contains("dark");
    drawPreview(ctx, tool, color, width, opacity, isDark);
  }, [tool, color, width, opacity]);

  return (
    <div className="mx-1 mb-1 overflow-hidden rounded-lg border border-line">
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
