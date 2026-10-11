import Link from "next/link";

/** A plain link tile on the Study hub, for the screens that have no live number to show. */
export function HubLink({ href, title, blurb, testId }: { href: string; title: string; blurb: string; testId: string }) {
  return (
    <Link href={href} data-testid={testId} className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-brand/10 bg-surface p-4 transition-colors hover:bg-tint-strong">
      <span className="min-w-0">
        <span className="block text-[16px] font-extrabold text-ink">{title}</span>
        <span className="mt-0.5 block text-[13px] text-muted">{blurb}</span>
      </span>
      <span aria-hidden className="shrink-0 text-[20px] font-bold text-muted">
        →
      </span>
    </Link>
  );
}
