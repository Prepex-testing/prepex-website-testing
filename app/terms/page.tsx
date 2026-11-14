import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms of Service | Prepex", description: "The rules for using Prepex." };

const UPDATED = "14 November 2026";

const SECTIONS: LegalSection[] = [
  {
    heading: "Using Prepex",
    body: [
      "By creating an account or using Prepex, you agree to these terms and to our Privacy Policy. If you are under 18, please use Prepex with the permission of a parent or guardian, who also agrees to these terms for you.",
    ],
  },
  {
    heading: "Your account",
    body: [
      [
        "Give accurate details and keep your sign-in methods private.",
        "You are responsible for what happens in your account.",
        "A guest account (\"Try Prepex first\") lives on the device that created it. Save it to an account to keep your progress safe; an unsaved guest account may be removed after a period without use.",
      ],
    ],
  },
  {
    heading: "What Prepex is, and is not",
    body: [
      "Prepex helps you plan and track your preparation. Plans, countdowns, readiness scores and suggestions are guidance based on the information you give, not a promise of any exam result or rank. Exam dates shown before an official announcement are estimates; always confirm dates with the official exam authority (NTA for JEE Main, the organising IIT for JEE Advanced).",
    ],
  },
  {
    heading: "Fair use",
    body: [
      "Please do not:",
      [
        "Harass, bully or impersonate anyone, or post anything harmful, hateful or illegal.",
        "Share content you do not have the right to share.",
        "Try to break, overload or get around the security of Prepex, or access other people's accounts.",
        "Use bots or scripts to collect data or game leaderboards and XP.",
      ],
      "We may remove content or suspend accounts that break these rules.",
    ],
  },
  {
    heading: "Your content",
    body: ["Notes, mistakes and other content you add stay yours. You let us store and process it only to run Prepex for you, and to show it to others only where you choose to share it."],
  },
  {
    heading: "Changes and availability",
    body: [
      "We are improving Prepex all the time, so features may change. We try to keep Prepex available, but cannot promise it will always be uninterrupted or error-free. If we change these terms in a way that matters, we will tell you in the app first.",
    ],
  },
  {
    heading: "Ending your account",
    body: ["You can delete your account at any time from Profile, Settings. We may suspend or close accounts that break these terms."],
  },
  {
    heading: "Liability",
    body: ["Prepex is provided as is. To the extent the law allows, we are not liable for indirect losses or for decisions you make based on the app's guidance."],
  },
  {
    heading: "Law",
    body: ["These terms are governed by the laws of India."],
  },
  {
    heading: "Contact",
    body: ["Questions about these terms: hello@prepex.io."],
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms of Service" updated={UPDATED} intro="These are the rules for using Prepex, written to be easy to read." sections={SECTIONS} />;
}
