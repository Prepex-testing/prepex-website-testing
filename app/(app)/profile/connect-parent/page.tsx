import { redirect } from "next/navigation";

// The parent connection lives on one screen — /profile/parent — which handles
// inviting, verification status and the weekly-report settings. This older
// route is kept only so existing links land there.
export default function ConnectParentPage() {
  redirect("/profile/parent");
}
