"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

type WhiteModalProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
};

const SIZE_CLASSES: Record<NonNullable<WhiteModalProps["size"]>, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

/**
 * Same behavior as `Modal`, but the panel always renders on a flat white
 * (#ffffff) surface with light-theme tokens — regardless of the app's
 * current dark/light setting. `CheckInModal` and `GoalSettingModal` are
 * intentionally excluded and keep using `Modal` (theme-aware background).
 */
export function WhiteModal({ open, onClose, ariaLabel, children, size = "md" }: WhiteModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-6"
      onClick={onClose}
    >
      <div
        className={`white-modal-panel white-modal-scroll-panel w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-modal sm:w-full sm:rounded-3xl sm:p-8 sm:pb-10 ${SIZE_CLASSES[size]}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>

      {/*
        The panel is pinned to the light theme's token values so it always
        renders as a flat white surface, even when the app is in dark mode —
        [data-theme="dark"] on <html> would otherwise cascade its variable
        overrides down into the panel via normal CSS inheritance.
      */}
      <style>{`
        .white-modal-panel {
          --background: #faf7f2;
          --surface: #ffffff;
          --ink: #1a1a4e;
          --brand: #1a1a4e;
          --body-text: #333333;
          --muted: #94A3B8;
          --muteds: #333333;
          --cta: #FF7A59;
          --tint: #eff2fe;
          --tint-strong: #eef0f8;
          --warning: #d68910;
          --warning-bg: rgb(214 137 16 / 0.1);
          --success: #16a34a;
          --success-bg: #f0fdf4;
          --danger: #dc2626;
          --danger-bg: #fef2f2;
          --info: #7e22ce;
          --info-bg: #f3e8ff;
          --chart-1: #1a1a4e;
          --chart-2: #818cf8;
          --chart-3: #93c5fd;
          --chart-recovery: #fdba74;
          --focus-ring: rgb(255 122 89 / 0.5);

          --subject-bg: #eef0f8;
          --subject-text: #1a1a4e;
          --icon-chip-bg: #eef0f8;
          --plan-avatar-bg: #eef2ff;

          --subject-physics: #2D2E6E;
          --subject-chemistry: #818CF8;
          --subject-maths: #C7D2FE;

          --shadow-hover: 0 2px 8px rgb(26 26 78 / 0.08);
          --shadow-modal: 0 8px 24px rgb(26 26 78 / 0.12);

          --question-dot-active: #1E1B4B;
          --question-dot-inactive: #D1D5DB;

          --toggle-on: var(--brand);
          --score-ring-from: #1a1a4e;
          --score-ring-to: #4c1d95;

          --sub: #A0A0B0;
          --button-border: #333333;

          --icon-action-bg: #ffffff;
          --icon-action-text: #171658;
          --border-card: #1a1a4e;

          --oc-card-bg: conic-gradient(from 90deg at 100% 0%,
              #e0e7ff -100.4deg,
              #ffffff 252deg,
              #e0e7ff 259.6deg,
              #ffffff 612deg);

          --oc-icon-bg: var(--ink);
          --oc-icon-ring: #ffffff;
          --oc-icon-color: #ffffff;

          --oc-heading1: #0f172a;
          --oc-subtext: #475569;
          --oc-heading2: #110c4a;
          --oc-body: #64748b;

          --oc-button-bg: #ff7a59;
          --oc-button-text: #ffffff;

          --accordion-open-bg: #EFF2FE;
          --accordion-row-bg: #FFFFFF;

          --chapter-box-bg: #FFFFFF;
          --chapter-box-border: rgb(26 26 78 / 0.10);
          --processing-text: #4C1D95;

          --badge-partial-bg: #eef0f8;

          --mood-card-bg: #FAF7F2;
          --mood-chip-bg: #E7EEFF;
          --modal-bg: #FAF7F2;

          --logo-tagline: #333333;

          --preview-card-bg: linear-gradient(122.03deg, #EEF0F8 0%, #FFFFFF 100%);
          --preview-card-border: #EEF0F8;

          --input-border: #E5E7EB;
          --input-shadow: 0px 1px 2px 0px #1A1A4E0F;

          --primary-button-border: #D6D6D6;

          --weekly-title: #2D2E6E;
          --weekly-label: #6B7280;

          --loader-dot: #FF7F5C;

          --stats-card-bg: linear-gradient(122.03deg, #EEF0F8 0%, #FFFFFF 100%);
          --stats-card-border: rgba(26, 26, 78, 0.12);

          --task-card-border: #F3F4F6;

          --secondary-button-border: #D6D6D6;
          --outline-chip-border: #D6D6D6;

          --sidebar-active-bg: #EEF0F8;
          --sidebar-active-fg: #1A1A4E;
          --sidebar-inactive-fg: #7E7E85;
          --sidebar-border: rgb(225 227 228 / 0.3);

          --bg-card: var(--surface);
          --text-primary: var(--body-text);
          --text-secondary: #E1E3E499;

          --quick-access-border: transparent;
          --quick-access-shadow: 0px 2px 8px 0px rgb(26 26 78 / 0.08);

          --consistency-partial: var(--tint);
          --consistency-missed: var(--tint-strong);

          --task-type-border: rgb(116 116 128 / 0.08);
          --task-type-bg: #1a1a4e;
          --task-type-text: #333333;
          --task-type-selected-text: #faf7f2;
          --task-type-shadow: 0px 2px 8px 0px rgb(26 26 78 / 0.08);
        }

        .white-modal-scroll-panel {
          scrollbar-gutter: stable both-edges;
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 500ms ease;
        }
        .white-modal-scroll-panel:hover,
        .white-modal-scroll-panel:focus-within {
          scrollbar-color: color-mix(in srgb, var(--muted) 55%, transparent) transparent;
        }
        .white-modal-scroll-panel::-webkit-scrollbar {
          width: 6px;
        }
        .white-modal-scroll-panel::-webkit-scrollbar-track {
          background: transparent;
        }
        .white-modal-scroll-panel::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 9999px;
          transition: background-color 500ms ease;
        }
        .white-modal-scroll-panel:hover::-webkit-scrollbar-thumb,
        .white-modal-scroll-panel:focus-within::-webkit-scrollbar-thumb {
          background-color: color-mix(in srgb, var(--muted) 55%, transparent);
        }
      `}</style>
    </div>
  );
}
