"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  CheckCircleIcon,
  ShieldIcon,
  ClockIcon,
  GlobeIcon,
  EyeOffIcon,
  AlertTriangleIcon,
} from "@/components/ui/icons";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { ToggleRow } from "@/components/profile/ToggleRow";

type ConnectionStatus = "disconnected" | "pending" | "connected";

const VERIFY_DELAY_MS = 6000;

const REPORT_LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
];

function formatToday() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ParentConnectionSettingsPage() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [phone, setPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [reportLanguage, setReportLanguage] = useState("hinglish");
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
    setParentName("");
    setRequestedOn("");
    setDisconnectConfirmOpen(false);
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <ProfileSubpageHeader title="Parent connection settings" />

      {status === "disconnected" && (
        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-base font-bold text-ink">Connect a parent (optional)</p>
          <p className="mt-1 text-xs text-muted">
            Want your parent to get a weekly update on your prep? They&apos;ll receive a short
            summary on WhatsApp every Sunday — academic + emotional progress.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="parent-phone" className="text-sm font-semibold text-ink">
                Parent&apos;s WhatsApp number
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-brand/15 px-4 py-3 focus-within:border-focus-ring">
                <span className="text-sm font-semibold text-muted">+91</span>
                <input
                  id="parent-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/[^\d]/g, "").slice(0, 10))
                  }
                  placeholder="98765 43210"
                  className="flex-1 bg-transparent text-sm text-body-text outline-none placeholder:text-muted/70"
                />
              </div>
            </div>

            <Input
              label="Parent's name (optional)"
              placeholder="Mom / Dad / Mummy / Papa / etc."
              value={parentName}
              onChange={(event) => setParentName(event.target.value)}
            />

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-ink">Preferred language</p>
              <div className="flex flex-wrap gap-4">
                {REPORT_LANGUAGE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-body-text"
                  >
                    <input
                      type="radio"
                      name="parent-report-language"
                      value={option.value}
                      checked={reportLanguage === option.value}
                      onChange={() => setReportLanguage(option.value)}
                      className="peer sr-only"
                    />
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-brand/25 peer-checked:border-brand">
                      {reportLanguage === option.value && (
                        <span className="h-2 w-2 rounded-full bg-brand" />
                      )}
                    </span>
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="mt-5"
            disabled={!phone.trim()}
            onClick={handleConnect}
          >
            Connect parent
          </Button>
        </div>
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

          <div className="rounded-2xl border border-brand/10 bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
                <ShieldIcon />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Verification Status</p>
                <p className="text-xs text-muted">
                  Current status of your parent&apos;s verification.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-tint-strong/50 p-4">
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
        </>
      )}

      {status === "connected" && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-bg text-success">
            <CheckCircleIcon />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">Parent Connected</p>
            <p className="text-xs text-muted">
              {parentName ? `${parentName} • ` : ""}+91 {phone}
            </p>
          </div>
        </div>
      )}

      {status === "connected" && (
        <>
          <div className="rounded-2xl border border-brand/10 bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
                <GlobeIcon />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Language Preference</p>
                <p className="text-xs text-muted">
                  Choose the language in which reports are shown to your parent.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Select
                label="Preferred language"
                options={[
                  { value: "en", label: "English" },
                  { value: "hinglish", label: "Hinglish" },
                ]}
                defaultValue="en"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-brand/10 bg-surface p-5">
            <ToggleRow
              icon={<EyeOffIcon />}
              title="Hide Mock Scores"
              subtitle="When enabled, your mock scores will not be visible to your parent in the parent portal."
              checked={hideMockScores}
              onChange={setHideMockScores}
            />
          </div>

          <div className="rounded-2xl border border-brand/10 bg-surface p-5">
            <ToggleRow
              icon={<ClockIcon />}
              title="Pause Reports"
              subtitle="Temporarily stop sharing your progress reports with your parent."
              checked={pauseReports}
              onChange={setPauseReports}
            />
            <p className="mt-3 rounded-xl bg-tint-strong/40 p-3 text-xs text-muted">
              During this time, your parent will not receive updates or be able to view your
              progress.
            </p>
          </div>

          <div className="rounded-2xl border border-cta/20 bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
                <AlertTriangleIcon />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Disconnect Parent</p>
                <p className="text-xs text-muted">
                  Disconnect your parent account. This action can be undone within 7 days.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 border-cta text-cta"
              onClick={() => setDisconnectConfirmOpen(true)}
            >
              Disconnect Parent
            </Button>
            <p className="mt-3 text-[10px] text-muted">
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
