"use client";

import { WhiteModal } from "@/components/ui/WhiteModal";
import { Button } from "@/components/ui/Button";
import { InfoIcon2 } from "@/components/ui/icons";

type SecondDayInfoModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SecondDayInfoModal({ open, onClose }: SecondDayInfoModalProps) {
  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Why we ask this every morning">
      <div className="mx-auto flex w-full max-w-[340px] flex-col items-center text-center">
        <div className="flex h-16 w-full shrink-0 items-center justify-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B1A] text-[#F59E0B]">
            <InfoIcon2 size={24} />
          </div>
        </div>

        <div className="flex min-h-8 w-full items-start justify-center pt-4">
          <h2 className="w-full max-w-[340px] text-[24px] font-extrabold leading-8 text-ink">
            Why we ask this every morning?
          </h2>
        </div>

        <div className="flex w-full flex-col items-start justify-center gap-3 px-4 pt-2">
          <p className="w-full text-center text-[12px] font-semibold leading-[14.4px] tracking-[0.24px] text-[#64748B] dark:text-[var(--text-secondary)]">
            How you feel changes how you should study. Drained day → lighter plan, no pressure.
            Strong day → push harder, you can handle it.
          </p>
          <p className="w-full text-center text-[12px] font-semibold leading-[14.4px] tracking-[0.24px] text-[#64748B] dark:text-[var(--text-secondary)]">
            We never share this with anyone.
            <br />
            It just helps us help you.
          </p>
        </div>

        <div className="flex w-full shrink-0 items-start pt-8">
          <Button variant="primary" className="w-full" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </WhiteModal>
  );
}
