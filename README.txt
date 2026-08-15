SKETCHLINE — Audit Fixes
=========================

REPLACE ON GITHUB:
  components/Canvas.tsx       →  components/Canvas.tsx
  components/Minimap.tsx      →  components/Minimap.tsx
  components/BrushPreview.tsx →  components/BrushPreview.tsx
  app/board/ROOMID/page.tsx   →  app/board/[roomId]/page.tsx

Build: Zero TS errors ✅  Zero build errors ✅

WHAT WAS FIXED
==============
CRITICAL
  1. require() inside useCallback — illegal in Next.js ESM
     → Removed; VIRTUAL_W/H already imported at file top

  2. useCallback as inline JSX prop — React Rules of Hooks violation
     → Moved to top-level handleStrokePoint callback

  3. _pendingPoints/_rafPending as module globals — shared across
     all Canvas instances (multi-tab corruption)
     → Moved into component as useRef (instance-local)

MINOR
  4. Minimap used var(--accent) in canvas ctx — CSS vars don't work
     in canvas 2D API, renders transparent
     → Replaced with hardcoded hex (#2454ff / #7b93ff dark)

  5. Minimap received scrollRef.current (stale on first render)
     → Now receives the ref object itself, reads .current each frame

  6. getCanvasBg() defined but never called — dead code removed

  7. Dark mode class checked 4× separately — unified into canvasBg()
     helper function at module level

  8. BrushPreview used Math.random() — non-deterministic preview
     → Replaced with deterministic sin/cos values

  9. BrushPreview resized canvas on every render — flicker
     → Only resizes if dimensions changed

  10. Mobile safe-area: paddingBottom 134px hardcoded
      → Uses max(134px, 120px + safe-area-inset-bottom)
