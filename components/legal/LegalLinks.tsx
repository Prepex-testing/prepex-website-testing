import Link from "next/link";
import { CommunityLink } from "@/components/legal/CommunityLink";

/**
 * Launch step 2 (A4): Privacy, Terms and Contact, on every page a student can reach before or outside the app (sign-in,
 * onboarding, settings, shared pages, the legal pages themselves).
 */
/** `community` adds "Join the Prepex community" (the legal pages and shared pages; not the sign-in or onboarding screens). */
export function LegalLinks({ className = "", community = false }: { className?: string; community?: boolean }) {
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
      {community && <CommunityLink placement="footer" className="basis-full sm:basis-auto" />}
    </nav>
  );
}
