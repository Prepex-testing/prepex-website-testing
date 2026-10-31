"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ProfileAvatar, YearHeatmap } from "@/components/social/social";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { CountUp } from "@/components/study/CountUp";
import { GhostButton } from "@/components/ui/GhostButton";
import { CoralButton } from "@/components/ui/CoralButton";
import { PageLoader } from "@/components/ui/PageLoader";
import { Sheet } from "@/components/planner/Sheet";
import { ApiError } from "@/lib/api/http";
import { blockStudent, followStudent, getProfile, REPORT_REASONS, reportStudent, sendKudos, unblockStudent, unfollowStudent, type PublicProfile } from "@/lib/api/social";

const todayIst = () => new Date(Date.now() + 19_800_000).toISOString().slice(0, 10);

/** One public profile, by @username or id. Only what the student allows: accuracy and mock scores are hidden unless switched on. */
export default function PublicProfilePage() {
  const { ref } = useParams<{ ref: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  const load = useCallback(() => {
    void getProfile(decodeURIComponent(ref))
      .then(setProfile)
      .catch(() => setMissing(true));
  }, [ref]);
  useEffect(() => {
    load();
  }, [load]);

  async function run(work: () => Promise<unknown>, done: string) {
    setBusy(true);
    setNote(null);
    try {
      await work();
      setNote(done);
      load();
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : "That didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (missing) {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-4 sm:p-6">
        <ProfileSubpageHeader title="Profile" backHref="/home/leaderboard" />
        <p className="rounded-2xl border border-border-subtle bg-surface-elevated p-4 text-[14px] text-muted" data-testid="profile-missing">
          We couldn&apos;t find that student.
        </p>
      </div>
    );
  }
  if (!profile) return <PageLoader label="Loading profile…" />;

  const p = profile;
  const sub = [p.classLabel ? (p.classLabel === "dropper" ? "Dropper" : `Class ${p.classLabel}`) : null, p.exam ? `${p.exam}${p.examYear ? ` ${p.examYear}` : ""}` : null, p.coaching, p.city].filter(Boolean).join(" · ");
  const split = p.subjectSplit.reduce((s, x) => s + x.minutes, 0);

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5 p-4 sm:p-6" data-testid="public-profile">
      <ProfileSubpageHeader title={p.isSelf ? "Your profile" : "Profile"} backHref="/home/leaderboard" />

      <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-elevated p-5">
        <div className="flex items-center gap-4">
          <ProfileAvatar who={p} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[24px] font-extrabold text-ink" data-testid="profile-name">{p.name}</h1>
            {p.username && <p className="text-[14px] text-muted" data-testid="profile-username">@{p.username}</p>}
            {sub && <p className="text-[13px] text-muted">{sub}</p>}
          </div>
          {!p.isSelf && !p.blockedByMe && (
            <div className="shrink-0">
              {p.isFollowing ? (
                <GhostButton data-testid="unfollow" disabled={busy} onClick={() => void run(() => unfollowStudent(p.userId), "Unfollowed")}>
                  Following
                </GhostButton>
              ) : (
                <CoralButton data-testid="follow" disabled={busy} onClick={() => void run(() => followStudent(p.userId), "Following")}>
                  Follow
                </CoralButton>
              )}
            </div>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { id: "level", label: p.title, value: `Level ${p.level}` },
            { id: "xp", label: "Total XP", value: <CountUp value={p.totalXp} format={(n) => n.toLocaleString("en-IN")} /> },
            { id: "streak", label: `Best ${p.streak.longest} days`, value: `${p.streak.current} day streak` },
            { id: "followers", label: `${p.following} following`, value: `${p.followers} ${p.followers === 1 ? "follower" : "followers"}` },
          ].map((t) => (
            <div key={t.id} className="rounded-xl border border-border-subtle bg-surface px-3 py-2" data-testid={`stat-${t.id}`}>
              <dd className="text-[18px] font-extrabold text-ink">{t.value}</dd>
              <dt className="text-[12px] text-muted">{t.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-5">
        <h2 className="text-[16px] font-extrabold text-ink">Study heatmap</h2>
        <YearHeatmap days={p.heatmap} />
        {!p.isSelf && p.isFollowing && p.heatmap.some((d) => d.date === todayIst() && d.minutes > 0) && (
          <GhostButton data-testid="kudos-day" disabled={busy} onClick={() => void run(() => sendKudos(p.userId, "day", todayIst()), "Flame sent")} className="self-start">
            {"🔥 Send a flame for today"}
          </GhostButton>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="profile-totals">
        {[
          { id: "hours", label: "Hours studied", value: `${p.allTimeHours}h` },
          { id: "questions", label: "Questions solved", value: p.questions.toLocaleString("en-IN") },
          { id: "chapters", label: "Chapters completed", value: String(p.chaptersCompleted) },
          ...(p.accuracy !== undefined && p.accuracy !== null ? [{ id: "accuracy", label: "Accuracy", value: `${p.accuracy}%` }] : []),
          ...(p.latestMockPercent !== undefined && p.latestMockPercent !== null ? [{ id: "mock", label: "Latest mock", value: `${p.latestMockPercent}%` }] : []),
        ].map((t) => (
          <div key={t.id} className="rounded-2xl border border-border-subtle bg-surface-elevated p-4" data-testid={`total-${t.id}`}>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t.label}</p>
            <p className="mt-1 text-[22px] font-extrabold text-ink">{t.value}</p>
          </div>
        ))}
      </section>

      {split > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-elevated p-5" data-testid="subject-split">
          <h2 className="text-[16px] font-extrabold text-ink">Where the time goes</h2>
          <div className="flex h-3 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.08]" role="img" aria-label="Study time by subject">
            {p.subjectSplit.map((s, i) => (
              <span key={s.subjectId} style={{ width: `${(s.minutes / split) * 100}%`, opacity: 1 - i * 0.2 }} className="bg-[#3B6BFF]" />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-body-text dark:text-ink">
            {p.subjectSplit.map((s) => (
              <li key={s.subjectId}>
                {s.name ?? "Subject"} {Math.round((s.minutes / split) * 100)}%
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.badges.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-elevated p-5" data-testid="profile-badges">
          <h2 className="text-[16px] font-extrabold text-ink">Badges</h2>
          <ul className="flex flex-wrap gap-2">
            {p.badges.map((b) => (
              <li key={b.key} className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink">
                {b.title.replace(/_/g, " ")}
                {!p.isSelf && p.isFollowing && (
                  <button type="button" aria-label={`Send a flame for ${b.title}`} disabled={busy} onClick={() => void run(() => sendKudos(p.userId, "badge", b.key), "Flame sent")}>
                    <span aria-hidden>🔥</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {note && (
        <p role="status" className="text-[13px] text-muted" data-testid="profile-note">
          {note}
        </p>
      )}

      {!p.isSelf && (
        <div className="flex gap-2">
          <GhostButton data-testid="block" disabled={busy} onClick={() => void run(() => (p.blockedByMe ? unblockStudent(p.userId) : blockStudent(p.userId)), p.blockedByMe ? "Unblocked" : "Blocked")}>
            {p.blockedByMe ? "Unblock" : "Block"}
          </GhostButton>
          <GhostButton data-testid="report" disabled={busy} onClick={() => setReporting(true)}>
            Report
          </GhostButton>
        </div>
      )}

      <Sheet open={reporting} onClose={() => setReporting(false)} title="Report this student" description="Reports are reviewed by the Prepex team. The student is not told.">
        <div className="flex flex-col gap-2 pt-1">
          {REPORT_REASONS.map((r) => (
            <GhostButton key={r.value} data-testid={`report-${r.value}`} onClick={() => { setReporting(false); void run(() => reportStudent(p.userId, r.value), "Thanks. We will take a look."); }}>
              {r.label}
            </GhostButton>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
