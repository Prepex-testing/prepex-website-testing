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
  onSave?: (mood: Mood) => void;
};

export function CheckInModal({ open, onClose, name, onSave }: CheckInModalProps) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Daily check-in" size="lg">
      <CheckInBody
        name={name}
        mode="update"
        onCancel={onClose}
        onSave={(mood) => {
          onSave?.(mood);
          onClose();
        }}
      />
    </Modal>
  );
}
