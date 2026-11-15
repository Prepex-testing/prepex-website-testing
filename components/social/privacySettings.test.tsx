// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileSocialSettings } from "@/components/social/ProfileSocialSettings";
import { getSocialSettings, updateSocialSettings, type SocialSettings } from "@/lib/api/social";

/**
 * Launch step 2 (owner decision 1b): the full name, city and coaching are opt-in, off by default, each with its own
 * switch next to accuracy and mock scores.
 */
vi.mock("@/lib/api/social", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/social")>()),
  getSocialSettings: vi.fn(),
  updateSocialSettings: vi.fn(),
}));

const privateDefaults: SocialSettings = {
  username: "aarav_s",
  displayName: null,
  leaderboardHidden: false,
  showAccuracy: false,
  showMockScores: false,
  showFullName: false,
  showCity: false,
  showCoaching: false,
};

describe("profile privacy switches", () => {
  it("shows full name, city and coaching switches, all off, and saves one at a time", async () => {
    vi.mocked(getSocialSettings).mockResolvedValue(privateDefaults);
    vi.mocked(updateSocialSettings).mockResolvedValue({ ...privateDefaults, showCity: true });
    render(<ProfileSocialSettings />);

    for (const label of ["Show my full name", "Show my city", "Show my coaching"]) {
      const sw = await screen.findByRole("switch", { name: label });
      expect(sw).toHaveAttribute("aria-checked", "false");
    }
    await userEvent.click(screen.getByRole("switch", { name: "Show my city" }));
    await waitFor(() => expect(updateSocialSettings).toHaveBeenCalledWith({ showCity: true }));
    expect(await screen.findByRole("switch", { name: "Show my city" })).toHaveAttribute("aria-checked", "true");
  });
});
