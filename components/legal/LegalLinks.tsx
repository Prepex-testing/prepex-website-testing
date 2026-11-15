import Link from "next/link";

/**
 * Launch step 2 (A4): Privacy, Terms and Contact, on every page a student can reach before or outside the app (sign-in,
 * onboarding, settings, shared pages, the legal pages themselves).
 */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-muted ${className}`} data-testid="legal-links">
      <Link href="/privacy" className="underline">
        Privacy
      </Link>
      <Link href="/terms" className="underline">
        Terms
      </Link>
      <Link href="/contact" className="underline">
        Contact
      </Link>
    </nav>
  );
}
