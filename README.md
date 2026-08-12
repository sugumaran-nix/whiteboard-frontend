# Sketchline — Real-time Collaborative Whiteboard

> Draw together, live. Open a board, share the link — every stroke appears on everyone's screen the moment you draw it.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on_Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

**[🚀 Live Demo](https://whiteboard-frontend-nine-smoky.vercel.app)** · **[Backend Repo](https://github.com/sugumaran-nix/whiteboard-backend)**



<!--
---

Replace the line below with your actual demo GIF once recorded

![Sketchline Demo](./public/demo.gif) 

> 📸 **Demo GIF coming soon** — record a 15-second screen capture of multi-user drawing and drop it in `/public/demo.gif`, then uncomment the line above.

-->

---

## ✨ Features

- **9 brush types** — Pen, Pencil, Marker, Calligraphy, Crayon, Oil, Watercolour, Spray, Eraser
- **Real-time collaboration** — point-by-point WebSocket sync with live cursor tracking and user names
- **Undo / Redo** — up to 64 steps, synced across all users in the room
- **No login required** — enter a name, share the link, start drawing instantly
- **Auto-reconnect** — exponential backoff reconnection (500 ms → 8 s) with a live status banner
- **Recent boards** — last visited rooms saved locally for quick re-entry
- **Dark / Light theme** — toggle from the navbar
- **Full keyboard shortcuts** — `1–8` for brushes, `E` eraser, `Ctrl+Z/Y` undo/redo, `?` shortcut help, `[` `]` brush size
- **Mobile-ready** — collapsible desktop rail + bottom dock for touch devices

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS, shadcn/ui (Radix UI) |
| Real-time | Native WebSocket API |
| Deployment | Vercel |

---

## 📁 Project Structure

```
whiteboard-frontend/
├── app/
│   ├── page.tsx              # Landing page (create / join room)
│   └── board/[roomId]/
│       └── page.tsx          # Board page (canvas + toolbar + presence)
├── components/
│   ├── Canvas.tsx            # HTML5 Canvas drawing engine
│   ├── Toolbar.tsx           # Brush, color, size, undo/redo controls
│   ├── PresenceBar.tsx       # Top navbar — room info, users, copy link
│   ├── CursorLayer.tsx       # Overlays remote cursors with names
│   ├── NameModal.tsx         # Name entry on first join
│   ├── ShortcutsHelp.tsx     # Keyboard shortcuts overlay
│   ├── ThemeToggle.tsx       # Dark/light toggle
│   └── Toast.tsx             # Ephemeral toast messages
├── lib/
│   ├── config.ts             # WS URL config + room ID generator
│   ├── types.ts              # Shared TypeScript types (Stroke, Tool, ServerMessage…)
│   ├── board.ts              # Board utilities
│   └── recent.ts             # Recent boards (localStorage)
└── hooks/
    └── use-mobile.tsx
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- The backend running locally or deployed — see [whiteboard-backend](https://github.com/sugumaran-nix/whiteboard-backend)

### 1. Clone & install

```bash
git clone https://github.com/sugumaran-nix/whiteboard-frontend.git
cd whiteboard-frontend
npm install
```

### 2. Set environment variable

Create a `.env.local` file:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

For production, set this to your Render backend WebSocket URL:

```env
NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — click **New board** to start drawing.

---

## 🔌 WebSocket Protocol

The frontend connects to the backend via:

```
ws://<backend>/ws/<room_id>?name=<display_name>
```

Key client → server messages: `stroke_start`, `stroke_point`, `stroke_end`, `cursor`, `undo`, `redo`, `clear`, `set_name`

Key server → client messages: `init` (full stroke history on join), `user_joined`, `user_left`, `stroke_*`, `cursor`, `ping`

---

## 🌐 Deployment

The frontend is deployed on **Vercel**. To deploy your own:

1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add `NEXT_PUBLIC_WS_URL` as an environment variable pointing to your Render backend
4. Deploy — Vercel auto-builds on every push to `main`

---

## 📄 License

MIT
