"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { registerFocusNavigator } from "@/lib/focus/startFocusSession";

/** Hands the app router to `startFocusSession`, so a start button navigates in-app instead of reloading the page. */
export function FocusLauncher() {
  const router = useRouter();
  useEffect(() => registerFocusNavigator((href) => router.push(href)), [router]);
  return null;
}
