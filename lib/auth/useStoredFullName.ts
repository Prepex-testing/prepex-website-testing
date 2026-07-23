"use client";

import { useSyncExternalStore } from "react";
import { getStoredUser } from "@/lib/auth/session";

// The stored user is written once (login/verify/Google callback) and read on
// a different page after a full navigation, so a no-op subscribe is enough —
// there's no live update to react to within a single mounted page.
function subscribe() {
  return () => {};
}

function getSnapshot(): string {
  return getStoredUser()?.fullName ?? "";
}

function getServerSnapshot(): string {
  return "";
}

export function useStoredFullName(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
