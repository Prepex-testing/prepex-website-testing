import { apiRequest, ApiError } from "@/lib/api/http";
import { refreshAccessToken } from "@/lib/api/auth";
import { getAccessToken, getRefreshToken, saveTokens, clearSession } from "@/lib/auth/session";

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  window.location.assign("/login");
}

let refreshPromise: Promise<string> | null = null;

/**
 * A page load fires several authenticated requests at once (today's plan,
 * check-in status, study consistency, …). If the access token has expired,
 * they'd all 401 together and — without this — each would independently
 * call /refresh with the same refresh token. The backend rotates refresh
 * tokens on use, so only the first of those concurrent calls succeeds; the
 * rest get rejected with an already-consumed token and each force a logout,
 * even though the first call just re-established a perfectly valid session.
 * Sharing one in-flight promise makes every 401 in the same window ride the
 * same single refresh, so the token is only ever consumed once.
 */
function refreshAccessTokenOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token");

      const { data: newTokens } = await refreshAccessToken(refreshToken);
      saveTokens(newTokens);
      return newTokens.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

/**
 * Shared by every `/lib/api/*.ts` module: attaches the access token, and on a
 * 401 refreshes it once and retries. If the refresh token itself is invalid,
 * expired, or revoked, the local session is cleared and the browser is sent
 * to /login — otherwise that failure was propagating as an unhandled
 * rejection (e.g. "Refresh token has been revoked") instead of recovering.
 */
export async function authenticatedRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const accessToken = getAccessToken();

  try {
    return await apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    if (!getRefreshToken()) {
      clearSession();
      redirectToLogin();
      throw err;
    }

    try {
      const newAccessToken = await refreshAccessTokenOnce();

      return await apiRequest<T>(url, {
        ...options,
        headers: { Authorization: `Bearer ${newAccessToken}`, ...options.headers },
      });
    } catch (refreshErr) {
      // No way to recover client-side from an invalid/expired/revoked
      // refresh token — end the session and send the user back to login.
      clearSession();
      redirectToLogin();
      throw refreshErr;
    }
  }
}
