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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPORT_OPTIONS.map((option) => (
          <div
            key={option.id}
            className="flex flex-col items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-5 text-center"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tint-strong text-ink">
              {option.icon}
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{option.title}</p>
              <p className="mt-1 text-xs text-muted">{option.subtitle}</p>
            </div>
            <Button variant="secondary" size="sm" className="w-full">
              {option.action}
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <button
          type="button"
          className="flex items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-5 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
            <AlertTriangleIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">Report a Bug</p>
            <p className="text-xs text-muted">
              Help us improve Prepex by letting us know what&apos;s not working.
            </p>
          </div>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
        </button>
        <button
          type="button"
          className="flex items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-5 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
            <ChatIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">Share Feedback</p>
            <p className="text-xs text-muted">
              We&apos;d love to hear your thoughts and suggestions.
            </p>
          </div>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-brand/10 bg-surface p-5 lg:col-span-2">
          <p className="text-sm font-bold text-ink">Frequently Asked Questions</p>
          <p className="text-xs text-muted">Find quick answers to common questions</p>

          <div className="mt-3 flex flex-col divide-y divide-brand/5">
            {FAQS.map((faq) => (
              <button
                key={faq}
                type="button"
                onClick={() => setOpenFaq((current) => (current === faq ? null : faq))}
                aria-expanded={openFaq === faq}
                className="flex w-full items-center justify-between gap-3 py-3 text-left"
              >
                <span className="text-sm font-semibold text-body-text">{faq}</span>
                <ChevronDownIcon
                  className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                    openFaq === faq ? "rotate-180" : ""
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-tint-strong/40 p-5">
          <p className="text-sm font-bold text-ink">Need more help?</p>
          <p className="text-xs text-muted">Our support team is here for you.</p>

          <div className="mt-3 flex flex-col divide-y divide-brand/10">
            <SettingRow
              icon={<ChatIcon />}
              title="WhatsApp"
              subtitle="Chat with us on WhatsApp"
              iconClassName="bg-surface text-ink"
              right={<ChevronRightIcon className="h-4 w-4 text-muted" />}
            />
            <SettingRow
              icon={<MailIcon />}
              title="Email"
              subtitle="support@prepex.in"
              iconClassName="bg-surface text-ink"
              right={<ChevronRightIcon className="h-4 w-4 text-muted" />}
            />
            <SettingRow
              icon={<ClockIcon />}
              title="Support Hours"
              subtitle="Monday - Saturday, 9:00 AM - 7:00 PM IST"
              iconClassName="bg-surface text-ink"
            />
          </div>
          <p className="mt-3 text-[10px] text-muted">
            Your privacy is important to us. We never share your data with third parties.
          </p>
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
