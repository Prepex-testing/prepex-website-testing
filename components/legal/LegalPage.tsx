import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export type LegalSection = { heading: string; body: (string | string[])[] };

/** A plain, readable legal page (Privacy Policy, Terms). Public: no sign-in needed. */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-10 sm:py-14" data-testid="legal-page">
      <Link href="/" aria-label="Prepex home" className="w-fit">
        <Logo />
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold leading-tight text-ink sm:text-[34px]">{title}</h1>
        <p className="text-[14px] text-muted">Last updated: {updated}</p>
        <p className="text-[16px] leading-relaxed text-body-text dark:text-ink">{intro}</p>
      </header>
      {sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-2">
          <h2 className="text-[19px] font-bold text-ink">{s.heading}</h2>
          {s.body.map((part, i) =>
            Array.isArray(part) ? (
              <ul key={i} className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-body-text dark:text-ink">
                {part.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={i} className="text-[15px] leading-relaxed text-body-text dark:text-ink">
                {part}
              </p>
            ),
          )}
        </section>
      ))}
      <footer className="flex flex-wrap gap-4 border-t border-border-subtle pt-5 text-[14px] text-muted">
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        <Link href="/terms" className="underline">
          Terms of Service
        </Link>
        <a href="mailto:hello@prepex.io" className="underline">
          hello@prepex.io
        </a>
      </footer>
    </main>
  );
}
