"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Input } from "@/components/ui/Input";
import { DateField } from "@/components/ui/DateField";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { XIcon, PencilIcon } from "@/components/ui/icons";
import { AvatarFace } from "@/components/ui/AvatarFace";
import { FIELD_LABEL, FOOTER_BUTTON, MODAL_CLOSE_ICON, MODAL_TITLE } from "@/components/profile/modalStyles";
import { ApiError } from "@/lib/api/http";
import { updateIdentity } from "@/lib/api/account";
import {
  ACADEMIC_LEVEL_LABEL,
  getProfileOverview,
  removeAvatar,
  updateProfile,
  uploadAvatar,
  type AcademicLevel,
  type ProfileOverview,
  type ProfileUpdate,
} from "@/lib/api/profile";
import { updateStoredUser } from "@/lib/auth/session";
import { AvatarImageError, prepareAvatarImage, setAvatarUrl, useAvatarSrc } from "@/lib/profile/avatar";

type EditProfileModalProps = {
  open: boolean;
  onClose: () => void;
  overview: ProfileOverview | null;
  onSaved: (overview: ProfileOverview) => void;
};

export function EditProfileModal({ open, onClose, overview, onSaved }: EditProfileModalProps) {
  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Edit Profile">
   
      {overview ? (
        <EditProfileForm overview={overview} onClose={onClose} onSaved={onSaved} />
      ) : (
        <p className="py-6 text-center text-sm text-muted">Loading your profile…</p>
      )}
    </WhiteModal>
  );
}

const LEVEL_OPTIONS = (Object.keys(ACADEMIC_LEVEL_LABEL) as AcademicLevel[]).map((value) => ({
  value,
  label: ACADEMIC_LEVEL_LABEL[value],
}));

/** Change Photo / Remove — the "active" variant already carries the navy /
 *  cream border and text; these override its sm size. `!` because Button
 *  concatenates classes, so a plain h-/px-/rounded- wouldn't reliably win. */
const PHOTO_BUTTON =
  "h-10! rounded-xl! px-5! text-sm! leading-5 sm:h-11.5! sm:min-w-44 sm:px-8! sm:text-base! sm:leading-6";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** DateField speaks "DD/MM/YYYY"; the form and API use "YYYY-MM-DD". */
function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

function displayToIso(display: string): string {
  const [d, m, y] = display.split("/");
  return y && m && d ? `${y}-${m}-${d}` : "";
}

