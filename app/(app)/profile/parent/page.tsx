"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";
import {
  CheckCircleIcon,
  ShieldIcon,
  ClockIcon,
  GlobeIcon,
  EyeOffIcon,
  AlertTriangleIcon,
  CalendarIcon,
} from "@/components/ui/icons";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { Switch } from "@/components/ui/Switch";

type ConnectionStatus = "disconnected" | "pending" | "connected";

const VERIFY_DELAY_MS = 6000;

const REPORT_LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
  { value: "ta", label: "தமிழ்" },
  { value: "te", label: "తెలుగు" },
  { value: "bn", label: "বাংলা" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "mom", label: "Mom" },
  { value: "dad", label: "Dad" },
  { value: "mummy", label: "Mummy" },
  { value: "papa", label: "Papa" },
  { value: "guardian", label: "Guardian" },
];

function formatToday() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ParentConnectionSettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [reportLanguage, setReportLanguage] = useState("en");
  const [requestedOn, setRequestedOn] = useState("");

  const [hideMockScores, setHideMockScores] = useState(true);
  const [pauseReports, setPauseReports] = useState(false);
  const [isDisconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);

  useEffect(() => {
    if (status !== "pending") return;
    const timer = setTimeout(() => setStatus("connected"), VERIFY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const handleConnect = () => {
    if (!phone.trim()) return;
    setRequestedOn(formatToday());
    setStatus("pending");
  };

  const handleDisconnect = () => {
    setStatus("disconnected");
    setPhone("");
    setRelationship("");
    setRequestedOn("");
    setDisconnectConfirmOpen(false);
  };

  const cardShadow =
    "shadow-[0px_1px_2px_0px_#00000008,0px_1px_3px_0px_#0000000D]";

  const verificationStatusCard = (
    <div
      className={`rounded-2xl border border-brand/10 bg-surface ${cardShadow}`}
    >
      <div className="flex flex-wrap items-center gap-4 p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
          <ShieldIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-lg font-bold leading-6 text-ink">Verification Status</p>
          <p className="mt-1 text-[14px] leading-5 text-muted">
            Current status of your parent&apos;s verification.
          </p>
        </div>
      </div>

      <div className="mx-6 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-tint-strong/50 p-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">Pending</p>
          <p className="text-xs text-muted">
            Your parent&apos;s verification is in progress. You will be notified once it
            is verified.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted">Requested on</p>
          <p className="text-xs font-bold text-ink">{requestedOn}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <ProfileSubpageHeader
        title={status === "disconnected" ? "Connection with parent" : "Parent connection settings"}
      />

      {status === "disconnected" && (
        <>
          <div className={`rounded-2xl border border-brand/10 bg-surface p-6 ${cardShadow}`}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <label htmlFor="parent-phone" className="text-sm font-semibold text-ink">
                  Parent&apos;s WhatsApp number
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-brand/15 px-4 py-4 focus-within:border-focus-ring">
                  <span className="text-sm font-semibold text-muted">+91</span>
                  <input
                    id="parent-phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value.replace(/[^\d]/g, "").slice(0, 10))
                    }
                    placeholder="Enter WhatsApp number"
                    className="flex-1 bg-transparent text-sm text-body-text outline-none placeholder:text-muted/70"
                  />
                </div>
                <p className="text-xs text-muted">They&apos;ll receive a verification message first.</p>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="parent-relationship" className="text-sm font-semibold text-ink">
                  Relationship
                </label>
                <Select
                  id="parent-relationship"
                  label="Relationship"
                  labelClassName="sr-only"
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value)}
                  placeholder="Mom / Dad / Mummy / Papa / Guardian"
                  options={RELATIONSHIP_OPTIONS}
                />
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-ink">Preferred language</p>
                <div className="flex flex-wrap gap-2">
                  {REPORT_LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setReportLanguage(option.value)}
                      aria-pressed={reportLanguage === option.value}
                      className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                        reportLanguage === option.value
                          ? "border-transparent bg-toggle-on text-surface"
                          : "border-brand/15 text-body-text hover:bg-tint/40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-brand/10 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint-strong text-ink">
                  <CalendarIcon />
                </span>
                <p className="text-xs text-muted">
                  They&apos;ll receive a short summary every Sunday at 7 PM. You can update or
                  remove this anytime from Settings.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface pt-2">
            <div className="flex flex-col gap-8 p-8">
              <p className="text-[16px] font-semibold leading-none text-ink">
                Verification status <span className="font-normal text-muted">(preview)</span>
              </p>

              <div className="flex flex-col items-stretch gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="flex min-w-0 items-center rounded-xl border border-muted bg-ink/8 p-4">
                  <span className="flex h-12 w-16 shrink-0 items-center pr-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-tint-strong text-ink">
                      <ClockIcon />
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium leading-none text-ink">Pending</p>
                    <p className="mt-1 text-[10px] text-muted">Invitation sent to parent</p>
                  </div>
                </div>

                <span className="hidden shrink-0 px-8 text-muted sm:inline">┄┄┄┄┄</span>

                <div className="flex min-w-0 items-center rounded-xl border border-success/30 bg-success-bg p-4">
                  <span className="flex h-12 w-16 shrink-0 items-center pr-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg text-success">
                      <CheckCircleIcon />
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium leading-none text-success">Verified</p>
                    <p className="mt-1 text-[10px] text-success/80">Updates will start automatically</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-brand/10 p-8">
              <button
                type="button"
                onClick={() => router.back()}
                className="h-11.5 w-34.75 rounded-xl border-2 border-ink/[0.08] text-sm font-semibold text-ink"
              >
                Skip for now
              </button>
              <Button
                variant="primary"
                size="sm"
                className="!h-11.5 rounded-xl px-8"
                disabled={!phone.trim()}
                onClick={handleConnect}
              >
                Connect Parent
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted">
            Your information is safe and secure. We respect your privacy.
          </p>
        </>
      )}

      {status === "pending" && (
        <>
          <div className="flex items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
              <ClockIcon />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Connection requested</p>
              <p className="text-xs text-muted">
                We&apos;ve sent a WhatsApp message to +91 {phone}. Your parent needs to confirm
                to complete the connection.
              </p>
            </div>
          </div>

          {verificationStatusCard}
        </>
      )}

      {status === "connected" && (
        <>
          <div className={`rounded-2xl border border-brand/10 bg-surface ${cardShadow}`}>
            <div className="flex flex-wrap items-center gap-4 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tint-strong text-ink">
                <CheckCircleIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body-lg font-bold leading-6 text-ink">Parent Connected</p>
                <p className="mt-1 text-[14px] leading-5 text-muted">
                  Your parent can view your study progress and reports.
                </p>
              </div>
            </div>
          </div>

          {verificationStatusCard}

          <div className={`rounded-2xl border border-brand/10 bg-surface p-6 ${cardShadow}`}>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
                <GlobeIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body-lg font-bold leading-6 text-ink">Language Preference</p>
                <p className="mt-1 text-[14px] leading-5 text-muted">
                  Choose the language in which reports are shown to your parent.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Select
                label="Preferred language"
                labelClassName="sr-only"
                options={[
                  { value: "en", label: "English" },
                  { value: "hinglish", label: "Hinglish" },
                ]}
                defaultValue="en"
              />
            </div>
          </div>

          <div className={`rounded-2xl border border-brand/10 bg-surface ${cardShadow}`}>
            <div className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
                  <EyeOffIcon />
                </span>
                <div className="min-w-0">
                  <p className="text-body-lg font-bold leading-6 text-ink">Hide Mock Scores</p>
                  <p className="mt-1 text-[14px] leading-5 text-muted">
                    Hide your mock test scores from your parent.
                  </p>
                </div>
              </div>
              <Switch checked={hideMockScores} onChange={setHideMockScores} label="Hide Mock Scores" />
            </div>
            <p className="mx-6 mb-6 text-[14px] font-medium leading-[22.75px] text-ink">
              When enabled, your mock scores will not be visible to your parent in the parent
              portal.
            </p>
          </div>

          <div className={`rounded-2xl border border-brand/10 bg-surface ${cardShadow}`}>
            <div className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
                  <ClockIcon />
                </span>
                <div className="min-w-0">
                  <p className="text-body-lg font-bold leading-6 text-ink">Pause Reports</p>
                  <p className="mt-1 text-[14px] leading-5 text-muted">
                    Temporarily stop sharing your progress reports with your parent.
                  </p>
                </div>
              </div>
              <Switch checked={pauseReports} onChange={setPauseReports} label="Pause Reports" />
            </div>
            <p className="mx-6 mb-6 text-[14px] font-medium leading-[22.75px] text-ink">
              During this time, your parent will not receive updates or be able to view your
              progress.
            </p>
          </div>

          <div className={`rounded-2xl border border-brand/10 bg-surface ${cardShadow}`}>
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
                  <AlertTriangleIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-lg font-bold leading-6 text-ink">Disconnect Parent</p>
                  <p className="mt-1 text-[14px] leading-5 text-muted">
                    Disconnect your parent account. This action can be undone within 7 days.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 border-[#F59E0B]! text-[#F59E0B]!"
                onClick={() => setDisconnectConfirmOpen(true)}
              >
                Disconnect Parent
              </Button>
            </div>
            <p className="mx-6 mb-6 text-[14px] font-semibold leading-5 text-ink">
              Your parent will lose access to your progress reports and portal.
            </p>
          </div>
        </>
      )}

      <ConfirmModal
        open={isDisconnectConfirmOpen}
        onClose={() => setDisconnectConfirmOpen(false)}
        onConfirm={handleDisconnect}
        title="Disconnect parent?"
        description="Your parent will lose access to your progress reports and portal. This action can be undone within 7 days."
        confirmLabel="Yes, Disconnect"
      />
    </div>
  );
}
