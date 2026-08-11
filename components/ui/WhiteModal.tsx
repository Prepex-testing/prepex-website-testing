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
 * Same behavior as `Modal`, but the panel carries its own pinned copy of the
 * theme tokens (light values by default, dark values under [data-theme="dark"])
 * instead of inheriting whatever `<html>` currently has — so it stays visually
 * consistent (flat white in light mode, dark surface in dark mode) regardless
 * of any ancestor override. `CheckInModal` and `GoalSettingModal` are
 * intentionally excluded and keep using `Modal`.
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
        className={`white-modal-panel white-modal-scroll-panel w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-2xl bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-modal sm:w-full sm:rounded-3xl sm:p-8 sm:pb-10 ${SIZE_CLASSES[size]}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>

      {/*
        The panel carries its own copy of both the light and dark token
        sets (mirroring app/globals.css) so it renders consistently even if
        an ancestor's variables ever drift, and switches to the dark surface
        color under [data-theme="dark"] instead of staying pinned to white.
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

        [data-theme="dark"] .white-modal-panel {
          --background: #0D0D2B;
          --surface: #111145;
          --ink: #faf7f2;
          --brand: #6d6dc4;
          --body-text: #e4e5f1;
          --muted: #8b8998;
          --muteds: #8B8998;
          --cta: #FF7A59;
          --tint: #23234f;
          --tint-strong: #2b2b63;
          --warning: #f2b84d;
          --warning-bg: rgb(242 184 77 / 0.15);
          --success: #4ade80;
          --success-bg: rgb(74 222 128 / 0.12);
          --danger: #f87171;
          --danger-bg: rgb(248 113 113 / 0.12);
          --info: #d8b4fe;
          --info-bg: rgb(216 180 254 / 0.15);
          --chart-1: #aeb0f0;
          --chart-2: #a5b4fc;
          --chart-3: #7dd3fc;
          --chart-recovery: #fdba74;
          --focus-ring: rgb(255 138 107 / 0.6);

          --subject-bg: #1a1a4e;
          --subject-text: #faf7f2;
          --icon-chip-bg: #ffffff;
          --plan-avatar-bg: #1a1a4e;

          --subject-physics: #FAF7F2;
          --subject-chemistry: #4C1D95;
          --subject-maths: #8B8998;

          --shadow-hover: 0 2px 8px rgb(0 0 0 / 0.35);
          --shadow-modal: 0 8px 24px rgb(0 0 0 / 0.5);

          --question-dot-active: #FAF7F2;
          --question-dot-inactive: rgba(250, 247, 242, 0.25);

          --toggle-on: #ffffff;
          --score-ring-from: #ffffff;
          --score-ring-to: #ffffff;

          --sub: #242453;
          --button-border: #FAF7F2;

          --icon-action-bg: #242453;
          --icon-action-text: var(--border-card, #FAF7F214);
          --border-card: #faf7f2;

          --oc-card-bg: conic-gradient(from 90deg at 100% 0%,
              #111145 -181.73deg,
              #0d0d2b 102.12deg,
              #111145 178.27deg,
              #0d0d2b 462.12deg);

          --oc-icon-bg: var(--ink);
          --oc-icon-ring: #1a1a4e;
          --oc-icon-color: #1a1a4e;

          --oc-heading1: #faf7f2;
          --oc-subtext: #d6d6d6;
          --oc-heading2: #ffffff;
          --oc-body: #ffffff;

          --oc-button-bg: #ff7a59;
          --oc-button-text: #ffffff;

          --accordion-open-bg: #13133D;
          --accordion-row-bg: #FAF7F240;

          --chapter-box-bg: #13133D;
          --chapter-box-border: rgb(250 247 242 / 0.06);
          --processing-text: #FAF7F2;

          --badge-partial-bg: #FAF7F240;

          --mood-card-bg: #2A2A6E;
          --mood-chip-bg: #232C6B;
          --modal-bg: #111145;

          --logo-tagline: #F0EDE5;

          --preview-card-bg: #13133D;
          --preview-card-border: #242453;

          --input-border: #8B8998;
          --input-shadow: 0px 1px 2px 0px #1A1A4E0F;

          --primary-button-border: #8B8998;

          --weekly-title: #FAF7F2;
          --weekly-label: #FAF7F2;

          --loader-dot: #FFFFFF;

          --stats-card-bg: #13133D;
          --stats-card-border: #242453;

          --task-card-border: #242453;

          --secondary-button-border: #8B8998;
          --outline-chip-border: #D6D6D6;

          --sidebar-active-bg: #FAF7F2;
          --sidebar-active-fg: #1A1A4E;
          --sidebar-inactive-fg: #8B8998;
          --sidebar-border: rgb(225 227 228 / 0.3);

          --bg-card: var(--surface);
          --text-primary: var(--ink);
          --text-secondary: var(--muted);

          --quick-access-border: #242453;
          --quick-access-shadow: 0px 2px 6px 0px rgb(255 255 255 / 0.04);

          --consistency-partial: #8282F9;
          --consistency-missed: #A8A8A8;

          --task-type-border: #8b8998;
          --task-type-bg: #1a1a4e;
          --task-type-text: #faf7f2;
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
