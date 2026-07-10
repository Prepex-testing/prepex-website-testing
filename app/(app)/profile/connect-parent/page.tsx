"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Chip } from "@/components/ui/Chip";
import { CalendarIcon, ClockIcon, CheckIcon } from "@/components/ui/icons";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";

const LANGUAGES = ["English", "हिन्दी"];

export default function ConnectParentPage() {
  const [language, setLanguage] = useState("English");
  const [whatsapp, setWhatsapp] = useState("");

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <ProfileSubpageHeader title="Connection with parent" />

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <Input
          label="Parent's WhatsApp number"
          placeholder="Enter WhatsApp number"
          icon={<span className="text-sm font-semibold text-ink">+91</span>}
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          helperText="They'll receive a verification message first."
        />

        <div className="mt-5">
          <Select
            label="Relationship"
            placeholder="Mom / Dad / Mummy / Papa / Guardian"
            options={[
              { value: "mom", label: "Mom / Mummy" },
              { value: "dad", label: "Dad / Papa" },
              { value: "guardian", label: "Guardian" },
            ]}
          />
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-ink">Preferred language</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <Chip key={lang} selected={language === lang} onClick={() => setLanguage(lang)}>
                {lang}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-brand/10 p-4">
          <span className="mt-0.5 shrink-0 text-ink">
            <CalendarIcon />
          </span>
          <p className="text-xs text-muted">
            They&apos;ll receive a short summary every Sunday at 7 PM. You can update or remove
            this anytime from Settings.
          </p>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Verification status (preview)
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-tint-strong/50 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
                <ClockIcon />
              </span>
              <div>
                <p className="text-xs font-bold text-ink">Pending</p>
                <p className="text-[10px] text-muted">Invitation sent to parent</p>
              </div>
            </div>
            <div className="hidden h-px flex-1 border-t border-dashed border-brand/20 sm:block" />
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-success-bg p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-success">
                <CheckIcon />
              </span>
              <div>
                <p className="text-xs font-bold text-success">Verified</p>
                <p className="text-[10px] text-muted">Updates will start automatically</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/profile" className="text-xs font-semibold text-muted underline">
            Skip for now
          </Link>
          <Button variant="primary" size="sm">
            Connect Parent
          </Button>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted">
        Your information is safe and secure. We respect your privacy.
      </p>
    </div>
  );
}