function EditProfileForm({
  overview,
  onClose,
  onSaved,
}: {
  overview: ProfileOverview;
  onClose: () => void;
  onSaved: (overview: ProfileOverview) => void;
}) {
  // What the date field shows on open: their own date, else the exam default.
  // Only a change from this counts as an edit, so opening and saving without
  // touching it doesn't quietly turn the default into "their" date.
  const initialExamDate = overview.targetExamDate ?? overview.examDate ?? "";

  const [fullName, setFullName] = useState(overview.fullName);
  const [phoneNumber, setPhoneNumber] = useState(overview.phoneNumber ?? "");
  const [city, setCity] = useState(overview.city ?? "");
  const [currentLevel, setCurrentLevel] = useState<AcademicLevel | "">(overview.currentLevel ?? "");
  const [examDate, setExamDate] = useState(initialExamDate);
  const [coachingName, setCoachingName] = useState(overview.coachingName ?? "");
  const [batchName, setBatchName] = useState(overview.batchName ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inCoaching = overview.coachingType === "COACHING";
  const initial = fullName.trim()[0]?.toUpperCase() ?? "S";

  // The photo saves the moment it's chosen, independently of the form below —
  // like most apps, and so Cancel never has to undo an upload.
  const avatarSrc = useAvatarSrc();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState<"uploading" | "removing" | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const photoProblem = (err: unknown, fallback: string) =>
    err instanceof ApiError || err instanceof AvatarImageError ? err.message : fallback;

  // The completion ring counts the photo, and the photo saves on its own
  // rather than through Save Changes — so the page behind this dialog has to
  // be told, or the percentage sits stale until the next reload. Best-effort:
  // the upload itself already succeeded, so a failed re-read isn't the
  // student's problem.
  const refreshOverview = () =>
    getProfileOverview()
      .then(({ data }) => onSaved(data))
      .catch(() => undefined);

  const handlePhotoChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared so choosing the same file again still fires a change.
    event.target.value = "";
    if (!file) return;

    setPhotoBusy("uploading");
    setPhotoError(null);
    try {
      const image = await prepareAvatarImage(file);
      const { data } = await uploadAvatar(image);
      setAvatarUrl(data.avatarUrl);
      await refreshOverview();
    } catch (err) {
      setPhotoError(photoProblem(err, "Couldn't upload your photo. Please try again."));
    } finally {
      setPhotoBusy(null);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoBusy("removing");
    setPhotoError(null);
    try {
      await removeAvatar();
      setAvatarUrl(null);
      await refreshOverview();
    } catch (err) {
      setPhotoError(photoProblem(err, "Couldn't remove your photo. Please try again."));
    } finally {
      setPhotoBusy(null);
    }
  };

  // Same comparisons handleSave uses to decide what to send — Save Changes
  // stays disabled until at least one of them differs from what was loaded.
  // (The photo saves on its own the moment it's picked, so it isn't counted.)
  const hasChanges =
    fullName.trim() !== overview.fullName ||
    city.trim() !== (overview.city ?? "") ||
    phoneNumber.trim() !== (overview.phoneNumber ?? "") ||
    (currentLevel !== "" && currentLevel !== overview.currentLevel) ||
    examDate !== initialExamDate ||
    (inCoaching &&
      (coachingName.trim() !== (overview.coachingName ?? "") ||
        batchName.trim() !== (overview.batchName ?? "")));

  const handleSave = async () => {
    const name = fullName.trim();
    if (!name) {
      setError("Enter your name.");
      return;
    }
    if (phoneNumber.trim() && !/^\+?[\d\s-]{7,20}$/.test(phoneNumber.trim())) {
      setError("Enter a valid phone number.");
      return;
    }
    if (examDate && examDate < todayIso()) {
      setError("Exam date can't be in the past.");
      return;
    }

    // Identity lives in auth-service; the rest is core-owned. Only what
    // actually changed is sent to either.
    const identity: { fullName?: string; city?: string; phoneNumber?: string } = {};
    if (name !== overview.fullName) identity.fullName = name;
    if (city.trim() !== (overview.city ?? "")) identity.city = city.trim();
    if (phoneNumber.trim() !== (overview.phoneNumber ?? "")) identity.phoneNumber = phoneNumber.trim();

    const profile: ProfileUpdate = {};
    if (currentLevel && currentLevel !== overview.currentLevel) profile.currentLevel = currentLevel;
    if (examDate !== initialExamDate) profile.targetExamDate = examDate || null;
    if (inCoaching) {
      if (coachingName.trim() !== (overview.coachingName ?? "")) {
        profile.coachingName = coachingName.trim() || null;
      }
      if (batchName.trim() !== (overview.batchName ?? "")) {
        profile.batchName = batchName.trim() || null;
      }
    }

    const hasIdentity = Object.keys(identity).length > 0;
    const hasProfile = Object.keys(profile).length > 0;
    if (!hasIdentity && !hasProfile) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        hasIdentity ? updateIdentity(identity) : Promise.resolve(),
        hasProfile ? updateProfile(profile) : Promise.resolve(),
      ]);
      if (identity.fullName) updateStoredUser({ fullName: identity.fullName });
      onSaved((await getProfileOverview()).data);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your changes. Please try again.");
      // If one half landed, show it rather than the pre-edit state.
      getProfileOverview()
        .then(({ data }) => onSaved(data))
        .catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className={MODAL_TITLE}>Edit Profile</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon className={MODAL_CLOSE_ICON} />
        </button>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="relative">
          <AvatarFace
            src={avatarSrc}
            alt="Your profile photo"
            fallback={initial}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-3xl font-bold text-white sm:h-28 sm:w-28 sm:text-4xl"
          />
          {photoBusy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </span>
          )}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={photoBusy !== null}
            aria-label="Change photo"
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-surface text-ink transition-colors hover:bg-tint-strong disabled:opacity-60"
          >
            <PencilIcon />
          </button>
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChosen}
        />

        <div className="flex items-center gap-2">
          <Button
            variant="active"
            size="sm"
            className={PHOTO_BUTTON}
            onClick={() => photoInputRef.current?.click()}
            disabled={photoBusy !== null}
          >
            {photoBusy === "uploading" ? "Uploading…" : "Change Photo"}
          </Button>
          {avatarSrc && (
            <Button
              variant="active"
              size="sm"
              className={PHOTO_BUTTON}
              onClick={handleRemovePhoto}
              disabled={photoBusy !== null}
            >
              {photoBusy === "removing" ? "Removing…" : "Remove"}
            </Button>
          )}
        </div>

        {photoError && (
          <p role="alert" className="text-center text-xs font-medium text-danger">
            {photoError}
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-brand/10 pt-4">
        <p className="font-sans text-base font-bold leading-6 tracking-normal align-middle text-ink sm:text-lg sm:leading-7">
          Personal Information
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <Input
            label="Full Name"
            labelClassName={FIELD_LABEL}
            value={fullName}
            maxLength={200}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="Phone Number"
            labelClassName={FIELD_LABEL}
            type="tel"
            inputMode="tel"
            value={phoneNumber}
            maxLength={20}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <Input label="City" labelClassName={FIELD_LABEL} value={city} maxLength={100} onChange={(e) => setCity(e.target.value)} />
          <CustomSelect
            label="Class"
            labelClassName={FIELD_LABEL}
            options={LEVEL_OPTIONS}
            placeholder="Select your class"
            value={currentLevel}
            onChange={(value) => setCurrentLevel(value as AcademicLevel)}
          />

          {/* Read-only on purpose: changing exam resets the student's subject
              selection, which a profile edit shouldn't do as a side effect. */}
          <div className="flex flex-col gap-2">
            <span className={FIELD_LABEL}>
              Target Exam
            </span>
            <p className="flex h-12.25 items-center rounded-xl border border-input-border bg-tint-strong px-4 text-[16px] text-muted">
              {overview.exam?.name ?? "—"}
            </p>
          </div>

          <DateField
            label="Exam Date"
            labelClassName={FIELD_LABEL}
            disablePast
            defaultValue={isoToDisplay(examDate)}
            onDateChange={(display) => setExamDate(displayToIso(display))}
          />

          {inCoaching && (
            <>
              <Input
                label="Coaching Institute"
                value={coachingName}
                maxLength={100}
                onChange={(e) => setCoachingName(e.target.value)}
              />
              <Input label="Batch" value={batchName} maxLength={100} onChange={(e) => setBatchName(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-danger">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <Button variant="secondary" size="sm" className={FOOTER_BUTTON} onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          className={FOOTER_BUTTON}
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </>
  );
}
