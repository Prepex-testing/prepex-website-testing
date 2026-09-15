"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Switch } from "@/components/ui/Switch";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  CheckCircleIcon,
  ShieldIcon,
  ClockIcon,
  GlobeIcon,
  EyeOffIcon,
  AlertTriangleIcon,
  CalendarIcon,
  EyeIcon,
  PhoneIcon,
  XIcon,
} from "@/components/ui/icons";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { VerificationSteps } from "@/components/profile/VerificationSteps";
import { ApiError } from "@/lib/api/http";
import {
  PARENT_LANGUAGE_OPTIONS,
  PARENT_NAME_OPTIONS,
  connectParent,
  disconnectParent,
  getParentConnection,
  previewParentReport,
  updateParentPhone,
  updateParentSettings,
  type ParentConnection,
  type ParentConnectionState,
  type ParentReportLanguage,
  type ParentReportPreview,
} from "@/lib/api/parent";

// ---------------------------------------------------------------------------
// Section 13 — Parent WhatsApp weekly report.
//
// Three states, all from GET /api/parent:
//   • no live connection  → the invite form (plus what happened to the last one)
//   • PENDING             → waiting for the parent's tap on WhatsApp
//   • VERIFIED            → the weekly-report controls from 13.6
// ---------------------------------------------------------------------------

const CARD = "rounded-2xl border border-brand/10 bg-surface shadow-[0px_1px_2px_0px_#00000008,0px_1px_3px_0px_#0000000D]";

/** Phone number / Relationship labels — semibold, 16px from sm up, 14px on phones. */
const FIELD_LABEL = "font-sans text-[14px] font-semibold leading-none tracking-normal align-middle text-ink sm:text-[16px]";

