"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProfileAvatar, StudyingNowStrip } from "@/components/social/social";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { Sheet } from "@/components/planner/Sheet";
import { GhostButton } from "@/components/ui/GhostButton";
import { PageLoader } from "@/components/ui/PageLoader";
import { Switch } from "@/components/ui/Switch";
import { getBoard, getBoardRules, getHall, getSocialSettings, profileHref, searchStudents, updateSocialSettings, type BoardFilter, type BoardKind, type BoardResult, type BoardRules, type Hall, type Identity, type SocialSettings } from "@/lib/api/social";
import { BOARDS, boardCaption, FILTERS, formatHours, gapText } from "@/lib/social/board";

/** The XP leaderboards: Today, This Month and Most Improved, each filtered to the people who matter. */
export default function LeaderboardPage() {
  const [board, setBoard] = useState<BoardKind>("today");
  const [filter, setFilter] = useState<BoardFilter>("india");
  const [data, setData] = useState<BoardResult | null>(null);
  const [error, setError] = useState(false);
  const [rules, setRules] = useState<BoardRules | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hall, setHall] = useState<Hall | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Identity[]>([]);

  const load = useCallback(() => {
    setError(false);
    void getBoard({ board, filter, limit: 50 })
      .then(setData)
      .catch(() => setError(true));
  }, [board, filter]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    void getSocialSettings().then(setSettings).catch(() => undefined);
    void getHall().then(setHall).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setFound([]);
      return;
    }
    const t = setTimeout(() => void searchStudents(query).then(setFound).catch(() => setFound([])), 250);
    return () => clearTimeout(t);
  }, [query]);

  async function toggleHidden(next: boolean) {
    setSettings((s) => (s ? { ...s, leaderboardHidden: next } : s));
    try {
      setSettings(await updateSocialSettings({ leaderboardHidden: next }));
      load();
    } catch {
      setSettings((s) => (s ? { ...s, leaderboardHidden: !next } : s));
    }
  }

  if (!data && !error) return <PageLoader label="Loading the board…" />;

  const me = data?.me;
  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 p-4 sm:p-6" data-testid="leaderboard">
      <ProfileSubpageHeader title="Leaderboard" backHref="/home" />

      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Board" className="flex gap-1 overflow-x-auto rounded-full border border-border-subtle bg-surface-elevated p-1">
          {BOARDS.map((b) => (
            <button key={b.id} id={`board-${b.id}`} role="tab" type="button" aria-selected={board === b.id} data-testid={`board-${b.id}`} onClick={() => setBoard(b.id)} className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold ${board === b.id ? "bg-surface-elevated-2 text-ink" : "text-muted hover:text-ink"}`}>
              {b.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="How the leaderboard works"
          data-testid="rules-open"
          onClick={() => {
            setShowRules(true);
            if (!rules) void getBoardRules().then(setRules).catch(() => undefined);
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border-subtle text-[18px] font-bold text-ink"
        >
          <span aria-hidden>ⓘ</span>
        </button>
      </div>

      <div role="group" aria-label="Who to compare with" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} data-testid={`filter-${f.id}`} onClick={() => setFilter(f.id)} className={`min-h-10 rounded-full border px-4 text-[13px] font-semibold ${filter === f.id ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle bg-surface text-body-text dark:text-ink"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {data && (
        <p className="text-[12px] text-muted" data-testid="board-caption">
          {boardCaption(data)}
        </p>
      )}

      {me && (
        <section className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-elevated-2 p-4" data-testid="my-position" aria-label="Your position">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">You</p>
            <p className="text-[26px] font-extrabold leading-none text-ink" data-testid="my-rank">
              {me.hidden ? "Hidden" : me.rank === null ? "No XP yet" : `#${me.rank}`}
            </p>
            {gapText(me) && (
              <p className="mt-1 text-[13px] text-muted" data-testid="my-gap">
                {gapText(me)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[22px] font-extrabold text-ink">{me.xp} XP</p>
            <p className="text-[12px] text-muted">{formatHours(me.hours)}</p>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-[14px] text-danger">
          Couldn&apos;t load the board.{" "}
          <button type="button" className="underline" onClick={load}>
            Try again
          </button>
        </p>
      )}

      {data && data.rows.length === 0 && (
        <p className="rounded-2xl border border-border-subtle bg-surface-elevated p-4 text-[14px] text-muted" data-testid="board-empty">
          {filter === "following" ? "Follow a few students to see them here." : "Nobody has XP on this board yet. Log some study and you will be first."}
        </p>
      )}

      {data && data.rows.length > 0 && (
        <ol className="flex flex-col gap-2" data-testid="board-rows">
          {data.rows.map((r) => (
            <li key={r.userId} data-testid="board-row" data-me={r.isMe ? "true" : undefined} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.isMe ? "border-[1.5px] border-brand bg-tint-strong" : "border-border-subtle bg-surface-elevated"}`}>
              <span className="w-8 shrink-0 text-center text-[15px] font-extrabold text-ink">{r.rank}</span>
              <ProfileAvatar who={r} size={40} />
              <Link href={profileHref(r)} className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">{r.isMe ? `${r.name} (you)` : r.name}</p>
                <p className="truncate text-[12px] text-muted">
                  Level {r.level} · {r.title}
                  {r.improvement ? ` · ${r.improvement.delta >= 0 ? "+" : ""}${r.improvement.delta} XP a day vs last month` : ""}
                </p>
              </Link>
              <div className="shrink-0 text-right">
                <p className="text-[16px] font-extrabold text-ink">
                  {r.xp}
                  {board === "improved" ? " XP/day" : " XP"}
                </p>
                <p className="text-[12px] text-muted">{formatHours(r.hours)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <StudyingNowStrip />

      <section className="flex flex-col gap-2" aria-label="Find a student">
        <label className="text-[13px] font-semibold text-body-text dark:text-ink" htmlFor="student-search">
          Find a student
        </label>
        <input id="student-search" data-testid="student-search" placeholder="Search by name or @username" value={query} onChange={(e) => setQuery(e.target.value)} className="h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-ink outline-none focus:border-brand" />
        {found.length > 0 && (
          <ul className="flex flex-col gap-2" data-testid="search-results">
            {found.map((f) => (
              <li key={f.userId} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-elevated px-3 py-2">
                <ProfileAvatar who={f} size={36} />
                <Link href={profileHref(f)} className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
                  {f.name}
                  {f.username && <span className="ml-2 text-[12px] font-normal text-muted">@{f.username}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hall && hall.month && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-4" data-testid="hall">
          <h2 className="text-[16px] font-extrabold text-ink">Hall of Toppers · {hall.month}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hall.boards.map((b) => (
              <div key={b.board} className="rounded-xl border border-border-subtle bg-surface p-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{b.label}</p>
                <ol className="mt-1 flex flex-col gap-1 text-[14px] text-ink">
                  {b.rows.map((r) => (
                    <li key={r.rank} className="flex justify-between gap-2">
                      <span>
                        {r.rank}. {r.name}
                      </span>
                      <span className="text-muted">{r.xp} XP</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}

      <GhostButton data-testid="settings-open" onClick={() => setShowSettings(true)} className="self-start">
        Leaderboard settings
      </GhostButton>

      <Sheet open={showRules} onClose={() => setShowRules(false)} title="How it works" description="XP is earned from what you actually log." data-testid="rules-sheet">
        {rules ? (
          <div className="flex flex-col gap-4 pt-1 text-[14px] text-body-text dark:text-ink">
            <ul className="flex flex-col gap-1.5">
              {rules.earn.map((e) => (
                <li key={e.label} className="flex justify-between gap-3">
                  <span>{e.label}</span>
                  <span className="shrink-0 font-semibold text-ink">{e.value}</span>
                </li>
              ))}
            </ul>
            <div>
              <p className="font-bold text-ink">When boards reset</p>
              <p>
                Today: {rules.resets.today}. This Month and Most Improved: {rules.resets.month}.
              </p>
            </div>
            <div>
              <p className="font-bold text-ink">Fair play</p>
              <ul className="list-disc pl-5">
                {rules.caps.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-muted">Loading…</p>
        )}
      </Sheet>

      <Sheet open={showSettings} onClose={() => setShowSettings(false)} title="Leaderboard settings" data-testid="settings-sheet">
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-bold text-ink">Hide me from leaderboards</p>
              <p className="text-[13px] text-muted">You still earn XP, only you can see it.</p>
            </div>
            <Switch checked={settings?.leaderboardHidden ?? false} onChange={(v) => void toggleHidden(v)} label="Hide me from leaderboards" />
          </div>
          <p className="text-[13px] text-muted">Set your @username and what your profile shows in Profile settings.</p>
          <Link href="/profile" className="text-[14px] font-semibold text-ink underline">
            Open profile settings
          </Link>
        </div>
      </Sheet>
    </div>
  );
}
