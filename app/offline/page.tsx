import { Logo } from "@/components/ui/Logo";

// Static fallback shown by the service worker when a navigation request
// fails with no network. Must not depend on auth/session or dynamic data.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Logo size="compact" showTagline={false} />
      <p className="text-lg font-bold text-ink">You&apos;re offline</p>
      <p className="max-w-xs text-sm text-muted">
        Check your connection and try again. Anything you were working on will
        still be here.
      </p>
    </main>
  );
}
