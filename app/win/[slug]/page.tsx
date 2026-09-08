import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CORE_API_BASE_URL } from "@/lib/api/config";
import type { SharedJournalCard } from "@/lib/api/journal";

/**
 * Public view for a shared Win Journal card (PRD 7.5.1 — "Copy Link").
 *
 * A server component on purpose: the link is pasted into WhatsApp and
 * Instagram, and those crawlers only read the HTML `<head>`. Rendering the
 * card client-side would unfurl as a blank page.
 *
 * Everything here comes from the share endpoint, which enforces the privacy
 * floor server-side (7.5.2) — no absolute mock score, no weak topics, no
 * partner data. This page cannot leak what it is never sent.
 */

type Props = { params: Promise<{ slug: string }> };

async function fetchCard(slug: string): Promise<SharedJournalCard | null> {
  try {
    const response = await fetch(
      `${CORE_API_BASE_URL}/api/weekly-journal/share/${encodeURIComponent(slug)}`,
      { headers: { "ngrok-skip-browser-warning": "true" }, next: { revalidate: 300 } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { data: SharedJournalCard };
    return body.data ?? null;
  } catch {
    return null;
  }
}

function absoluteImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  return /^https?:\/\//.test(imageUrl) ? imageUrl : `${CORE_API_BASE_URL}${imageUrl}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const card = await fetchCard(slug);

  if (!card) {
    return { title: "Win Journal · Prepex", robots: { index: false } };
  }

  const title = card.hero.title
    ? `${card.hero.title} — ${card.firstName}'s week on Prepex`
    : `${card.firstName}'s week in wins`;
  const description = card.hero.description ?? "A week of study, tracked on Prepex.";
  const image = absoluteImageUrl(card.imageUrl);

  return {
    title,
    description,
    // Not indexed: this is a link a student chose to send to specific people,
    // not public web content.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image, width: 1080, height: 1920, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SharedWinJournalPage({ params }: Props) {
  const { slug } = await params;
  const card = await fetchCard(slug);
  if (!card) notFound();

  const image = absoluteImageUrl(card.imageUrl);

  const highlights = [
    `${card.stats.streakCount} day streak`,
    `${card.stats.tasksCompleted} tasks completed`,
    `${card.stats.focusHoursLabel} focused study`,
    card.stats.chaptersMastered > 0 ? `${card.stats.chaptersMastered} topics mastered` : null,
    card.stats.mockDelta !== null ? `Mock score +${card.stats.mockDelta} marks` : null,
  ].filter((line): line is string => line !== null);

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-page px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-4xl font-extrabold leading-none tracking-tight text-ink">
          prepex<span className="text-cta">.</span>
        </p>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
          Plan &middot; Execute &middot; Survive &middot; Win
        </p>
      </div>

      <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
        {image ? (
          // A plain <img>: the PNG is served by the core service, which isn't
          // in next.config's image allowlist, and there is nothing to optimise
          // about an already-sized 1080x1920 card.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={card.hero.title ?? "Weekly Win Journal card"}
            width={1080}
            height={1920}
            className="w-full rounded-2xl border border-brand/10 shadow-[0px_4px_20px_0px_#00000014]"
          />
        ) : (
          <div className="w-full rounded-2xl border border-brand/10 bg-surface p-8 text-center">
            <h1 className="text-2xl font-extrabold text-ink">{card.hero.title}</h1>
            {card.hero.description && (
              <p className="mt-2 text-sm text-muted">{card.hero.description}</p>
            )}
            <ul className="mt-6 flex flex-col gap-2 text-sm text-ink">
              {highlights.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-bold text-ink">
            {card.firstName} had a week worth sharing.
          </p>
          <p className="max-w-sm text-sm text-muted">
            Prepex builds a card like this every Friday from the week you actually studied.
          </p>
          <Link
            href="/create-account"
            className="mt-1 rounded-lg bg-[#FF7A59] px-8 py-3 text-base font-bold text-white transition hover:brightness-110"
          >
            Start your own
          </Link>
        </div>
      </div>
    </main>
  );
}
