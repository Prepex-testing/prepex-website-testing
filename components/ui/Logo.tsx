import { HorizontalMark, StackedMark } from "@/components/ui/LogoMarks";

type LogoLayout = "responsive" | "horizontal" | "stacked";

type LogoProps = {
  size?: "hero" | "compact";
  showTagline?: boolean;
  /**
   * "responsive" (default) stacks the symbol over the wordmark on narrow
   * screens and sets them side by side from `sm` up. Surfaces that only ever
   * render at one width (the desktop sidebar) pin a layout instead.
   */
  layout?: LogoLayout;
};

// Heights only — each mark's width follows from its viewBox.
const SIZES = {
  hero: {
    wrapper: "gap-3.5",
    horizontal: "h-16 sm:h-20",
    stacked: "h-28",
  },
  compact: {
    wrapper: "gap-2",
    horizontal: "h-9",
    stacked: "h-20",
  },
} as const;

function BrandLogo({
  size = "hero",
  showTagline = true,
  layout = "responsive",
  taglineClass,
}: LogoProps & { taglineClass: string }) {
  const classes = SIZES[size];

  return (
    <div className={`flex flex-col items-center ${classes.wrapper}`}>
      <span className="flex text-ink">
        {layout !== "horizontal" && (
          <StackedMark
            className={`${classes.stacked} w-auto ${layout === "responsive" ? "sm:hidden" : ""}`}
          />
        )}
        {layout !== "stacked" && (
          <HorizontalMark
            className={`${classes.horizontal} w-auto ${layout === "responsive" ? "hidden sm:block" : ""}`}
          />
        )}
      </span>
      {showTagline && (
        <p className={`mt-2 text-[13px] font-bold uppercase tracking-[0.2em] sm:text-base ${taglineClass}`}>
          PLAN&middot;EXECUTE&middot;SURVIVE&middot;WIN
        </p>
      )}
    </div>
  );
}

export function Logo(props: LogoProps) {
  return <BrandLogo {...props} taglineClass="text-logo-tagline" />;
}

export function Logo1(props: LogoProps) {
  return <BrandLogo {...props} taglineClass="text-cta" />;
}

export function Logo2(props: LogoProps) {
  return <BrandLogo {...props} taglineClass="text-[#8B8998]" />;
}
