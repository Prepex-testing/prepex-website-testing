"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { XIcon, PencilIcon } from "@/components/ui/icons";

type EditProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export function EditProfileModal({ open, onClose }: EditProfileModalProps) {
  const [fullName, setFullName] = useState("Rohan Sharma");
  const [city, setCity] = useState("New Delhi");

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Edit Profile">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Profile Photo</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="relative">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
            R
          </span>
          <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-surface text-ink">
            <PencilIcon />
          </span>
        </div>
        <p className="text-xs text-muted">JPG, PNG or WEBP. Max size 2MB.</p>
        <Button variant="secondary" size="sm">
          Change Photo
        </Button>
      </div>

      <div className="mt-6 border-t border-brand/10 pt-4">
        <p className="text-sm font-bold text-ink">Personal Information</p>

        <div className="mt-4 flex flex-col gap-4">
          <Input
            label="Full Name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <Select
            label="Class"
            options={[
              { value: "11", label: "Class 11" },
              { value: "12", label: "Class 12" },
            ]}
            defaultValue="12"
          />
          <Select
            label="Target Exam"
            options={[
              { value: "jee-main", label: "JEE Main" },
              { value: "jee-advanced", label: "JEE Main + Advanced" },
            ]}
            defaultValue="jee-main"
          />
          <Select
            label="Target Year"
            options={[
              { value: "2026", label: "2026" },
              { value: "2027", label: "2027" },
            ]}
            defaultValue="2026"
          />
          <Input label="City" value={city} onChange={(event) => setCity(event.target.value)} />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" className="flex-1" onClick={onClose}>
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}
