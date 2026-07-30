"use client";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/confetti";
import { CheckIcon } from "@/components/ui/icons";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";

type Bubble = {
  size: number;
  color: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  floatX: number;
  floatY: number;
  duration: "slow" | "medium" | "fast";
  delay: string;
};

const DURATION_CLASS: Record<Bubble["duration"], string> = {
  slow: "animate-float-slow",
  medium: "animate-float-medium",
  fast: "animate-float-fast",
};

const BUBBLES: Bubble[] = [
  { size: 16, color: "#f9a8d4", top: "9%", left: "21%", floatX: 6, floatY: -14, duration: "slow", delay: "0s" },
  { size: 11, color: "#818cf8", top: "14%", right: "17%", floatX: -8, floatY: 16, duration: "medium", delay: "0.6s" },
  { size: 18, color: "#c084fc", top: "40%", right: "6%", floatX: 5, floatY: -18, duration: "slow", delay: "1.2s" },
  { size: 10, color: "#60a5fa", bottom: "22%", left: "4%", floatX: 8, floatY: 12, duration: "fast", delay: "0.3s" },
  { size: 8, color: "#facc15", bottom: "12%", right: "28%", floatX: -6, floatY: -10, duration: "medium", delay: "1.5s" },
  { size: 13, color: "#f9a8d4", top: "58%", left: "9%", floatX: 10, floatY: 14, duration: "fast", delay: "0.9s" },
];

function FloatingBubbles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {BUBBLES.map((bubble, index) => (
        <span
          key={index}
          className={`absolute rounded-full ${DURATION_CLASS[bubble.duration]}`}
          style={
            {
              width: bubble.size,
              height: bubble.size,
              top: bubble.top,
              bottom: bubble.bottom,
              left: bubble.left,
              right: bubble.right,
              backgroundColor: bubble.color,
              opacity: 0.6,
              animationDelay: bubble.delay,
              "--float-x": `${bubble.floatX}px`,
              "--float-y": `${bubble.floatY}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function WelcomeToPrepexPage() {
  const name = useStoredFullName();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="relative w-full max-w-[1024px] overflow-hidden rounded-[24px] bg-[image:var(--oc-card-bg)] px-6 pt-12 pb-16 text-center shadow-modal sm:px-8 sm:pt-16 sm:pb-20 md:pt-[98px] md:pb-[138px]">
        <FloatingBubbles />
        <div className="relative flex flex-col items-center">
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-[5px] border-[var(--oc-icon-ring)] bg-[var(--oc-icon-bg)] text-[var(--oc-icon-color)] sm:h-20 sm:w-20">
            <CheckIcon className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>

          {/* Welcome */}
          <div className="mt-6 max-w-[457px]">
            <h2 className="whitespace-nowrap text-[28px] leading-[34px] font-extrabold tracking-[-0.9px] text-[var(--oc-heading1)] sm:text-[32px] sm:leading-[38px] md:text-[36px] md:leading-[40px]">
              Welcome to prepex{name ? `, ${name.trim().split(/\s+/)[0]}` : ""}
            </h2>

            <p className="mt-2 text-base leading-6 font-medium text-[var(--oc-subtext)] sm:text-lg sm:leading-7">
              You&apos;re all set
            </p>
          </div>

          {/* Heading */}
          <div className="mt-1 sm:mt-6">
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

        <Confetti
          className="pointer-events-none absolute inset-0 h-full w-full"
          options={{ particleCount: 150, spread: 90, origin: { y: 0.4 } }}
        />
      </div>
    </main>
  );
}