import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";

export default function WelcomeToPrepexPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-3 py-6 sm:px-6 sm:py-12">
      <div className="w-full max-w-xl rounded-3xl bg-surface p-5 text-center shadow-modal sm:p-10">
        <div className="flex flex-col items-center gap-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white">
            <CheckIcon />
          </span>

          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-semibold text-muted">
              Welcome to prepex, Rohan
            </p>
            <p className="text-xs text-muted">You&apos;re all set</p>
          </div>

          <h1 className="text-h1 text-ink">Your first plan is ready</h1>

          <p className="max-w-sm text-sm text-muted">
            We&apos;ve prepared a personalized plan to help you stay consistent
            and achieve your goals.
          </p>

          <Button href="/home" variant="primary">
            Go to Home Dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
