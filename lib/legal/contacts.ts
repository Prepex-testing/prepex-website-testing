/**
 * Every contact and legal detail the policies, the contact page and the app show, in one place.
 * Prepex is not incorporated yet: it is run by Ishwar Birla as an individual. When it is registered, change the
 * operator line and the address here (and drop `addressNote`). The policies are pending lawyer review.
 */
export const LEGAL = {
  /** Who runs Prepex (the data fiduciary under the DPDP Act). */
  entityName: "Prepex, operated by Ishwar Birla",
  operator: "Ishwar Birla",
  /** No registered postal address yet. */
  address: "Madhya Pradesh, India",
  addressNote: "A full postal address will be published once Prepex is registered.",
  supportEmail: "support@prepex.io",
  securityEmail: "security@prepex.io",
  /** WhatsApp support, shown as written and linked through wa.me. */
  whatsAppSupport: "+91 75019 97123",
  whatsAppUrl: "https://wa.me/917501997123",
  /** Grievance Officer (DPDP Act / IT Rules). */
  grievanceOfficer: "Ishwar Birla",
  grievanceEmail: "grievance@prepex.io",
  responseHours: 72,
  effectiveDate: "16 November 2026",
  pendingLawyerReview: true,
} as const;

/** Where data lives (Privacy Policy, "Where it is stored"). */
export const HOSTING = {
  /** Hostinger VPS: the server's public address is registered to Hostinger in Mumbai, Maharashtra. */
  appServers: "Mumbai, India",
  /** The Backblaze B2 bucket's region (owner-confirmed 2026-11-16: us-east). Null leaves it out of the policy. */
  backupRegion: "US East" as string | null,
} as const;

/** The Prepex community group on WhatsApp. One constant: the contact page, the footer and Help all use it. */
export const COMMUNITY = {
  url: "https://chat.whatsapp.com/H5940Tm9yOs2oe9wXqtx2Y",
  label: "Join the Prepex community",
  note: "Opens WhatsApp. Other members can see your phone number.",
} as const;

/** Launch step 3: the old app keeps running at legacy.prepex.io with its own accounts and data. */
export const LEGACY = {
  url: "https://legacy.prepex.io",
  line: "Used Prepex before? Your old account is at",
  host: "legacy.prepex.io",
} as const;
