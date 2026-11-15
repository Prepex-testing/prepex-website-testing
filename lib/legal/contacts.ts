/**
 * Launch step 2 (A1, A4): every contact and legal detail the policies and the contact page show, in one place.
 * Values marked OWNER are placeholders only the owner can supply; each one is listed in docs/launch-step2.md and must be
 * filled before launch. The policies are pending lawyer review.
 */
export const LEGAL = {
  /** OWNER: the registered legal entity that runs Prepex. */
  entityName: "[OWNER: registered company or proprietor name]",
  /** OWNER: registered address. */
  address: "[OWNER: registered address]",
  supportEmail: "support@prepex.io",
  securityEmail: "security@prepex.io",
  /** OWNER: WhatsApp support number (wa.me link). Empty hides the WhatsApp line. */
  whatsAppSupport: "",
  /** OWNER: Grievance Officer's name (DPDP Act / IT Rules). */
  grievanceOfficer: "[OWNER: Grievance Officer name]",
  grievanceEmail: "grievance@prepex.io",
  responseHours: 72,
  effectiveDate: "15 November 2026",
  pendingLawyerReview: true,
} as const;
