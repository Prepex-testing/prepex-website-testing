import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy | Prepex", description: "How Prepex collects, uses and protects your information." };

const UPDATED = "14 November 2026";

const SECTIONS: LegalSection[] = [
  {
    heading: "Who we are",
    body: ["Prepex is a study planner and companion for students preparing for JEE. You can reach us at hello@prepex.io for anything in this policy."],
  },
  {
    heading: "What we collect",
    body: [
      [
        "Account details: your name and e-mail address. If you sign in with Google, we receive your name, e-mail address and profile photo from Google. We do not receive your Google password.",
        "Study details you give us: your class, target exam and exam dates, school and coaching timings, study hours, timetable, chapters, goals, study sessions, tests, mistakes and notes.",
        "Optional details: phone number, city, coaching name and profile photo, only if you add them.",
        "How you use Prepex: which screens you open and how long setup questions take, so we can make the app better. We never record your answers for this.",
        "Technical details: device and browser type, and error reports when something breaks.",
      ],
      "If you choose \"Try Prepex first\", we create a guest account with no e-mail address. If you use the microphone during setup, your browser turns speech into text on your device; we only keep the answer you tap.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      [
        "To build your study plan, timetable, revision schedule and countdown.",
        "To show your progress, streaks and XP, and the leaderboards you choose to appear on.",
        "To send the messages you ask for, such as sign-in codes and study reminders.",
        "To keep Prepex safe, fix problems and improve features.",
      ],
      "We do not sell your personal information, and we do not show third-party advertising.",
    ],
  },
  {
    heading: "Who we share it with",
    body: [
      "We share information only with service providers that help us run Prepex, and only what they need:",
      [
        "Hosting and database providers that store Prepex data.",
        "E-mail delivery, to send sign-in codes and account e-mails.",
        "Error monitoring, so we can find and fix crashes.",
        "AI processing, only when you use a feature that needs it (for example reading a timetable photo or writing a study note for you).",
        "WhatsApp, only if you connect a parent or guardian to receive your progress report.",
      ],
      "Other students can see only what you choose to make public, such as your display name and leaderboard position. We may disclose information if the law requires it.",
    ],
  },
  {
    heading: "Students under 18",
    body: [
      "Many Prepex students are under 18. If you are under 18, please use Prepex with the permission of a parent or guardian. A parent or guardian can contact us at hello@prepex.io to see, correct or delete their child's information.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "We keep your information while your account is active. If you delete your account (Profile, Settings), it is scheduled for deletion and permanently removed after a 30-day grace period, unless the law requires us to keep something longer.",
    ],
  },
  {
    heading: "Your choices and rights",
    body: [
      [
        "See and update your details from your profile.",
        "Hide yourself from leaderboards and choose who can see your profile.",
        "Turn reminders on or off in settings.",
        "Ask us for a copy of your information, or ask us to correct or delete it, by writing to hello@prepex.io.",
      ],
    ],
  },
  {
    heading: "Security",
    body: ["We protect your information with encrypted connections (HTTPS), access controls and hashed sign-in codes and passwords. No system is perfectly secure, so please keep your sign-in methods private."],
  },
  {
    heading: "Changes to this policy",
    body: ["If we change this policy in a way that matters, we will tell you in the app before the change applies. The date at the top shows the latest version."],
  },
  {
    heading: "Contact",
    body: ["Questions or requests: hello@prepex.io."],
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated={UPDATED} intro="This policy explains what information Prepex collects, why, and the choices you have. We keep it short and in plain language." sections={SECTIONS} />;
}
