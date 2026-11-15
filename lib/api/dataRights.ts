import { AUTH_API_BASE_URL, CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import { ApiError } from "@/lib/api/http";
import { getAccessToken } from "@/lib/auth/session";
import type { AgeBand } from "@/lib/onboardingV2/canvas";

/**
 * Launch step 2 (A2, A3): the age question, "Download my data" and "Delete my account".
 * Kept apart from lib/api/auth.ts for the same reason as lib/api/account.ts (auth.ts and authRequest.ts import each other).
 */
const core = <T,>(path: string, options: RequestInit = {}) => authenticatedRequest<T>(`${CORE_API_BASE_URL}/api${path}`, options);
const auth = <T,>(path: string, options: RequestInit = {}) => authenticatedRequest<T>(`${AUTH_API_BASE_URL}/api/auth${path}`, options);
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export type AgeInfo = { ageBand: AgeBand | null; isMinor: boolean | null; parentEmail: string | null; parentConsentStatus: "none" | "requested" | "given" };
export const getAge = () => core<{ success: true; data: AgeInfo }>("/profile/age").then((r) => r.data);
export const setAge = (ageBand: AgeBand, parentEmail?: string) =>
  core<{ success: true; data: AgeInfo }>("/profile/age", json("POST", { ageBand, ...(parentEmail ? { parentEmail } : {}) })).then((r) => r.data);

export type DataExport = { id: string; status: "pending" | "ready" | "failed"; requestedAt: string; readyAt: string | null; expiresAt: string | null; bytes: number | null };
export const requestDataExport = () => core<{ success: true; data: DataExport }>("/data-exports", { method: "POST" }).then((r) => r.data);
export const latestDataExport = () => core<{ success: true; data: DataExport | null }>("/data-exports/latest").then((r) => r.data);

/** Downloads the export file (the browser saves it). The file never goes through local storage. */
export async function downloadDataExport(id: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${CORE_API_BASE_URL}/api/data-exports/${encodeURIComponent(id)}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(res.status, body?.message ?? "That download didn't work. Please try again.");
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "prepex-data.json";
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const sendDeletionCode = () => auth<{ success: true; message: string }>("/account/delete-code", { method: "POST" });
export type DeletionSchedule = { deletionScheduledAt: string; finalAt: string; graceDays: number };
export const confirmAccountDeletion = (code?: string) =>
  auth<{ success: true; message: string; data: DeletionSchedule }>("/account", json("DELETE", { confirm: "DELETE", ...(code ? { code } : {}) })).then((r) => r.data);
