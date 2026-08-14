SKETCHLINE — Production polish (8 files)
=========================================

Upload each file to its GitHub path:

  components/Canvas.tsx       →  components/Canvas.tsx
  components/Toolbar.tsx      →  components/Toolbar.tsx
  components/Toast.tsx        →  components/Toast.tsx
  components/CursorLayer.tsx  →  components/CursorLayer.tsx
  components/NameModal.tsx    →  components/NameModal.tsx
  app/page.tsx                →  app/page.tsx
  app/board/ROOMID/page.tsx   →  app/board/[roomId]/page.tsx
  lib/types.ts                →  lib/types.ts

FIXES
=====
1. Blue dot indicator removed — only blue box remains (Toolbar)
2. Brush/shape/panel list icons now white when active (not blue-on-blue)
3. Active MobileDockBtn label turns accent colour (was faint/invisible)
4. NameModal join button & avatar use correct accent background (was broken CSS token)
5. Dead h-13 Tailwind class removed from landing page button
6. Unused onZoomChange/onPanChange props removed from Canvas
7. Toast repositioned above mobile toolbar (was overlapping)
8. Cursor layer transitions: 75ms + will-change for smoother remote cursors

Build: Next.js 15.5.23 · TypeScript 5.9 · ZERO errors ✅
