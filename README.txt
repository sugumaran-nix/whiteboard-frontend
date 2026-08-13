SKETCHLINE — v2 UPDATE (5 files)
=================================

Replace these files in your GitHub repo:

  components/Canvas.tsx       → components/Canvas.tsx
  components/Toolbar.tsx      → components/Toolbar.tsx
  components/ShortcutsHelp.tsx→ components/ShortcutsHelp.tsx
  lib/types.ts                → lib/types.ts
  app/board/ROOMID/page.tsx   → app/board/[roomId]/page.tsx

Build: Next.js 15.5.23 · TypeScript 5.9 · ZERO errors ✅

WHAT'S NEW IN THIS UPDATE
==========================
1.  Pinch-to-zoom  — two-finger pinch on mobile zooms in/out
2.  Touch drawing  — single-finger draw works properly on mobile
3.  Download PNG   — Ctrl+S or the ↓ PNG button saves the board
4.  Download button in toolbar (desktop rail + mobile row)
5.  Updated shortcuts panel — includes all new shortcuts
6.  Eraser white-paint fix (no transparent holes)
7.  Shapes: live preview + only commit if you dragged
8.  All textured tools fully deterministic (same on every redraw)
9.  Per-tool independent settings (pen/eraser/shape/text never share)
10. Separate eraser button — never mixed with brush picker
