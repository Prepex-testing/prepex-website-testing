/**
 * Launch step 3: `px_has_account=1`, a non-sensitive hint that this browser has a Prepex account. It lets prepex.io
 * (the landing page, step 4) send returning students straight to app.prepex.io and show everyone else the landing.
 * Shared across *.prepex.io, Secure, SameSite=Lax, 1 year. Set on every sign-in and sign-up (guests included: they
 * have an account on this device). Cleared when the account is deleted, NOT on logout (a logged-out student still
 * has an account and should land on the sign-in screen).
 */
export const ACCOUNT_HINT_COOKIE = "px_has_account";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

function attributes(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  const domain = host === "prepex.io" || host.endsWith(".prepex.io") ? "; Domain=.prepex.io" : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  return `; Path=/${domain}; SameSite=Lax${secure}`;
}

export function setAccountHint(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCOUNT_HINT_COOKIE}=1; Max-Age=${ONE_YEAR_SECONDS}${attributes()}`;
}

export function clearAccountHint(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCOUNT_HINT_COOKIE}=; Max-Age=0${attributes()}`;
}

export const hasAccountHint = (): boolean => typeof document !== "undefined" && document.cookie.split("; ").includes(`${ACCOUNT_HINT_COOKIE}=1`);
