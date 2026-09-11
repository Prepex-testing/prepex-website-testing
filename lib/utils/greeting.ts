import { useSyncExternalStore } from "react";

/** "Good Morning" (5–12), "Good Afternoon" (12–17), else "Good Evening". */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  return "Good Evening";
}

// Re-read once a minute, so a page left open rolls over at the boundary.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

/**
 * The time-of-day greeting in the student's own timezone.
 *
 * Read on the client only: the server renders with its own clock and zone, so
 * computing it there would greet in the wrong time and mismatch on hydration.
 * Until the client value is in, this returns a neutral "Hello".
 */
export function useGreeting(): string {
  return useSyncExternalStore(
    subscribe,
    () => greetingFor(new Date()),
    () => "Hello",
  );
}
