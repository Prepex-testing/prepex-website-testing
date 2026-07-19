"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  HelpCircleIcon,
  ChatIcon,
  MailIcon,
  SunIcon,
  AlertTriangleIcon,
  InfoIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  BookOpenIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { SettingRow } from "@/components/profile/SettingRow";

const SUPPORT_OPTIONS = [
  {
    id: "faqs",
    icon: <HelpCircleIcon />,
    title: "FAQs",
    subtitle: "Browse answers to common questions",
    action: "View FAQs",
  },
  {
    id: "whatsapp",
    icon: <ChatIcon />,
    title: "WhatsApp Support",
    subtitle: "Chat with our support team on WhatsApp",
    action: "Open WhatsApp",
  },
  {
    id: "email",
    icon: <MailIcon />,
    title: "Email Support",
    subtitle: "Send us an email and we'll get back to you",
    action: "Send Email",
  },
  {
    id: "wellness",
    icon: <SunIcon />,
    title: "Wellness Resources",
    subtitle: "Explore mental wellness and student resources",
    action: "Open Resources",
  },
];

const FAQS = [
  "How do I reset my password?",
  "How is my streak calculated?",
  "How do I export my data?",
  "How do I contact my mentor?",
  "How do I cancel my subscription?",
  "Is my data secure?",
];

export default function HelpAndSupportPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <ProfileSubpageHeader title="Help and support" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {SUPPORT_OPTIONS.map((option) => (
          <div
            key={option.id}
            className="
        flex h-[247px] flex-col items-center
        rounded-xl border border-brand/10
        bg-surface
        px-6 py-6
        text-center
        shadow-sm
      "
          >
            {/* Icon */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tint text-ink">
              {option.icon}
            </div>

            {/* Title */}
            <div className="pt-2">
              <h3 className="text-[16px] font-bold leading-6 text-ink">
                {option.title}
              </h3>
            </div>

            {/* Subtitle */}
            <div className="flex flex-1 items-start px-4 pt-2">
              <p className="w-full text-[12px] leading-[19.5px] text-muted">
                {option.subtitle}
              </p>
            </div>

            {/* Button */}
            <Button
              variant="secondary"
              className="
          mt-auto
          h-[38px]
          w-full
          rounded-lg
          border border-white/25
          bg-transparent
          px-4
          text-[14px]
          font-semibold
        "
            >
              {option.action}
            </Button>
          </div>
        ))}
      </div>



      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2.1fr_1fr]">

        {/* FAQ */}
        <div className="rounded-xl border border-brand/10 bg-surface p-8 shadow-sm">

          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint">
              <BookOpenIcon />
            </div>

            <div>
              <h2 className="text-[18px] font-bold leading-7 text-ink">
                Frequently Asked Questions
              </h2>

              <p className="text-[12px] leading-4 text-muted">
                Find quick answers to common questions.
              </p>
            </div>
          </div>

          {/* Questions */}
          <div className="mt-6 border-t border-brand/10">

            {FAQS.map((faq) => (
              <button
                key={faq}
                type="button"
                onClick={() =>
                  setOpenFaq((current) => (current === faq ? null : faq))
                }
                className="flex h-[52px] w-full items-center justify-between border-b border-brand/10 text-left"
              >
                <span className="text-[14px] font-bold text-ink">
                  {faq}
                </span>

                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${openFaq === faq ? "rotate-180" : ""
                    }`}
                />
              </button>
            ))}

          </div>

        </div>

        {/* Right */}
        <div className="rounded-xl border border-brand/10 bg-surface p-8 shadow-sm">

          {/* Header */}
          <div className="flex items-start gap-4">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint">
              <ChatIcon />
            </div>

            <div>
              <h2 className="text-[18px] font-bold leading-7 text-ink">
                Need more help?
              </h2>

              <p className="text-[12px] leading-4 text-muted">
                Our support team is here for you.
              </p>
            </div>

          </div>

          <div className="mt-6 flex flex-col gap-4">

            {/* WhatsApp */}
            <button
              className="flex h-[68px] w-full items-center justify-between rounded-xl border border-brand/10 px-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint">
                  <ChatIcon />
                </div>

                <div className="text-left">
                  <p className="text-[14px] font-bold leading-5 text-ink">
                    WhatsApp
                  </p>

                  <p className="mt-0.5 text-[12px] leading-4 text-muted">
                    Chat with us on WhatsApp
                  </p>
                </div>
              </div>

              <ChevronRightIcon className="h-4 w-4 text-muted" />
            </button>

            {/* Email */}
            <button
              className="flex h-[68px] w-full items-center justify-between rounded-xl border border-brand/10 px-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint">
                  <MailIcon />
                </div>

                <div className="text-left">
                  <p className="text-[14px] font-bold leading-5 text-ink">
                    Email
                  </p>

                  <p className="mt-0.5 text-[12px] leading-4 text-muted">
                    support@prepex.in
                  </p>
                </div>
              </div>

              <ChevronRightIcon className="h-4 w-4 text-muted" />
            </button>

            {/* Support Hours */}
            <div
              className="flex h-[68px] items-center justify-between rounded-xl border border-brand/10 px-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint">
                  <ClockIcon />
                </div>

                <div>
                  <p className="text-[14px] font-bold leading-5 text-ink">
                    Support Hours
                  </p>

                  <p className="mt-0.5 text-[12px] leading-4 text-muted">
                    Monday - Saturday
                  </p>

                  <p className="text-[12px] leading-4 text-muted">
                    9:00 AM - 7:00 PM IST
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div className="rounded-xl border border-brand/10 p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint">
                  <ShieldIcon />
                </div>

                <p className="text-[11px] leading-5 text-muted">
                  Your privacy is important to us. We never share your data with third
                  parties.
                </p>
              </div>
            </div>

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
            <p className="text-xs text-muted">
              Reach out to us and we&apos;ll get back to you as soon as possible.
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm">
          Contact Support
        </Button>
      </div>
    </div>
  );
}
