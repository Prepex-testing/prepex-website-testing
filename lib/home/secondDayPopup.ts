import { getStoredUser } from "@/lib/auth/session";

function secondDayPopupKey(userId: string) {
  return `prepex.secondDayPopupShown.${userId}`;
}

/** Scoped per-user so one account's acknowledgement never hides the popup for another. */
export function hasSeenSecondDayPopup(): boolean {
  const userId = getStoredUser()?.id;
  if (!userId) return false;
  return localStorage.getItem(secondDayPopupKey(userId)) === "true";
}

export function markSecondDayPopupSeen() {
  const userId = getStoredUser()?.id;
  if (!userId) return;
  localStorage.setItem(secondDayPopupKey(userId), "true");
}
