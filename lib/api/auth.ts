import { AUTH_API_BASE_URL } from "@/lib/api/config";
import { apiRequest, ApiError } from "@/lib/api/http";
import { getAccessToken, getRefreshToken, clearSession } from "@/lib/auth/session";

export { ApiError };

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  authProvider: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isVerified: boolean;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResult = {
  user: AuthUser;
  tokens: AuthTokens;
};

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(`${AUTH_API_BASE_URL}/api/auth${path}`, options);
}

export function registerAccount(input: {
  fullName: string;
  email: string;
  password: string;
}) {
  return request<{ success: true; message: string }>("/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function verifyOtp(input: { email: string; otp: string }) {
  return request<{ success: true; data: AuthResult }>("/verify-otp", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function resendOtp(email: string) {
  return request<{ success: true; message: string }>("/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function login(input: { email: string; password: string }) {
  return request<{ success: true; data: AuthResult }>("/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function refreshAccessToken(refreshToken: string) {
  return request<{ success: true; data: AuthTokens }>("/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function forgotPassword(email: string) {
  return request<{ success: true; message: string }>("/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(input: { token: string; password: string }) {
  return request<{ success: true; message: string }>("/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getProfile(accessToken: string) {
  return request<{ success: true; data: AuthUser }>("/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getGoogleAuthUrl() {
  return `${AUTH_API_BASE_URL}/api/auth/google`;
}

export function logout(accessToken: string, refreshToken: string) {
  return request<{ success: true; message?: string }>("/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * Best-effort: the local session is cleared even if the server call fails,
 * since the user's intent to log out shouldn't be blocked by a network error.
 */
export async function performLogout() {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (accessToken && refreshToken) {
    try {
      await logout(accessToken, refreshToken);
    } catch {
      // Best-effort — fall through to clearing the local session anyway.
    }
  }

  clearSession();
}
