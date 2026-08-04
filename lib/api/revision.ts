import { CORE_API_BASE_URL } from "@/lib/api/config";
import { apiRequest, ApiError } from "@/lib/api/http";
import { refreshAccessToken } from "@/lib/api/auth";
import { getAccessToken, getRefreshToken, saveTokens, clearSession } from "@/lib/auth/session";

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${CORE_API_BASE_URL}/api/revision${path}`;
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
      throw err;
    }

    const { data: newTokens } = await refreshAccessToken(refreshToken);
    saveTokens(newTokens);

    return apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${newTokens.accessToken}`, ...options.headers },
    });
  }
}

export function updateRevisionProgress(revisionId: string, minutesCompleted: number) {
  return authRequest<{ success: true; data: unknown }>(`/${revisionId}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ minutesCompleted }),
  });
}

export function markRevisionDone(revisionId: string) {
  return authRequest<{ success: true; data: unknown }>(`/${revisionId}/mark-done`, {
    method: "POST",
  });
}
