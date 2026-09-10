import Link from "next/link";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { NotificationBell } from "@/components/notifications/NotificationBell";
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
        <NotificationBell className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong" />
        <UserMenu />
      </div>
    </div>
  );
}
