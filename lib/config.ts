export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") || "ws://127.0.0.1:7860";

export function wsUrlForRoom(roomId: string, name: string): string {
  const encodedName = encodeURIComponent(name);
  return `${WS_BASE_URL}/ws/${roomId}?name=${encodedName}`;
}

export function randomRoomId(): string {
  const part = () => Math.random().toString(36).slice(2, 6);
  return `${part()}-${part()}`;
}
