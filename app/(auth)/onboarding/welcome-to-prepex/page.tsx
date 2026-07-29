"use client";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
export default function WelcomeToPrepexPage() {
   const name = useStoredFullName();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-[1024px] rounded-[24px] bg-[image:var(--oc-card-bg)] px-6 pt-12 pb-16 text-center shadow-modal sm:px-8 sm:pt-16 sm:pb-20 md:pt-[98px] md:pb-[138px]">
        <div className="flex flex-col items-center">
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-[5px] border-[var(--oc-icon-ring)] bg-[var(--oc-icon-bg)] text-[var(--oc-icon-color)] sm:h-20 sm:w-20">
            <CheckIcon className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>

          {/* Welcome */}
          <div className="mt-6 max-w-[457px]">
            <h2 className="text-[28px] leading-[34px] font-extrabold tracking-[-0.9px] text-[var(--oc-heading1)] sm:text-[32px] sm:leading-[38px] md:text-[36px] md:leading-[40px]">
               Welcome to Prepex{name ? `, ${name.trim().split(/\s+/)[0]}` : ""}
            </h2>

            <p className="mt-2 text-base leading-6 font-medium text-[var(--oc-subtext)] sm:text-lg sm:leading-7">
              You&apos;re all set
            </p>
          </div>

          {/* Heading */}
          <div className="mt-2 sm:mt-8">
            <h1 className="text-[32px] leading-[38px] font-black text-[var(--oc-heading2)] sm:text-4xl sm:leading-tight md:text-5xl md:leading-[60px]">
              Your first plan is ready
            </h1>

            <p className="mx-auto mt-3 max-w-[672px] pb-3 text-base leading-[26px] font-normal text-[var(--oc-body)] sm:mt-4">
              We&apos;ve prepared a personalized plan to help you stay
              consistent <br />and achieve your goals.
            </p>
          </div>

          {/* Button */}
          <Button
            href="/home"
            variant="primary"
            className="mt-8 h-[60px] w-full max-w-[284px] rounded-full! bg-[var(--oc-button-bg)]! px-6 sm:px-8 text-base sm:text-lg! font-bold! text-[var(--oc-button-text)]! whitespace-nowrap"
          >
            Go to Home Dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}