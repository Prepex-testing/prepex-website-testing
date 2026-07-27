"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth/session";

// Access tokens live in localStorage only (no auth cookies), so this check
// has to run client-side — there's no session state a server-side proxy
// could read.
const PUBLIC_PATHS = [
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
  const [authorized, setAuthorized] = useState(() => isPublicPath(pathname));

  useEffect(() => {
    if (isPublicPath(pathname)) {
      setAuthorized(true);
      return;
    }
    if (getAccessToken()) {
      setAuthorized(true);
    } else {
      setAuthorized(false);
      router.replace("/login");
    }
  }, [pathname, router]);

  if (!authorized) return null;
  return <>{children}</>;
}
