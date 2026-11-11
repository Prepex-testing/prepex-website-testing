import { claimInvite } from "@/lib/api/pexo";

/**
 * An invite link (/join/<code>) is remembered on this device until the student is signed in, then claimed once. The
 * server accepts a claim only for a new account, so an old account opening a link changes nothing.
 */

const KEY = "prepex-invite";
const MAX_AGE_MS = 7 * 86_400_000;

export type PendingInvite = { code: string; utm: { source?: string; medium?: string; campaign?: string }; at: number };

export function savePendingInvite(code: string, search: URLSearchParams | null): void {
  const utm: PendingInvite["utm"] = {};
  const s = search?.get("utm_source");
  const m = search?.get("utm_medium");
  const c = search?.get("utm_campaign");
  if (s) utm.source = s.slice(0, 60);
  if (m) utm.medium = m.slice(0, 60);
  if (c) utm.campaign = c.slice(0, 80);
  if (!utm.source) utm.source = "invite_link";
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ code, utm, at: Date.now() } satisfies PendingInvite));
  } catch {
    /* private mode: the link simply is not attributed */
  }
}

export function readPendingInvite(): PendingInvite | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingInvite;
    if (!p.code || Date.now() - p.at > MAX_AGE_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

let claiming = false;
/** Called once the app shell is signed in. Whatever the answer, the pending link is used up. */
export async function claimPendingInvite(): Promise<boolean> {
  if (claiming || typeof window === "undefined") return false;
  const p = readPendingInvite();
  if (!p) return false;
  claiming = true;
  try {
    const r = await claimInvite(p.code, p.utm);
    window.localStorage.removeItem(KEY);
    return r.claimed;
  } catch {
    // a network error keeps it for the next visit
    return false;
  } finally {
    claiming = false;
  }
}
