import { useId } from "react";
import { CameraIcon } from "@/components/ui/icons";
import { AvatarFace } from "@/components/ui/AvatarFace";

type AvatarProgressRingProps = {
  percent: number;
  initials: string;
  /** Profile photo; the initials show when absent. */
  imageUrl?: string | null;
  onCameraClick?: () => void;
  cameraLabel?: string;
};

const CAMERA_BADGE =
  "absolute bottom-0 right-0 flex h-7.5 w-7.5 items-center justify-center rounded-full border border-[#F3F4F6] bg-white p-1.5 text-[#1A1A4E] dark:border-(--text-primary,#FAF7F2) dark:bg-(--bg-card,#111145) dark:text-(--text-primary,#FAF7F2)";

export function AvatarProgressRing({
  percent,
  initials,
  imageUrl = null,
  onCameraClick,
  cameraLabel = "Change profile photo",
}: AvatarProgressRingProps) {
  const size = 93;
  const strokeWidth = 5;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const gradientId = useId();

  return (
    <div className="relative flex h-27.25 w-23.25 items-center justify-center">
      <div className="relative h-23.25 w-23.25">
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent / 100)}
          />

          {/* Light mode: navy → violet gradient. Dark mode: both stops turn
              cream, so the ring reads as a solid --text-primary stroke. */}
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" className="[stop-color:#1A1A4E] dark:[stop-color:var(--text-primary,#FAF7F2)]" />
              <stop offset="100%" className="[stop-color:#4C1D95] dark:[stop-color:var(--text-primary,#FAF7F2)]" />
            </linearGradient>
          </defs>
        </svg>

        <AvatarFace
          src={imageUrl}
          fallback={initials}
          className="absolute inset-0 m-auto flex h-18 w-18 items-center justify-center rounded-full text-center align-middle font-(family-name:--font-inter) text-[36px] font-bold leading-10 tracking-normal text-ink"
        />

        {onCameraClick ? (
          <button
            type="button"
            onClick={onCameraClick}
            aria-label={cameraLabel}
            className={`${CAMERA_BADGE} transition-opacity hover:opacity-90`}
          >
            <CameraIcon />
          </button>
        ) : (
          <span aria-hidden="true" className={CAMERA_BADGE}>
            <CameraIcon />
          </span>
        )}
      </div>
    </div>
  );
}
