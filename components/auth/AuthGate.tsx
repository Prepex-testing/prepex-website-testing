"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth/session";
import {
  isOnboardingKnownComplete,
  pendingOnboardingPath,
  resolveAuthedLanding,
} from "@/lib/auth/onboardingGate";

// Access tokens live in localStorage only (no auth cookies), so this check
// has to run client-side — there's no session state a server-side proxy
// could read.
const PUBLIC_PATHS = [
  "/",
  "/splash",
  "/welcome",
  "/login",
  "/create-account",
  "/email-verification",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  // Shared Win Journal cards (PRD 7.5.1) — the whole point is that someone
  // without a Prepex account can open the link.
  "/win",
  // Sentry verification page: a 404 unless NEXT_PUBLIC_SENTRY_TEST_ENABLED=true, so it is inert in production.
  "/sentry-test",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

// A still-logged-in user landing on one of these (e.g. a bookmark, or typing
// the URL by hand) shouldn't see the splash/login flow again — they're sent
// on to wherever they actually belong, which is their unfinished onboarding
// step if they have one and only otherwise /home or /check-in.
const AUTHED_REDIRECT_PATHS = ["/", "/splash", "/login"];

function isAuthedRedirectPath(pathname: string) {
  return AUTHED_REDIRECT_PATHS.includes(pathname);
}

// The onboarding screens are exactly where an unfinished student belongs, so
// they're never bounced off them — including backwards, to an earlier step
// than the one the server has recorded.
function isOnboardingPath(pathname: string) {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = isPublicPath(pathname);

  // Keyed by pathname, not just a bare boolean: on a client-side navigation
  // to a new protected route, `pathname` updates in this render immediately,
  // but the effect below (which reads localStorage) only runs after that
  // render commits. A bare `authorized` boolean would keep its stale `true`
  // value from the *previous* page for that one render, flashing the new
  // page's content before the effect has had a chance to check it. Comparing
  // `state.pathname` to the current `pathname` below makes that stale state
  // read as unauthorized instead, closing the gap.
  const [state, setState] = useState(() => ({ pathname, authorized: isPublic }));

  useEffect(() => {
    // The onboarding lookup below is a round trip, and the student can
    // navigate away while it's in flight — its answer is for the path that
    // asked for it, not whichever one is on screen when it lands.
    let cancelled = false;
    const settle = (authorized: boolean) => {
      if (!cancelled) setState({ pathname, authorized });
    };
    // Render nothing while an answer is still in flight.
    const hold = () => settle(false);
    const sendTo = (target: string) => {
      if (cancelled) return;
      settle(false);
      router.replace(target);
    };

    const hasToken = !!getAccessToken();

    if (!hasToken) {
      if (isPublic) settle(true);
      else sendTo("/login");
      return () => {
        cancelled = true;
      };
    }

    if (isPublic) {
      // Signed in and back at the front door: resolve the real landing page
      // rather than assuming /home — half-onboarded students belong in the
      // flow they abandoned.
      if (isAuthedRedirectPath(pathname)) {
        hold();
        void resolveAuthedLanding().then(sendTo);
      } else {
        settle(true);
      }
      return () => {
        cancelled = true;
      };
    }

    // Protected route. Onboarding's own screens pass straight through, and so
    // does everything else once the server has confirmed onboarding is done —
    // only the first protected view of a session pays for the check.
    if (isOnboardingPath(pathname) || isOnboardingKnownComplete()) {
      settle(true);
    } else {
      // Held blank meanwhile: showing /home for a frame before bouncing the
      // student back into onboarding is the bug this closes.
      hold();
      void pendingOnboardingPath().then((step) => {
        if (step) sendTo(step);
        else settle(true);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [pathname, isPublic, router]);

  const authorized = state.pathname === pathname && state.authorized;

  if (!authorized) return null;
  return <>{children}</>;
}
