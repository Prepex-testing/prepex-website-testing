// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/home" }));
vi.mock("@/assets/icons", () => ({ BellIcon: () => <svg /> }));
vi.mock("@/lib/api/notifications", async (orig) => ({ ...(await orig<typeof import("@/lib/api/notifications")>()), getNotifications: vi.fn(), markNotificationRead: vi.fn(async () => ({})), markAllNotificationsRead: vi.fn() }));

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getNotifications } from "@/lib/api/notifications";

afterEach(cleanup);

describe("a Pexo notification in the bell (Part E)", () => {
  it("shows Pexo beside it and drops the 'Pexo:' prefix the title already says", async () => {
    const pexo = { id: "n1", type: "PEXO", title: "Pexo", message: "Pexo: Your week in review is ready. So is your Rank GPS.", actionUrl: "/home/review", metadata: { trigger: "sunday" }, isRead: false, readAt: null, createdAt: new Date().toISOString() };
    vi.mocked(getNotifications).mockResolvedValue({ data: { notifications: [pexo], unreadCount: 1, hasUnread: true } } as never);
    render(<NotificationBell />);
    fireEvent.click(await screen.findByRole("button", { name: /notifications/i }));
    const item = await screen.findByText("Your week in review is ready. So is your Rank GPS.");
    expect(item.closest("button")!.querySelector("svg.pexo")).not.toBeNull();
  });
});
