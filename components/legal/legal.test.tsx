// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ContactPage from "@/app/contact/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import { LegalLinks } from "@/components/legal/LegalLinks";
import { COMMUNITY, LEGAL } from "@/lib/legal/contacts";

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

  it("pre-step 3: the operator, address, Grievance Officer and WhatsApp are filled, and no placeholder is left", () => {
    for (const Page of [ContactPage, PrivacyPage, TermsPage]) {
      const { unmount } = render(<Page />);
      expect(text()).toContain("Ishwar Birla");
      expect(text()).toContain("Madhya Pradesh, India");
      expect(text()).not.toMatch(/\[OWNER|TODO|TBD|XXX|\[placeholder|Your Name/);
      unmount();
    }
    render(<ContactPage />);
    expect(text()).toContain("A full postal address will be published once Prepex is registered.");
    expect(screen.getByTestId("contact-whatsapp")).toHaveAttribute("href", "https://wa.me/917501997123");
    expect(screen.getByTestId("contact-whatsapp")).toHaveTextContent("+91 75019 97123");
    expect(LEGAL.grievanceEmail).toBe("grievance@prepex.io");
  });

  it("the community link: one URL, a new tab without the opener, the phone-number note, and a click event with the placement", () => {
    const seen: unknown[] = [];
    const listen = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener("prepex:track", listen);
    render(<ContactPage />);
    const link = screen.getByTestId("community-link-contact");
    expect(link).toHaveAttribute("href", COMMUNITY.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(text()).toContain("Opens WhatsApp. Other members can see your phone number.");
    fireEvent.click(link);
    expect(seen).toContainEqual({ event: "community_link_click", placement: "contact" });
    window.removeEventListener("prepex:track", listen);
  });

  it("the community link URL is written in one place only", () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [join(dir, n)] : []));
    expect(["app", "components", "lib"].flatMap(files).filter((f) => readFileSync(f, "utf8").includes("chat.whatsapp.com"))).toEqual([join("lib", "legal", "contacts.ts")]);
  });

  it("the footer shows the community link only where asked (not on sign-in or onboarding)", () => {
    const { unmount } = render(<LegalLinks />);
    expect(screen.queryByTestId("community-link-footer")).toBeNull();
    unmount();
    render(<LegalLinks community />);
    expect(screen.getByTestId("community-link-footer")).toHaveAttribute("href", COMMUNITY.url);
  });
});
