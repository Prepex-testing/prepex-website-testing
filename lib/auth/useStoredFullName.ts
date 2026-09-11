"use client";

import { useSyncExternalStore } from "react";
import { getStoredUser, STORED_USER_CHANGE_EVENT } from "@/lib/auth/session";

// The stored user is written at sign-in, and again when the student renames
// themselves on the profile page — that second write happens while the header
// and user menu are mounted, so they need to hear about it. `storage` covers
// other tabs; the custom event covers this one.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(STORED_USER_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORED_USER_CHANGE_EVENT, onChange);
  };
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
