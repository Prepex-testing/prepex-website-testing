import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal/contacts";

export const metadata: Metadata = { title: "Privacy Policy | Prepex", description: "How Prepex collects, uses and protects your information." };

/**
 * Launch step 2 (A1): written against what the code does (step 1's personal-data inventory). Pending lawyer review;
 * the OWNER placeholders in lib/legal/contacts.ts must be filled before launch.
 */
const SECTIONS: LegalSection[] = [
  {
    heading: "The short version",
    body: [
      [
        "We keep what you give us to plan your preparation: your account, your study logs and your notebooks.",
        "Other students see only your display name or @username, and only what you choose to show.",
        "We never sell your data and never show third-party ads.",
        "You can download everything we keep, or delete your account, from Profile, Settings, Your data. Deleting is final after 7 days.",
        "Most Prepex students are under 18. A parent or guardian can ask us to see, correct or delete their child's data.",
      ],
    ],
  },
  {
    heading: "Who we are",
    body: [`Prepex is run by ${LEGAL.entityName}, ${LEGAL.address}. Contact: ${LEGAL.supportEmail}.`],
  },
  {
    heading: "What we collect",
    body: [
      [
        "Account: your name and e-mail address. With Google sign-in we also receive your profile photo; we never see your Google password. A guest account (\"Try Prepex first\") has no e-mail address.",
        "Profile: your class, target exam and dates, age band (13–14, 15, 16, 17 or 18+), school and coaching timings, and, only if you add them, city, coaching name, phone number, profile photo and a parent's e-mail.",
        "Study: study and focus-timer sessions, plans and tasks, goals, revisions, practice and mock scores, mistakes, notebook pages (text, drawings, photos and PDFs you add), daily check-ins (mood and energy), and Pexo activity.",
        "Social: your username and display name, who you follow, kudos, duels, and reports or blocks you make.",
        "Parent report: if you connect a parent, their WhatsApp number and the name you give them.",
        "Usage: which onboarding questions you saw and how long they took (never your answers), so we can improve the app.",
        "Technical: device and browser type, IP address in our server logs, and error reports when something breaks.",
      ],
      "Voice: if you turn on the microphone during setup, your browser's own speech service turns your speech into text (in Chrome, that service is run by Google). Prepex only receives and keeps the answer you then tap.",
      "Photos: before a photo is stored we remove all its hidden details (location, device, time), keeping only the picture.",
    ],
  },
  {
    heading: "Why we use it",
    body: [
      [
        "To build your study plan, timetable, revision schedule and countdown, and to show your progress, streaks, XP and the boards you appear on.",
        "To send what you ask for: sign-in codes, reminders, and the weekly report to your parent if you connect one.",
        "To keep Prepex safe, find and fix problems, and improve features.",
      ],
    ],
  },
  {
    heading: "Where it is stored",
    body: [
      "Prepex runs on servers in India (Mumbai). Notebook photos and files are stored in the same database. Encrypted backup copies are kept with our backup provider (Backblaze) for up to 8 weeks.",
    ],
  },
  {
    heading: "Who processes it for us",
    body: [
      "Only these service providers, and only what each needs:",
      [
        "Hostinger: the servers that run Prepex, and the e-mail service that sends sign-in codes and account e-mails.",
        "Google: sign-in with Google, if you choose it.",
        "Anthropic: AI features, only when you use one (reading a timetable or mock scorecard photo, or writing a study note or coach note for you).",
        "Sentry: error reports, with names, e-mail addresses and your content removed.",
        "Meta (WhatsApp): the weekly report to your parent, only if you connect one.",
        "Backblaze: encrypted backups.",
      ],
      "Prepex does not use advertising or analytics trackers in the app. We may disclose information if the law requires it.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      [
        "Your account and study data: while your account is active.",
        "Deleting your account: you have 7 days to change your mind by signing in again; then everything is deleted for good. Backup copies roll off within 8 weeks.",
        "Guest accounts that are never saved are removed after 30 days without use.",
        "Server logs: 14 days. Your data download link: 24 hours.",
      ],
    ],
  },
  {
    heading: "Students under 18",
    body: [
      "Under India's Digital Personal Data Protection Act, everyone under 18 is a child, and most Prepex students are. We ask your age when you start. If you are under 18, please use Prepex with your parent's or guardian's knowledge; you can add a parent's e-mail (optional) for the weekly update.",
      "We do not show ads, do not track you for advertising, and do not build profiles to sell. Before 13 May 2027 we will ask for verifiable consent from a parent or guardian for students under 18, as the law requires; we will tell you in the app before that starts.",
      `A parent or guardian can write to ${LEGAL.supportEmail} to see, correct or delete their child's information.`,
    ],
  },
  {
    heading: "Your rights",
    body: [
      [
        "See and download your data: Profile, Settings, Your data.",
        "Correct it: edit your profile, or write to us.",
        "Delete it: Profile, Settings, Delete account.",
        "Choose what others see: Profile, Username and privacy (full name, city, coaching, accuracy and mock scores are off unless you turn them on), and hide yourself from leaderboards.",
        "Stop the weekly parent report: Profile, Settings, Your data.",
        "Name someone who can use these rights for you if you cannot.",
        `Complain: write to our Grievance Officer (${LEGAL.grievanceOfficer}, ${LEGAL.grievanceEmail}). We acknowledge within ${LEGAL.responseHours} hours. You can also complain to the Data Protection Board of India.`,
      ],
    ],
  },
  {
    heading: "Security",
    body: ["Connections are encrypted (HTTPS); passwords and sign-in codes are stored only as hashes; admin access needs two-factor sign-in and is logged. No system is perfectly secure, so please keep your sign-in methods private."],
  },
  {
    heading: "Changes",
    body: ["If we change this policy in a way that matters, we will tell you in the app before the change applies."],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={LEGAL.effectiveDate}
      intro={`This policy explains what Prepex keeps about you, why, and the choices you have.${LEGAL.pendingLawyerReview ? " (Draft, pending legal review.)" : ""}`}
      sections={SECTIONS}
    />
  );
}
