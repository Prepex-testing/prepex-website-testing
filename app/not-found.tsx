import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

// Launch step 1 (A2): a clean 404 for any unknown address. Static: no session, no data.
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Logo size="compact" showTagline={false} />
      <h1 className="text-lg font-bold text-ink">This page doesn&apos;t exist</h1>
      <p className="max-w-xs text-sm text-muted">The link may be old or mistyped. Your study data is safe.</p>
      <Link href="/" className="inline-flex min-h-12 items-center rounded-xl border border-ink/15 px-5 text-sm font-semibold text-ink">
        Go to Prepex
      </Link>
    </main>
  );
}
