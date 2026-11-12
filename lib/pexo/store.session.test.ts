// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/xp", () => ({ onXpSummary: vi.fn(() => () => undefined), getXpSummary: vi.fn(async () => ({})), sendHeartbeat: vi.fn() }));

import type { PexoState } from "@/lib/api/pexo";
import { clearSession } from "@/lib/auth/session";
import { pexoHasMark, pexoMark, pexoState, primePexo, resetPexo, takePexoBatch } from "@/lib/pexo/store";

const state = (over: Partial<PexoState> = {}): PexoState => ({ enabled: true, cohort: "existing", libraryVersion: 3, language: "en", bubbles: "normal", notifications: true, accessories: [], shown: {}, firstVisits: [], marks: {}, today: "2026-11-12", daysSinceSignup: 30, home: null, quests: null, nudge: null, care: { active: false, reason: null, distress: false }, ...over });

afterEach(() => resetPexo());

describe("signing out", () => {
  it("forgets the previous account's Pexo: its state, its marks and anything it had not sent yet", () => {
    primePexo(state({ marks: { tour: "2026-11-01" } }));
    pexoMark("climb.intro.seen", true);
    expect(pexoHasMark("tour")).toBe(true);
    clearSession();
    // the next account to sign in on this tab starts clean: its own tour is not hidden, nothing leaks into its heartbeat
    expect(pexoState()).toBeNull();
    expect(pexoHasMark("tour")).toBe(false);
    expect(takePexoBatch()).toBeNull();
  });
});
