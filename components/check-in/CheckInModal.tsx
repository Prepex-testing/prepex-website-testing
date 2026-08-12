"use client";

import { Modal } from "@/components/ui/Modal";
import { CheckInBody } from "@/components/check-in/CheckInBody";
import { MOODS, type Mood } from "@/components/check-in/moods";

export { MOODS };
export type { Mood };

type CheckInModalProps = {
  open: boolean;
  onClose: () => void;
  name: string;
  mode?: "onboarding" | "update";
  onSave?: (mood: Mood) => void;
  onContinue?: (mood: Mood | null) => void;
  onSkip?: () => void;
};

export function CheckInModal({
  open,
  onClose,
  name,
  mode = "update",
  onSave,
  onContinue,
  onSkip,
}: CheckInModalProps) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Daily check-in" size="lg">
      <CheckInBody
        name={name}
        mode={mode}
        onCancel={onClose}
        onSave={(mood) => {
          onSave?.(mood);
          onClose();
        }}
        onContinue={onContinue}
        onSkip={onSkip}
      />
    </Modal>
  );
}
