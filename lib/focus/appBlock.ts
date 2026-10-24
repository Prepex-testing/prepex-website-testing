/**
 * App blocking during a session.
 *
 *   native (the Android Capacitor app)  a plugin named `AppBlock` is called to block the apps for the session. That plugin
 *                                        is not part of this repo yet, so this only calls it when it is there.
 *   web / PWA                            browsers cannot block other apps, so the timer shows which apps are on the block list
 *                                        and, when the student comes back after leaving the tab, a short nag overlay.
 *
 * Nothing here ever throws into the timer: a missing or failing plugin simply means the web behaviour.
 */

export const BLOCKABLE_APPS = [
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "discord", label: "Discord" },
] as const;
export type BlockableAppId = (typeof BLOCKABLE_APPS)[number]["id"];

const STORAGE_KEY = "prepex.focus.blockedApps";

export function readBlockedApps(): BlockableAppId[] {
  const all = BLOCKABLE_APPS.map((a) => a.id);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return all; // on until the student turns an app off
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? all.filter((id) => parsed.includes(id)) : all;
  } catch {
    return all;
  }
}

export function storeBlockedApps(ids: BlockableAppId[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* not persisted: fine */
  }
}

type AppBlockPlugin = {
  enable(options: { apps: string[] }): Promise<unknown>;
  disable(): Promise<unknown>;
};

type CapacitorLike = { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> };

function nativePlugin(): AppBlockPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: CapacitorLike }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  const plugin = cap.Plugins?.AppBlock as AppBlockPlugin | undefined;
  return plugin && typeof plugin.enable === "function" && typeof plugin.disable === "function" ? plugin : null;
}

/** "native" when the Android plugin can block the apps; "web" when the timer can only remind. */
export function appBlockMode(): "native" | "web" {
  return nativePlugin() ? "native" : "web";
}

export async function startAppBlock(apps: BlockableAppId[]): Promise<"native" | "web"> {
  const plugin = nativePlugin();
  if (!plugin || apps.length === 0) return "web";
  try {
    await plugin.enable({ apps });
    return "native";
  } catch {
    return "web";
  }
}

export async function stopAppBlock(): Promise<void> {
  try {
    await nativePlugin()?.disable();
  } catch {
    /* nothing more to do */
  }
}

/** Leaving the tab for less than this is a glance, not a distraction worth a nag. */
export const NAG_AFTER_AWAY_MS = 5_000;

/** "1m 12s" / "43s" for the nag. */
export function formatAway(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
