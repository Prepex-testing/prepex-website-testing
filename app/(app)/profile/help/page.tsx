import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { InfoIcon, ChevronRightIcon, PhoneIcon, ExternalLinkIcon } from "@/components/ui/icons";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { WhatsApp, EmailIcon, MessageIcon } from "@/assets/icons";

// ---------------------------------------------------------------------------
// Helpline numbers — checked in September 2026 against each service's own
// site: icallhelpline.org, vandrevalafoundation.com, aasra.info,
// snehaindia.org and telemanas.mohfw.gov.in.
//
// These change: Vandrevala retired 1860-2662-345 for +91 9999 666 555, and
// KIRAN (1800-599-0019) was folded into Tele-MANAS. A wrong number here could
// leave a student in distress calling a dead line, so recheck them
// periodically rather than copying numbers from elsewhere. (Tele-MANAS's
// server omits its intermediate certificate, so curl/scripts fail TLS on it;
// browsers fill the gap and open it fine.)
// ---------------------------------------------------------------------------

type Helpline = {
  name: string;
  /** As displayed. */
  number: string;
  /** For the tel: link — digits with country code. */
  dial: string;
  availability: string;
  /** The service's own site — clicking its card opens it in a new tab. */
  website?: string;
};

const COUNSELLING_LINES: Helpline[] = [
  {
    name: "iCall (TISS)",
    website: "https://icallhelpline.org/",
    number: "9152987821",
    dial: "+919152987821",
    availability: "Mon–Sat, 8 AM – 9 PM",
  },
  {
    name: "Vandrevala Foundation",
    website: "https://www.vandrevalafoundation.com/",
    number: "+91 9999 666 555",
    dial: "+919999666555",
    availability: "24×7 · Call or WhatsApp",
  },
  {
    name: "AASRA",
    website: "https://aasra.info/",
    number: "022-2754 6669",
    dial: "+912227546669",
    availability: "24×7",
  },
  {
    name: "Sneha India",
    website: "https://snehaindia.org/",
    number: "044-2464 0050",
    dial: "+914424640050",
    availability: "24×7 crisis support",
  },
];

const NATIONAL_LINES: (Helpline & { description: string })[] = [
  {
    name: "Tele-MANAS",
    website: "https://telemanas.mohfw.gov.in/",
    number: "14416",
    dial: "14416",
    availability: "24×7 · Free",
    description:
      "National mental health helpline by the Ministry of Health, Government of India. English and 20 regional languages.",
  },
  {
    name: "Emergency",
    number: "112",
    dial: "112",
    availability: "24×7",
    description: "If you or someone else is in immediate danger.",
  },
];

const SUPPORT_EMAIL = "support@prepex.in";
// No support WhatsApp number exists yet; set this (digits with country code,
// e.g. 919876543210) and the WhatsApp row turns on.
const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.replace(/\D/g, "") ?? "";

// Cards and rows are links to the service's site, with a Call button on top.
// Anchors can't nest, so the site link is stretched over the whole card and
// the call link sits above it (z-10).
const STRETCHED_LINK = "absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2";

const ICON_TILE =
  "flex items-center justify-center bg-[#EEF0F8] text-[#1A1A4E] dark:bg-[#FAF7F2]/8 dark:text-[#FAF7F2]";