const PAUSE_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} ${i === 0 ? "week" : "weeks"}`,
}));

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Digits only, at most 10 — the field shows +91 in front. */
function cleanPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function isValidMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

export default function ParentConnectionPage() {
  const [state, setState] = useState<ParentConnectionState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getParentConnection()
      .then(({ data }) => setState(data))
      .catch((err) => setLoadError(errorMessage(err, "Couldn't load your parent connection.")));
  }, []);

  if (!state && !loadError) return <PageLoader label="Loading parent connection…" />;

  const connection = state?.connection ?? null;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <ProfileSubpageHeader title={connection?.status === "VERIFIED" ? "Parent connection settings" : "Connection with parent"} />

      {loadError && <p className="text-sm font-medium text-danger">{loadError}</p>}

      {state && !state.whatsapp.live && (
        <p className="rounded-xl border border-[#F59E0B] bg-[#FFFBEB] px-4 py-3 text-xs font-medium text-ink dark:border-transparent dark:bg-(--bg-card,#111145)">
          WhatsApp delivery isn&apos;t switched on yet — invites and reports are prepared and logged, but not
          actually sent.
        </p>
      )}

      {state && !connection && <ConnectForm lastEnded={state.lastEnded} onDone={setState} />}
      {state && connection?.status === "PENDING" && <PendingView connection={connection} onChange={setState} />}
      {state && connection?.status === "VERIFIED" && (
        <ConnectedView connection={connection} state={state} onChange={setState} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function SectionCard({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={`${CARD} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">{icon}</span>
          <div className="min-w-0">
            <p className="text-body-lg font-bold leading-6 text-ink">{title}</p>
            {subtitle && <p className="mt-1 text-[14px] leading-5 text-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

function PhoneField({
  id,
  value,
  onChange,
  label = "Parent's WhatsApp number",
}: {
  id: string;
  value: string;
  onChange: (digits: string) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      {/* Two joined boxes: +91 prefix (no right border) and the input. 58px
          tall from sm up, 48px on phones. */}
      <div className="flex h-12 w-full min-w-0 sm:h-14.5">
        <span className="flex shrink-0 items-center justify-center rounded-l-xl border border-r-0 border-[#E5E7EB] bg-[#F9FAFB] px-3 font-(family-name:--font-inter) text-[14px] font-medium leading-6 tracking-normal text-[#6B7280] dark:border-(--text-secondary,#8B8998) dark:bg-transparent dark:text-(--text-primary,#FAF7F2) sm:px-4 sm:text-[16px]">
          +91
        </span>
        <div className="flex min-w-0 flex-1 items-center rounded-r-xl border border-[#E5E7EB] bg-white px-4 transition-colors focus-within:border-focus-ring dark:border-(--text-secondary,#8B8998) dark:bg-(--bg-card,#111145) sm:px-5">
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={(event) => onChange(cleanPhone(event.target.value))}
            placeholder="10-digit WhatsApp number"
            className="w-full min-w-0 bg-transparent font-(family-name:--font-inter) text-[14px] font-normal leading-none tracking-normal text-ink outline-none placeholder:text-[#9CA3AF] dark:placeholder:text-(--text-secondary,#8B8998) sm:text-[16px]"
          />
        </div>
      </div>
    </div>
  );
}

function LanguageChips({ value, onChange }: { value: ParentReportLanguage; onChange: (v: ParentReportLanguage) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PARENT_LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${value === option.value
              ? "border-transparent bg-toggle-on text-surface"
              : "border-brand/15 text-body-text hover:bg-tint/40"
            }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** What happened to the last connection, when there's no live one. */
function EndedNotice({ connection }: { connection: ParentConnection }) {
  const who = connection.parentName || "Your parent";
  const text: Partial<Record<ParentConnection["status"], string>> = {
    DECLINED: connection.retryAvailableAt
      ? `${who} chose not to receive updates. You can invite ${connection.phoneMasked} again from ${formatDate(connection.retryAvailableAt)}, or invite someone else now.`
      : `${who} chose not to receive updates.`,
    LAPSED: `Your invite to ${who} expired without an answer. You can send a new one below.`,
    FAILED: `We couldn't reach ${connection.phoneMasked} on WhatsApp — it may be a wrong number, not on WhatsApp, or has blocked Prepex. Check the number and try again.`,
    STOPPED: `${who} replied STOP on WhatsApp, so weekly updates ended. You can reconnect them anytime.`,
  };
  const message = text[connection.status];
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand/10 bg-surface p-4">
      <span className="mt-0.5 shrink-0 text-ink">
        <AlertTriangleIcon />
      </span>
      <p className="text-sm text-body-text">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// No live connection — the invite (13.2.1)
// ---------------------------------------------------------------------------

function ConnectForm({
  lastEnded,
  onDone,
}: {
  lastEnded: ParentConnection | null;
  onDone: (state: ParentConnectionState) => void;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [language, setLanguage] = useState<ParentReportLanguage>("HINGLISH");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = isValidMobile(phone) && consent && !submitting;

  const handleConnect = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await connectParent({ phone, parentName: parentName || null, language, consent: true });
      onDone(data);
    } catch (err) {
      setError(errorMessage(err, "Couldn't send the invite. Please try again."));
      setSubmitting(false);
    }
  };

  return (
    <>
      {lastEnded && <EndedNotice connection={lastEnded} />}

      <div className={`${CARD} p-6`}>
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-[16px] font-bold leading-6 text-ink sm:text-[18px] sm:leading-7">
              Connect a parent (optional)
            </p>
            <p className="mt-1 text-[13px] leading-5 text-muted sm:text-[14px] sm:leading-5.5">
              Want your parent to get a weekly update on your prep? They&apos;ll receive a short summary on
              WhatsApp every Sunday — academic + emotional progress.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <PhoneField id="parent-phone" value={phone} onChange={setPhone} />
            {phone.length === 10 && !isValidMobile(phone) && (
              <p className="text-xs text-danger">Enter a valid Indian mobile number.</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <CustomSelect
              label="Relationship (optional)"
              labelClassName={FIELD_LABEL}
              value={parentName}
              onChange={setParentName}
              placeholder="Mom / Dad / Mummy / Papa / Guardian"
              options={PARENT_NAME_OPTIONS.map((name) => ({ value: name, label: name }))}
              triggerClassName="h-12 gap-2 rounded-xl px-4 py-3 sm:h-14.5 sm:px-5"
              className="gap-2! sm:gap-3!"
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">Preferred language</p>
            <LanguageChips value={language} onChange={setLanguage} />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-brand/10 p-4">
            {[
              { icon: <CalendarIcon />, text: "A short summary every Sunday at 7 PM — never daily." },
              { icon: <CheckCircleIcon />, text: "They confirm on WhatsApp first; nothing is sent until they tap Yes." },
              {
                icon: <ShieldIcon />,
                text: "Never shared: your check-in moods, weak topics, mistakes, practice answers, partner or journal.",
              },
            ].map((row) => (
              <div key={row.text} className="flex items-start gap-3">
                {/* Icon frame 24×24 (20×20 on phones), 2px line. Sized from the
                    tile because these icons don't all accept a className. */}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint-strong text-ink sm:h-10 sm:w-10 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0 sm:[&_svg]:h-6 sm:[&_svg]:w-6 **:stroke-2 **:[vector-effect:non-scaling-stroke]">
                  {row.icon}
                </span>
                <p className="pt-2.5 text-xs text-muted sm:pt-3">{row.text}</p>
              </div>
            ))}
          </div>

          <label className="flex w-full cursor-pointer flex-row items-start gap-2.5 sm:gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="m-0 h-4 w-4 shrink-0 cursor-pointer accent-brand sm:mt-px sm:h-4.5 sm:w-4.5"
            />
            <span className="min-w-0 flex-1 text-xs leading-4 text-body-text sm:text-sm sm:leading-5">
              This is my parent&apos;s or guardian&apos;s number, and I&apos;m okay with them getting a weekly
              update about my prep.
            </span>
          </label>

          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-brand/10 pt-5">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-11.5 rounded-xl border-2 border-ink/8 px-6 text-sm font-semibold text-ink"
            >
              Skip for now
            </button>
            <Button variant="primary" size="sm" className="h-11.5! rounded-xl px-8" disabled={!canSubmit} onClick={handleConnect}>
              {submitting ? "Sending invite…" : "Connect parent"}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted">Your information is safe and secure. We respect your privacy.</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// PENDING — waiting for the parent's tap (13.2.2 / 13.2.3)
// ---------------------------------------------------------------------------

function ChangeNumberForm({
  current,
  onSaved,
  onCancel,
}: {
  current: ParentConnection;
  onSaved: (state: ParentConnectionState) => void;
  onCancel: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!isValidMobile(phone)) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await updateParentPhone({ phone });
      onSaved(data);
    } catch (err) {
      setError(errorMessage(err, "Couldn't update the number. Please try again."));
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand/10 p-4">
      <PhoneField id="parent-new-phone" value={phone} onChange={setPhone} label={`New number for ${current.parentName || "your parent"}`} />
      <p className="text-xs text-muted">We&apos;ll send a fresh confirmation to the new number.</p>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={save} disabled={!isValidMobile(phone) || saving}>
          {saving ? "Sending…" : "Send confirmation"}
        </Button>
      </div>
    </div>
  );
}

function PendingView({ connection, onChange }: { connection: ParentConnection; onChange: (s: ParentConnectionState) => void }) {
  const [isChanging, setChanging] = useState(false);
  const [isCancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const who = connection.parentName || "your parent";

  const cancelInvite = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      const { data } = await disconnectParent();
      setCancelOpen(false);
      onChange(data);
    } catch (err) {
      setCancelError(errorMessage(err, "Couldn't cancel the invite."));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <SectionCard
        icon={<ClockIcon className="h-6 w-6" />}
        title={`Waiting for ${who} to confirm`}
        subtitle={`We sent a WhatsApp message to ${connection.phoneMasked} with "Yes, send updates" and "No thanks" buttons.`}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Requested on", value: formatDate(connection.requestedAt) },
            {
              label: connection.reminderSentAt ? "Reminder sent" : "Reminder on",
              value: formatDate(connection.reminderSentAt ?? connection.reminderDueAt),
            },
            { label: "Invite expires", value: formatDate(connection.expiresAt) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-tint-strong/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted">{item.label}</p>
              <p className="mt-0.5 text-xs font-bold text-ink">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <VerificationSteps verified={false} />
        </div>
      </SectionCard>

      <div className={`${CARD} flex flex-col gap-4 p-6`}>
        <p className="text-sm text-muted">
          Wrong number, or they didn&apos;t get it? Change the number to send a fresh confirmation, or cancel the invite.
        </p>
        {isChanging ? (
          <ChangeNumberForm current={connection} onSaved={onChange} onCancel={() => setChanging(false)} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setChanging(true)}>
              Change number
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="border-[#F59E0B]! text-[#F59E0B]!"
              onClick={() => setCancelOpen(true)}
            >
              Cancel invite
            </Button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={isCancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancelInvite}
        title="Cancel the invite?"
        description={`${who} hasn't confirmed yet, so they won't get any message about this.`}
        confirmLabel={cancelling ? "Cancelling…" : "Yes, cancel"}
        busy={cancelling}
        error={cancelError}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// VERIFIED — the student controls (13.6)
// ---------------------------------------------------------------------------

/** Renders WhatsApp's *bold* markers; everything else stays plain text. */
function WhatsAppText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*\n]+\*)/g).map((part, index) =>
        part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
          <strong key={index}>{part.slice(1, -1)}</strong>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const SKIP_COPY: Record<NonNullable<ParentReportPreview["skipReason"]>, string> = {
  EXAM_DAY: "You have an exam or mock scheduled on Sunday, so no report goes out this week. It resumes next Sunday.",
  HIBERNATING:
    "Reports are paused because you've been away for three weeks. They restart automatically once you're back.",
  EXAM_PASSED: "Your exam date has passed, so reports are paused until you set your next exam date.",
  UNSAFE_COPY: "This week's report couldn't be prepared. It will try again next Sunday.",
};

function PreviewModal({
  open,
  onClose,
  language,
}: {
  open: boolean;
  onClose: () => void;
  language: ParentReportLanguage;
}) {
  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Preview this week's report" size="lg">
      {open && <PreviewBody initialLanguage={language} onClose={onClose} />}
    </WhiteModal>
  );
}

function PreviewBody({ initialLanguage, onClose }: { initialLanguage: ParentReportLanguage; onClose: () => void }) {
  const [language, setLanguage] = useState(initialLanguage);
  const [preview, setPreview] = useState<{ language: ParentReportLanguage; data: ParentReportPreview | null; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    previewParentReport(language)
      .then(({ data }) => !cancelled && setPreview({ language, data, error: null }))
      .catch((err) => !cancelled && setPreview({ language, data: null, error: errorMessage(err, "Couldn't build the preview.") }));
    return () => {
      cancelled = true;
    };
  }, [language]);

  const current = preview?.language === language ? preview : null;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">This week&apos;s report</h2>
          <p className="mt-1 text-xs text-muted">Exactly what your parent would receive on WhatsApp.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
      </div>

      <div className="mt-4">
        <LanguageChips value={language} onChange={setLanguage} />
      </div>

      <div className="mt-4 max-h-[55vh] overflow-y-auto rounded-2xl bg-[#E7F7EE] p-4 dark:bg-[#0B3D2E]">
        {!current ? (
          <p className="text-sm text-muted">Preparing preview…</p>
        ) : current.error ? (
          <p className="text-sm font-medium text-danger">{current.error}</p>
        ) : current.data?.body ? (
          <div className="max-w-[95%] rounded-xl rounded-tl-none bg-white p-3 text-[13px] leading-5 whitespace-pre-wrap text-[#111B21] shadow-sm dark:bg-[#1F2C33] dark:text-[#E9EDEF]">
            <WhatsAppText text={current.data.body} />
          </div>
        ) : (
          <p className="text-sm text-ink">{current.data?.skipReason ? SKIP_COPY[current.data.skipReason] : "No report this week."}</p>
        )}
      </div>
    </>
  );
}

function ConnectedView({
  connection,
  state,
  onChange,
}: {
  connection: ParentConnection;
  state: ParentConnectionState;
  onChange: (s: ParentConnectionState) => void;
}) {
  const who = connection.parentName || "Your parent";
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pauseWeeks, setPauseWeeks] = useState("1");
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [isChanging, setChanging] = useState(false);
  const [isDisconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const save = async (key: string, patch: Parameters<typeof updateParentSettings>[0]) => {
    setSavingKey(key);
    setError(null);
    try {
      const { data } = await updateParentSettings(patch);
      onChange(data);
    } catch (err) {
      setError(errorMessage(err, "Couldn't save that change. Please try again."));
    } finally {
      setSavingKey(null);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const { data } = await disconnectParent();
      setDisconnectOpen(false);
      onChange(data);
    } catch (err) {
      setDisconnectError(errorMessage(err, "Couldn't disconnect. Please try again."));
    } finally {
      setDisconnecting(false);
    }
  };

  const reportStatus = !connection.reportsEnabled
    ? "Weekly reports are turned off."
    : connection.pausedUntil
      ? `Reports paused until ${formatDate(connection.pausedUntil)}.`
      : connection.hibernating
        ? "Reports are paused while you're away — they restart automatically when you're back."
        : "Weekly update every Sunday at 7 PM.";

  return (
    <>
      <SectionCard
        icon={<CheckCircleIcon />}
        title={`${who} is connected`}
        subtitle={`${connection.phoneMasked} · confirmed on ${formatDate(connection.verifiedAt)}. ${reportStatus}`}
        action={
          <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)} className="gap-2">
            <EyeIcon />
            Preview this week
          </Button>
        }
      >
        <VerificationSteps verified />
      </SectionCard>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <SectionCard
        icon={<CalendarIcon />}
        title="Send weekly reports"
        subtitle="Turn off to stop reports without disconnecting."
        action={
          <Switch
            checked={connection.reportsEnabled}
            onChange={(checked) => save("reports", { reportsEnabled: checked })}
            label="Send weekly reports"
          />
        }
      />

      <SectionCard icon={<GlobeIcon />} title="Report language" subtitle="The language your parent reads the weekly update in.">
        <LanguageChips value={connection.language} onChange={(language) => save("language", { language })} />
      </SectionCard>

      <SectionCard
        icon={<EyeOffIcon />}
        title="Hide mock scores"
        subtitle={'Your parent sees only that you "attempted a mock" — no marks.'}
        action={
          <Switch
            checked={connection.hideMockScores}
            onChange={(checked) => save("mock", { hideMockScores: checked })}
            label="Hide mock scores"
          />
        }
      />

      <SectionCard
        icon={<ClockIcon className="h-6 w-6" />}
        title="Pause reports"
        subtitle={
          connection.pausedUntil
            ? `Paused until ${formatDate(connection.pausedUntil)} — resumes automatically.`
            : "Take a break for 1–12 weeks. Reports resume on their own."
        }
      >
        {connection.pausedUntil ? (
          <Button variant="secondary" size="sm" onClick={() => save("pause", { pauseWeeks: 0 })} disabled={savingKey === "pause"}>
            {savingKey === "pause" ? "Resuming…" : "Resume now"}
          </Button>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Select
                label="Pause for"
                labelClassName="sr-only"
                value={pauseWeeks}
                onChange={(event) => setPauseWeeks(event.target.value)}
                options={PAUSE_OPTIONS}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => save("pause", { pauseWeeks: Number(pauseWeeks) })}
              disabled={savingKey === "pause"}
            >
              {savingKey === "pause" ? "Pausing…" : "Pause reports"}
            </Button>
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<PhoneIcon size={20} />}
        title="Parent's number"
        subtitle={`${connection.phoneMasked}. Changing it sends a fresh confirmation to the new number.`}
        action={
          !isChanging && (
            <Button variant="secondary" size="sm" onClick={() => setChanging(true)}>
              Update number
            </Button>
          )
        }
      >
        {isChanging && <ChangeNumberForm current={connection} onSaved={onChange} onCancel={() => setChanging(false)} />}
      </SectionCard>

      {state.recentReports.length > 0 && (
        <div className={`${CARD} p-6`}>
          <p className="text-body-lg font-bold text-ink">Recent reports</p>
          <div className="mt-4 flex flex-col divide-y divide-brand/10">
            {state.recentReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-ink">Week of {formatDate(report.weekStart)}</span>
                <span className="text-xs font-semibold text-muted">
                  {report.status === "DRY_RUN"
                    ? "Prepared (not sent)"
                    : report.status === "READ"
                      ? "Read"
                      : report.status === "DELIVERED"
                        ? "Delivered"
                        : report.status === "SENT"
                          ? "Sent"
                          : report.status === "FAILED"
                            ? "Not delivered"
                            : "Sending…"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SectionCard
        icon={<AlertTriangleIcon />}
        title="Disconnect parent"
        subtitle={`Reports stop immediately and ${who} gets one short message that updates have ended.`}
        action={
          <Button
            variant="secondary"
            size="sm"
            className="border-[#F59E0B]! text-[#F59E0B]!"
            onClick={() => setDisconnectOpen(true)}
          >
            Disconnect
          </Button>
        }
      />

      <PreviewModal open={isPreviewOpen} onClose={() => setPreviewOpen(false)} language={connection.language} />

      <ConfirmModal
        open={isDisconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        onConfirm={disconnect}
        title="Disconnect parent?"
        description={`Weekly reports stop right away and ${who} receives a short message that updates have ended. You can connect again later.`}
        confirmLabel={disconnecting ? "Disconnecting…" : "Yes, disconnect"}
        busy={disconnecting}
        error={disconnectError}
      />
    </>
  );
}
