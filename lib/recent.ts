// Tiny localStorage-backed list of recently visited boards, used by the
// landing page so returning to a board is one click instead of a re-paste.
const KEY = "sketchline-recent";
const MAX = 5;

export interface RecentBoard {
  roomId: string;
  visitedAt: number;
}

export function readRecentBoards(): RecentBoard[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentBoard[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberBoard(roomId: string): void {
  if (!roomId) return;
  try {
    const next = [
      { roomId, visitedAt: Date.now() },
      ...readRecentBoards().filter((b) => b.roomId !== roomId),
    ].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode) — recents are a nicety only.
  }
}

export function relativeTime(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
