import Link from "next/link";
import { ArrowLeftIcon, BellIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

type ProfileSubpageHeaderProps = {
  title: string;
  backHref?: string;
};

export function ProfileSubpageHeader({ title, backHref = "/profile" }: ProfileSubpageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link href={backHref} aria-label="Back" className="shrink-0 text-ink">
          <ArrowLeftIcon />
        </Link>
        <h1 className="truncate text-h1 text-ink">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <ThemeToggle />
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <BellIcon />
        </button>
        <UserMenu />
      </div>
    </div>
  );
}
