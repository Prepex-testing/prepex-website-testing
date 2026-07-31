import { useId } from "react";
import { CameraIcon } from "@/components/ui/icons";

type AvatarProgressRingProps = {
  percent: number;
  initials: string;
  onCameraClick?: () => void;
  cameraLabel?: string;
};

export function AvatarProgressRing({
  percent,
  initials,
  onCameraClick,
  cameraLabel = "Change profile photo",
}: AvatarProgressRingProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const gradientId = useId();

  return (
    <div className="relative flex h-[109px] w-[93px] items-center justify-center">
      {/* Tight box matching the ring's true 88x88 bounds, so the badge
          below anchors to the circle itself instead of the wrapper
          (which is intentionally larger, for layout spacing). */}
      <div className="relative h-22 w-22">
        <svg viewBox="0 0 88 88" className="absolute inset-0 h-full w-full -rotate-90">
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="var(--color-tint)"
            strokeWidth="5"
          />

          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent / 100)}
          />

          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1A1A4E" />
              <stop offset="100%" stopColor="#4C1D95" />
            </linearGradient>
          </defs>
        </svg>

        <span className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
          {initials}
        </span>

        {onCameraClick ? (
          <button
            type="button"
            onClick={onCameraClick}
            aria-label={cameraLabel}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-ink text-surface transition-opacity hover:opacity-90"
          >
            <CameraIcon />
          </button>
        ) : (
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-ink text-surface"
          >
            <CameraIcon />
          </span>
        )}
      </div>
    </div>
  );
}
