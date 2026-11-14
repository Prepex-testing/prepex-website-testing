/**
 * Launch step 1 (C11, found by the ZAP baseline): a form submitted before React has hydrated is a plain browser submit.
 * Without method="post" it goes out as GET, so an e-mail, password or sign-in code ends up in the URL, the server's
 * access log and the browser history. Every form that holds credentials must say method="post".
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CREDENTIAL_FORMS = [
  "app/(auth)/login/page.tsx",
  "app/(auth)/create-account/page.tsx",
  "app/(auth)/forgot-password/page.tsx",
  "app/(auth)/reset-password/page.tsx",
  "components/onboardingV2/SaveAccountSheet.tsx",
  "components/onboardingV2/SignInScreen.tsx",
];

describe("credential forms never submit as GET", () => {
  it.each(CREDENTIAL_FORMS)("%s", (file) => {
    const src = readFileSync(file, "utf8");
    const forms = src.split("<form").slice(1);
    expect(forms.length).toBeGreaterThan(0);
    for (const f of forms) expect(f.slice(0, 200)).toMatch(/method="post"/);
  });
});
