import { apiRequest, ApiError } from "@/lib/api/http";
import { refreshAccessToken } from "@/lib/api/auth";
import { getAccessToken, getRefreshToken, saveTokens, clearSession } from "@/lib/auth/session";

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  window.location.assign("/login");
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

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSession();
      redirectToLogin();
      throw err;
    }

    try {
      const { data: newTokens } = await refreshAccessToken(refreshToken);
      saveTokens(newTokens);

      return await apiRequest<T>(url, {
        ...options,
        headers: { Authorization: `Bearer ${newTokens.accessToken}`, ...options.headers },
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
