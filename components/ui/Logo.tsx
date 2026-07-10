type LogoProps = {
  size?: "hero" | "compact";
  showTagline?: boolean;
};

const SIZES = {
  hero: {
    wrapper: "gap-3.5",
    wordmark: "text-6xl sm:text-8xl",
    tagline: "text-base sm:text-lg",
  },
  compact: {
    wrapper: "gap-2",
    wordmark: "text-4xl",
    tagline: "text-xs",
  },
} as const;

export function Logo({ size = "hero", showTagline = true }: LogoProps) {
  const classes = SIZES[size];

  return (
    <div className={`flex flex-col items-center ${classes.wrapper}`}>
      <p
        className={`${classes.wordmark} font-extrabold leading-none tracking-tight text-ink`}
      >
        prepex<span className="text-cta">.</span>
      </p>
      {showTagline && (
        <p
          className={`${classes.tagline} font-bold uppercase tracking-[0.3em] text-cta`}
        >
          Plan·Execute·Survive·Win
        </p>
      )}
    </div>
  );
}
