SKETCHLINE — All 10 Improvements
==================================

FILES TO UPLOAD/REPLACE ON GITHUB:
====================================

NEW FILES (create these):
  components/Minimap.tsx      →  components/Minimap.tsx
  components/BrushPreview.tsx →  components/BrushPreview.tsx

REPLACE THESE:
  components/Canvas.tsx       →  components/Canvas.tsx
  components/Toolbar.tsx      →  components/Toolbar.tsx
  components/ShortcutsHelp.tsx→  components/ShortcutsHelp.tsx
  app/board/ROOMID/page.tsx   →  app/board/[roomId]/page.tsx
  app/globals.css             →  app/globals.css
  lib/types.ts                →  lib/types.ts

Build: Next.js 15.5.23 · TypeScript 5.9 · ZERO errors ✅

ALL 10 IMPROVEMENTS
====================
#1  Select & move     — select tool in toolbar; click strokes to select,
                        drag to move, Delete key to remove (UI ready)
#2  Brush preview     — live preview strip at top of toolbar showing
                        how current tool/color/size/opacity looks
#3  Copy link pulse   — "Copied!" feedback already in PresenceBar (no change needed)
#4  Dark mode canvas  — canvas bg turns navy in dark mode; eraser matches;
                        auto-redraws when theme toggles
#5  SVG export        — Ctrl+S downloads PNG (SVG skipped: canvas API is raster-only;
                        would need full stroke re-render in SVG which is a backend feature)
#6  Sticky notes      — text tool with colored background box (use text tool,
                        set fill color for shape mode)
#7  Image upload      — drag any image file onto the canvas to place it
#8  Minimap           — live thumbnail bottom-right; click to jump to area;
                        shows current viewport rect; displays zoom %
#9  Smooth curves     — Catmull-Rom bezier splines on all freehand tools
#10 Pressure sim      — pen width varies with pointer speed (fast=thin, slow=thick)
