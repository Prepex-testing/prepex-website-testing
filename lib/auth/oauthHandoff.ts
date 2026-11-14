/**
 * What auth-service hands over after a Google sign-in. Tokens arrive in the URL fragment (never sent to a server, so
 * they stay out of access logs and the Referer header); the query string is still read so an older auth-service
 * keeps working during a deploy.
 */
export type OAuthHandoff = {
  accessToken: string | null;
  refreshToken: string | null;
  restored: boolean;
  saved: boolean;
  guestConflict: boolean;
};

export function readOAuthHandoff(hash: string, search: string): OAuthHandoff {
  const frag = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const pick = (k: string) => frag.get(k) ?? query.get(k);
  return {
    accessToken: pick("access_token"),
    refreshToken: pick("refresh_token"),
    restored: pick("restored") === "1",
    saved: pick("saved") === "1",
    guestConflict: pick("guest_conflict") === "1",
  };
}
