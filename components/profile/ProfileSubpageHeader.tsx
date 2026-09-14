import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { ArrowLeftIcon } from "@/assets/icons";

type ProfileSubpageHeaderProps = {
  title: string;
  backHref?: string;
};

/**
 * Phones: back arrow and actions share the top row, the title gets its own
 * full-width row below — the actions alone are ~220px, which would leave a
 * long title like "Parent connection settings" ~100px beside them.
 * sm and up: one row — back, title (truncates if it must), actions.
 */
export function ProfileSubpageHeader({ title, backHref = "/profile" }: ProfileSubpageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Link href={backHref} aria-label="Back" className="order-1 flex h-11 shrink-0 items-center text-ink">
        <ArrowLeftIcon />
      </Link>

      <h1 className="order-3 min-w-0 basis-full break-words text-[22px] font-extrabold leading-tight text-ink sm:order-2 sm:flex-1 sm:basis-auto sm:truncate lg:text-h1 lg:leading-normal">
        {title}
      </h1>

      <div className="order-2 ml-auto flex shrink-0 items-center gap-2 sm:order-3 sm:gap-4">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </div>
  );
}
