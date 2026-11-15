// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ContactPage from "@/app/contact/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import { LegalLinks } from "@/components/legal/LegalLinks";

/** Launch step 2 (A1, A4): the policies say what the code does, the contact page exists, and every legal footer links all three. */
const text = () => document.body.textContent ?? "";

describe("legal pages", () => {
  it("the contact page gives support, response time, grievance officer and security contact", () => {
    render(<ContactPage />);
    expect(text()).toContain("support@prepex.io");
    expect(text()).toMatch(/within 72 hours/);
    expect(text()).toMatch(/Grievance Officer/);
    expect(text()).toContain("security@prepex.io");
    expect(text()).toMatch(/Data Protection Board of India/);
  });

  it("the privacy policy covers age, the 7-day deletion, each processor, retention and rights, and is marked as a draft", () => {
    render(<PrivacyPage />);
    for (const s of ["The short version", "13–14, 15, 16, 17 or 18+", "7 days", "13 May 2027", "Mumbai", "Anthropic", "Sentry", "Hostinger", "Google", "WhatsApp", "Backblaze", "30 days without use", "14 days", "24 hours", "pending legal review", "speech service"]) {
      expect(text()).toContain(s);
    }
  });

  it("the terms mention the age rule and the 7-day deletion", () => {
    render(<TermsPage />);
    expect(text()).toContain("13 May 2027");
    expect(text()).toMatch(/7 days to change your mind/);
  });

  it("the legal footer links Privacy, Terms and Contact", () => {
    render(<LegalLinks />);
    for (const [name, href] of [["Privacy", "/privacy"], ["Terms", "/terms"], ["Contact", "/contact"]]) expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  });

  it("no screen still uses the old hello@ address", () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [join(dir, n)] : []));
    expect(["app", "components", "lib"].flatMap(files).filter((f) => readFileSync(f, "utf8").includes("hello@prepex.io"))).toEqual([]);
  });
});
