// Backend WebSocket base URL, e.g. "wss://your-space.hf.space" in
// production or "ws://127.0.0.1:7860" while running the backend locally.
// Set via NEXT_PUBLIC_WS_URL at build/deploy time (see .env.local.example).
export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") || "ws://127.0.0.1:7860";

export function wsUrlForRoom(roomId: string, name: string): string {
  const encodedName = encodeURIComponent(name);
  return `${WS_BASE_URL}/ws/${roomId}?name=${encodedName}`;
}

export function randomRoomId(): string {
  // Short, URL-friendly, easy to read aloud — 3 groups of base36 chars.
  const part = () => Math.random().toString(36).slice(2, 6);
  return `${part()}-${part()}`;
}
