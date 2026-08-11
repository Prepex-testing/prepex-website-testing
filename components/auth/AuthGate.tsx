"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth/session";

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
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
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
    if (isPublic) {
      setState({ pathname, authorized: true });
      return;
    }
    if (getAccessToken()) {
      setState({ pathname, authorized: true });
    } else {
      setState({ pathname, authorized: false });
      router.replace("/login");
    }
  }, [pathname, isPublic, router]);

  const authorized = state.pathname === pathname && state.authorized;

  if (!authorized) return null;
  return <>{children}</>;
}