export default function HelpAndSupportPage() {
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <ProfileSubpageHeader title="Help and support" />

      <p className="text-sm leading-6 text-muted">
        If you&apos;re going through something heavy, talking helps. These are free and confidential. You&apos;re
        not alone.
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {COUNSELLING_LINES.map((line) => (
          <div
            key={line.name}
            className="relative flex flex-col items-center rounded-xl border border-brand/10 bg-surface px-6 py-6 text-center shadow-sm transition-colors hover:border-brand/30 dark:hover:border-[#FAF7F2]/25"
          >
            {line.website && (
              <>
                <a
                  href={line.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${line.name} website (opens in a new tab)`}
                  className={STRETCHED_LINK}
                />
                <span aria-hidden="true" className="pointer-events-none absolute right-3 top-3 text-muted">
                  <ExternalLinkIcon />
                </span>
              </>
            )}

            <div className={`h-12 w-12 rounded-full ${ICON_TILE}`}>
              <PhoneIcon size={22} />
            </div>

            <h3 className="pt-3 text-[16px] font-bold leading-6 text-ink">{line.name}</h3>
            <p className="pt-1 text-[14px] font-semibold leading-5 text-ink">{line.number}</p>
            <p className="pb-5 pt-1 text-[12px] leading-[19.5px] text-muted">{line.availability}</p>

            <a
              href={`tel:${line.dial}`}
              aria-label={`Call ${line.name} on ${line.number}`}
              className="relative z-10 mt-auto flex h-9.5 w-full items-center justify-center gap-2 rounded-lg border border-brand px-4 text-[14px] font-semibold text-body-text transition-colors hover:bg-tint-strong dark:border-[#FAF7F2]/30 dark:text-ink"
            >
              <PhoneIcon size={14} />
              Call Now
            </a>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2.1fr_1fr]">
        {/* National helplines */}
        <div className="rounded-xl border border-brand/10 bg-surface p-5 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className={`h-10 w-10 rounded-xl ${ICON_TILE}`}>
              <PhoneIcon />
            </div>
            <div>
              <h2 className="text-[18px] font-bold leading-7 text-ink">Helplines</h2>
              <p className="text-[12px] leading-4 text-muted">Free national numbers, available round the clock.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {NATIONAL_LINES.map((line) => (
              <div
                key={line.name}
                className="relative flex items-center justify-between gap-3 rounded-xl border border-brand/10 bg-tint px-3 py-4 transition-colors hover:bg-tint-strong sm:gap-4 sm:px-4"
              >
                {/* 112 has no site of its own — that row just calls. */}
                {line.website ? (
                  <a
                    href={line.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${line.name} website (opens in a new tab)`}
                    className={STRETCHED_LINK}
                  />
                ) : (
                  <a
                    href={`tel:${line.dial}`}
                    aria-label={`Call ${line.name} on ${line.number}`}
                    className={STRETCHED_LINK}
                  />
                )}
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className={`h-10 w-10 shrink-0 rounded-lg ${ICON_TILE}`}>
                    <PhoneIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[14px] font-bold leading-5 text-ink">
                      {line.name} · {line.number}
                      {line.website && (
                        <span aria-hidden="true" className="text-muted">
                          <ExternalLinkIcon />
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-4 text-muted">
                      {line.description}
                      {/* The side column is dropped on narrow screens. */}
                      <span className="sm:hidden"> {line.availability}.</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden text-[12px] font-semibold text-muted sm:inline">{line.availability}</span>
                  <a
                    href={`tel:${line.dial}`}
                    aria-label={`Call ${line.name} on ${line.number}`}
                    className="relative z-10 flex h-8 items-center gap-1.5 rounded-lg border border-brand bg-surface px-3 text-[12px] font-semibold text-body-text transition-colors hover:bg-tint-strong dark:border-[#FAF7F2]/30 dark:text-ink"
                  >
                    <PhoneIcon size={12} />
                    Call
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prepex support */}
        <div className="rounded-xl border border-brand/10 bg-surface p-5 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className={`h-10 w-10 rounded-xl ${ICON_TILE}`}>
              <MessageIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold leading-7 text-ink">Need more help?</h2>
              <p className="text-[12px] leading-4 text-muted">Our support team is here for you.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {SUPPORT_WHATSAPP ? (
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-17 w-full items-center justify-between rounded-xl border border-brand/10 bg-tint px-4 transition-colors hover:bg-tint-strong"
              >
                <SupportRowBody icon={<WhatsApp className="h-4 w-4" />} title="WhatsApp" detail="Chat with us on WhatsApp" />
                <ChevronRightIcon className="h-4 w-4 text-muted" />
              </a>
            ) : (
              <div
                aria-disabled="true"
                className="flex h-17 w-full items-center justify-between rounded-xl border border-brand/10 bg-tint px-4 opacity-60"
              >
                <SupportRowBody icon={<WhatsApp className="h-4 w-4" />} title="WhatsApp" detail="Coming soon" />
              </div>
            )}

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex h-17 w-full items-center justify-between rounded-xl border border-brand/10 bg-tint px-4 transition-colors hover:bg-tint-strong"
            >
              <SupportRowBody icon={<EmailIcon className="h-4 w-4" />} title="Email" detail={SUPPORT_EMAIL} />
              <ChevronRightIcon className="h-4 w-4 text-muted" />
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint-strong text-ink">
            <InfoIcon />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">Still can&apos;t find what you&apos;re looking for?</p>
            <p className="text-xs text-muted">Reach out to us and we&apos;ll get back to you as soon as possible.</p>
          </div>
        </div>
        <Button variant="primary" size="sm" href={`mailto:${SUPPORT_EMAIL}`}>
          Contact Support
        </Button>
      </div>
    </div>
  );
}

function SupportRowBody({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`h-10 w-10 rounded-lg ${ICON_TILE}`}>{icon}</div>
      <div className="text-left">
        <p className="text-[14px] font-bold leading-5 text-ink">{title}</p>
        <p className="mt-0.5 text-[12px] leading-4 text-muted">{detail}</p>
      </div>
    </div>
  );
}
