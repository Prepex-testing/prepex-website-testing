/** Studying Now -> Join: the friend to mark the next focus session with, kept for this tab until the session starts. */

const KEY = "prepex-pexo-join";
const MAX_AGE_MS = 10 * 60_000;

export function setPendingJoin(friendId: string, name: string): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ friendId, name, at: Date.now() }));
  } catch {
    /* the session simply starts without the "studying with" mark */
  }
}

export function takePendingJoin(): { friendId: string; name: string } | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { friendId: string; name: string; at: number };
    return Date.now() - p.at > MAX_AGE_MS ? null : { friendId: p.friendId, name: p.name };
  } catch {
    return null;
  }
}
