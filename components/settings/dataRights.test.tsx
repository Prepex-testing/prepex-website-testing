// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteAccountModal } from "@/components/settings/DeleteAccountModal";
import { YourDataSettings } from "@/components/settings/YourDataSettings";
import { confirmAccountDeletion, downloadDataExport, latestDataExport, requestDataExport, sendDeletionCode } from "@/lib/api/dataRights";
import { getParentConnection, updateParentSettings } from "@/lib/api/parent";

/** Launch step 2 (A3): Settings → Your data (download, parent report switch) and Delete my account (DELETE + code). */
vi.mock("@/lib/api/dataRights", () => ({
  confirmAccountDeletion: vi.fn(),
  sendDeletionCode: vi.fn(),
  latestDataExport: vi.fn(),
  requestDataExport: vi.fn(),
  downloadDataExport: vi.fn(),
}));
vi.mock("@/lib/api/parent", () => ({ getParentConnection: vi.fn(), updateParentSettings: vi.fn() }));

const ready = { id: "e1", status: "ready" as const, requestedAt: "2026-11-15T10:00:00Z", readyAt: "2026-11-15T10:00:05Z", expiresAt: new Date(Date.now() + 3_600_000).toISOString(), bytes: 1200 };

beforeEach(() => vi.clearAllMocks());

describe("Delete my account", () => {
  it("needs the typed word DELETE and the e-mailed code before anything is deleted", async () => {
    vi.mocked(sendDeletionCode).mockResolvedValue({ success: true, message: "sent" });
    vi.mocked(confirmAccountDeletion).mockResolvedValue({ deletionScheduledAt: "x", finalAt: "y", graceDays: 7 });
    const onDeleted = vi.fn();
    render(<DeleteAccountModal open onClose={vi.fn()} needsCode onDeleted={onDeleted} />);
    expect(screen.getByText(/within 7 days/)).toBeInTheDocument();
    const confirm = screen.getByTestId("delete-confirm");
    await userEvent.type(screen.getByTestId("delete-typed"), "delete");
    expect(confirm).toBeDisabled();
    await userEvent.clear(screen.getByTestId("delete-typed"));
    await userEvent.type(screen.getByTestId("delete-typed"), "DELETE");
    expect(confirm).toBeDisabled(); // no code yet
    await userEvent.click(screen.getByTestId("delete-send-code"));
    await userEvent.type(await screen.findByTestId("delete-code"), "123456");
    await userEvent.click(confirm);
    await waitFor(() => expect(confirmAccountDeletion).toHaveBeenCalledWith("123456"));
    expect(onDeleted).toHaveBeenCalled();
  });

  it("a guest only types DELETE", async () => {
    vi.mocked(confirmAccountDeletion).mockResolvedValue({ deletionScheduledAt: "x", finalAt: "y", graceDays: 7 });
    render(<DeleteAccountModal open onClose={vi.fn()} needsCode={false} onDeleted={vi.fn()} />);
    expect(screen.queryByTestId("delete-send-code")).toBeNull();
    await userEvent.type(screen.getByTestId("delete-typed"), "DELETE");
    await userEvent.click(screen.getByTestId("delete-confirm"));
    await waitFor(() => expect(confirmAccountDeletion).toHaveBeenCalledWith(undefined));
  });
});

describe("Your data", () => {
  it("prepares the file, then downloads it", async () => {
    vi.mocked(getParentConnection).mockResolvedValue({ success: true, data: { connection: null, lastEnded: null, recentReports: [], whatsapp: { live: false, businessNumber: null } } });
    vi.mocked(latestDataExport).mockResolvedValueOnce(null).mockResolvedValue(ready);
    vi.mocked(requestDataExport).mockResolvedValue({ ...ready, status: "pending", readyAt: null, expiresAt: null });
    render(<YourDataSettings />);
    await userEvent.click(await screen.findByTestId("export-request"));
    expect(requestDataExport).toHaveBeenCalled();
    await userEvent.click(await screen.findByTestId("export-download", {}, { timeout: 8000 }));
    expect(downloadDataExport).toHaveBeenCalledWith("e1");
  }, 15_000);

  it("shows the parent weekly report switch only when a parent is connected, and turns it off", async () => {
    const connection = { reportsEnabled: true } as never;
    vi.mocked(latestDataExport).mockResolvedValue(null);
    vi.mocked(getParentConnection).mockResolvedValue({ success: true, data: { connection, lastEnded: null, recentReports: [], whatsapp: { live: true, businessNumber: null } } });
    vi.mocked(updateParentSettings).mockResolvedValue({ success: true, data: { connection: { reportsEnabled: false } as never, lastEnded: null, recentReports: [], whatsapp: { live: true, businessNumber: null } } });
    render(<YourDataSettings />);
    const sw = await screen.findByRole("switch", { name: "Weekly report to my parent" });
    await userEvent.click(sw);
    expect(updateParentSettings).toHaveBeenCalledWith({ reportsEnabled: false });
  });
});
