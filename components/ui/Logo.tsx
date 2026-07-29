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
        <p className="mt-2 text-[13px] font-bold uppercase tracking-[0.2em] text-logo-tagline sm:text-base">
          PLAN&middot;EXECUTE&middot;SURVIVE&middot;WIN
        </p>
      )}
    </div>
  );
}

export function Logo1({ size = "hero", showTagline = true }: LogoProps) {
  const classes = SIZES[size];

  return (
    <div className={`flex flex-col items-center ${classes.wrapper}`}>
      <p
        className={`${classes.wordmark} font-extrabold leading-none tracking-tight text-ink`}
      >
        prepex<span className="text-cta">.</span>
      </p>
      {showTagline && (
        <p className="mt-2 text-[13px] font-bold uppercase tracking-[0.2em] text-cta dark:text-logo-tagline sm:text-base">
          PLAN&middot;EXECUTE&middot;SURVIVE&middot;WIN
        </p>
      )}
    </div>
  );
}
