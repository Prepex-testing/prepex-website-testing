"use client";

import { useRouter } from "next/navigation";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Button } from "@/components/ui/Button";
import { SunIcon } from "@/assets/icons";

type WellnessResourceModalProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Section 4.5 — surfaced at burnout Tier 5, or when a disengagement inquiry
 * answer asks for support. Calm, factual, non-medicalised framing (4.5.2).
 * The full resource list lives on the Wellness page (Help & support) — this
 * pop-up only points there.
 */
export function WellnessResourceModal({ open, onClose }: WellnessResourceModalProps) {
  const router = useRouter();

  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Wellness resources">
      <div className="mx-auto flex w-full max-w-[340px] flex-col items-center text-center">
        <div className="flex h-16 w-full shrink-0 items-center justify-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B1A] text-[#F59E0B]">
            <SunIcon className="h-6 w-6" />
          </div>
        </div>

        <div className="flex min-h-8 w-full items-start justify-center pt-4">
          <h2 className="w-full max-w-[340px] text-[24px] font-extrabold leading-8 text-ink">
            A quick note, just for you
          </h2>
        </div>

        <div className="flex w-full flex-col items-start justify-center gap-3 px-4 pt-2">
          <p className="w-full text-center text-[12px] font-semibold leading-[14.4px] tracking-[0.24px] text-[#64748B] dark:text-[var(--text-secondary)]">
            If you&apos;re going through something heavy, talking helps. These
            resources are free and confidential.
          </p>
          <p className="w-full text-center text-[12px] font-semibold leading-[14.4px] tracking-[0.24px] text-[#64748B] dark:text-[var(--text-secondary)]">
            You&apos;re not alone.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 pt-8">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              onClose();
              router.push("/profile/help");
            }}
          >
            Open Wellness Resources
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="text-[14px] font-semibold text-muted transition-opacity hover:opacity-80"
          >
            Close
          </button>
        </div>
      </div>
    </WhiteModal>
  );
}
