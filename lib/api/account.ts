import { AUTH_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import type { AuthTokens } from "@/lib/api/auth";

/**
 * Account-level calls to auth-service — identity, credentials, deletion.
 *
 * Kept out of `lib/api/auth.ts` on purpose: `authRequest.ts` imports the token
 * refresh from there, so putting `authenticatedRequest` calls in the same file
 * would make the two modules import each other.
 */
function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${AUTH_API_BASE_URL}/api/auth${path}`, options);
}

export type AccountDetails = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  /** "email" for password accounts; "google" / "apple" for OAuth sign-ins. */
  authProvider: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isVerified: boolean;
  phoneNumber: string | null;
  isPhoneVerified: boolean;
  createdAt: string;
};

export function getAccountDetails() {
  return authRequest<{ success: true; data: AccountDetails }>("/profile");
}

/**
 * Identity fields. auth-service owns these and relays them to core-service's
 * mirror, which is where the profile page reads them back from.
 */
export function updateIdentity(input: { fullName?: string; city?: string; phoneNumber?: string }) {
  return authRequest<{ success: true; message: string }>("/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Revokes every other session, then hands this one a replacement token pair —
 * so the caller stays signed in and only has to store the new tokens. Nothing
 * else survives the change: any other device is signed out.
 */
export function changePassword(input: { currentPassword: string; newPassword: string }) {
  return authRequest<{ success: true; message: string; data: { tokens: AuthTokens } }>(
    "/update-password",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export type DeletionSchedule = {
  deletionScheduledAt: string;
  /** After this moment the deletion is final and can't be undone. */
  finalAt: string;
  graceDays: number;
};

/**
 * Schedules deletion and ends every session. Signing in again before
 * `finalAt` restores the account; after that it's deleted for good — the
 * address is freed for a new sign-up and nothing can reach the old account.
 */
export function deleteAccount() {
  return authRequest<{ success: true; message: string; data: DeletionSchedule }>("/account", {
    method: "DELETE",
  });
}

/** Mirrors auth-service's updatePasswordSchema, so errors show before a round trip. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "At least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Include at least one number.";
  return null;
}
