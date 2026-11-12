"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Pexo } from "@/components/pexo/Pexo";
import { Modal } from "@/components/ui/Modal";
import { GhostButton } from "@/components/ui/GhostButton";
import { ApiError } from "@/lib/api/http";
import { answerDuel, answerTogether, challengeDuel, endTogether, getPexoSocial, inviteLink, inviteTogether, type PexoDuel, type PexoLine, type PexoSocial, type PexoTogether } from "@/lib/api/pexo";
import { listFollowing, type Identity } from "@/lib/api/social";
import { pexoEvent, pexoMark, pexoReact, pexoSay, usePexo } from "@/lib/pexo/store";

/**
 * Part D on screen: Climb Together (shared flames), the weekly duel, invite links and the batch rank line. The social
 * card is read once per screen (shared between the cards on it) and after each action; nothing is polled. Lines are
 * shown as plain text inside the cards: the screen's one Pexo bubble stays the Home bubble.
 */

// ---------------------------------------------------------------------------------------------------------------------
// One read per screen, shared by every card on it
// ---------------------------------------------------------------------------------------------------------------------

let social: PexoSocial | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function reloadSocial(): Promise<void> {
  loading = getPexoSocial()
    .then((s) => {
      social = s;
      notify();
    })
    .catch(() => undefined)
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Tests only. */
export function resetSocial(): void {
  social = null;
  loading = null;
  decided.clear();
}

export function usePexoSocial(): PexoSocial | null {
  const { enabled } = usePexo();
  const data = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => social,
    () => null,
  );
  useEffect(() => {
    if (enabled && !social && !loading) void reloadSocial();
  }, [enabled]);
  return enabled ? data : null;
}

/** A line from the server as Pexo's text (in the student's language), or nothing. */
function lineText(line: PexoLine): string | null {
  if (!line) return null;
  return pexoSay(line.trigger, line.context, { silent: true })?.text ?? null;
}

function PexoNote({ text, testId }: { text: string; testId: string }) {
  return (
    <p className="flex items-center gap-2 text-[13px] text-body-text dark:text-ink" data-testid={testId}>
      <Pexo size={24} mood="happy" />
      <span>{text}</span>
    </p>
  );
}

/** pexoMark, decided once per key for this page: a render that runs twice (Strict Mode) gets the same answer. */
const decided = new Map<string, boolean>();
function firstTime(mark: string): boolean {
  if (!decided.has(mark)) decided.set(mark, pexoMark(mark, true));
  return decided.get(mark)!;
}

const errText = (err: unknown) => (err instanceof ApiError ? err.message : "That did not work. Please try again.");

// ---------------------------------------------------------------------------------------------------------------------
// Climb Together
// ---------------------------------------------------------------------------------------------------------------------

function Flame({ days }: { days: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-tint-strong px-2 py-0.5 text-[12px] font-bold text-ink" aria-label={`${days}-day shared flame`}>
      <svg viewBox="0 0 16 16" className="size-3.5 fill-brand" aria-hidden>
        <path d="M8 1c.6 2.4 3.5 3.6 3.5 7.2A3.5 3.5 0 0 1 8 11.7a3.5 3.5 0 0 1-3.5-3.5C4.5 6.6 5.6 5.5 6.3 4.4 6.6 5.6 7.3 6 8 6.2 8.2 4.7 8 2.8 8 1Z" />
      </svg>
      {days}
    </span>
  );
}

function TogetherRow({ t, full, onChange }: { t: PexoTogether; full: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // the first time a flame shows as shared: "You and {friend} now share a flame."
  const [started] = useState(() => t.status === "active" && firstTime(`together.started.${t.id}`));
  const text = started ? lineText({ trigger: "together.started", context: { friend: t.friend.name } }) : lineText(t.line);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChange();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-border-subtle px-3 py-2" data-testid="together-row" data-status={t.status}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[14px] font-semibold text-ink">{t.friend.name}</span>
        {t.status === "active" && <Flame days={t.streak} />}
      </div>
      {t.status === "active" && (
        <p className="text-[12px] text-muted">
          Today: you {t.today.me ? "studied" : "not yet"} · {t.friend.name} {t.today.friend ? "studied" : "not yet"}
          {t.freezes > 0 ? ` · ${t.freezes} freeze${t.freezes > 1 ? "s" : ""} saved` : ""}
        </p>
      )}
      {t.status === "pending_out" && <p className="text-[12px] text-muted">Waiting for {t.friend.name} to accept.</p>}
      {t.status === "pending_in" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">{t.friend.name} wants to share a flame.</span>
          <GhostButton className="min-h-11" disabled={busy} onClick={() => void act(() => answerTogether(t.id, true))} data-testid="together-accept">Accept</GhostButton>
          <GhostButton className="min-h-11" disabled={busy} onClick={() => void act(() => answerTogether(t.id, false))}>Not now</GhostButton>
        </div>
      )}
      {text && <PexoNote text={text} testId="together-line" />}
      {full && t.status !== "pending_in" && (
        <button type="button" className="min-h-11 w-fit text-[12px] font-semibold text-muted underline" disabled={busy} onClick={() => void act(() => endTogether(t.id))} data-testid="together-end">
          {t.status === "active" ? "End shared flame" : "Cancel"}
        </button>
      )}
      {error && <p role="alert" className="text-[12px] font-medium text-danger">{error}</p>}
    </li>
  );
}

/** Pick someone you follow (for a shared flame or a duel). Loads the list when opened. */
function FriendPicker({ open, title, onClose, onPick }: { open: boolean; title: string; onClose: () => void; onPick: (f: Identity) => Promise<void> }) {
  const [list, setList] = useState<Identity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open || list) return;
    listFollowing().then(setList).catch(() => setList([]));
  }, [open, list]);
  return (
    <Modal open={open} onClose={onClose} ariaLabel={title} size="md">
      <div className="flex flex-col gap-3" data-testid="friend-picker">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {list === null && <div className="skeleton h-24 rounded-xl" />}
        {list && list.length === 0 && <p className="text-[13px] text-muted">Follow a friend first, or send them your invite link.</p>}
        {list && list.length > 0 && (
          <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
            {list.map((f) => (
              <li key={f.userId}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left text-[14px] text-ink hover:bg-tint-strong"
                  onClick={() => void onPick(f).then(onClose).catch((err: unknown) => setError(errText(err)))}
                >
                  {f.name}
                  {f.username && <span className="text-[12px] text-muted">@{f.username}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p role="alert" className="text-[12px] font-medium text-danger">{error}</p>}
        <GhostButton className="self-end" onClick={onClose}>Close</GhostButton>
      </div>
    </Modal>
  );
}

/** Your link: WhatsApp (with Pexo's invite line in your Pexo language), copy, and climb with someone you follow. */
export function InviteSheet({ open, onClose, code }: { open: boolean; onClose: () => void; code: string }) {
  const [copied, setCopied] = useState(false);
  const link = inviteLink(code);
  const message = pexoSay("invite.message", { link }, { silent: true })?.text ?? link;
  const share = () => {
    pexoEvent("invite_sent", { via: "whatsapp" });
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      pexoEvent("invite_sent", { via: "copy" });
    } catch {
      setCopied(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Invite a friend" size="md">
      <div className="flex flex-col gap-3" data-testid="invite-sheet">
        <h2 className="text-lg font-bold text-ink">Invite a friend</h2>
        <p className="rounded-xl bg-tint-strong px-3 py-2 text-[13px] text-ink" data-testid="invite-message">{message}</p>
        <p className="text-[12px] text-muted">When your friend finishes onboarding and studies one day, you both get a new look for Pexo.</p>
        <div className="flex flex-wrap gap-2">
          <GhostButton className="min-h-11" onClick={share} data-testid="invite-whatsapp">Share on WhatsApp</GhostButton>
          <GhostButton className="min-h-11" onClick={() => void copy()} data-testid="invite-copy">{copied ? "Link copied" : "Copy link"}</GhostButton>
          <GhostButton className="min-h-11" onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </Modal>
  );
}

/** Shared flames. Compact on Home (up to 3, no end button), full on the profile. */
export function ClimbTogether({ full = false }: { full?: boolean }) {
  const data = usePexoSocial();
  const [picker, setPicker] = useState(false);
  const [invite, setInvite] = useState(false);
  const reload = useCallback(() => void reloadSocial(), []);

  // someone joined from my link and we both got a new look: once each
  const recent = data?.invite?.recent?.map((r) => r.inviteeId).join(",") ?? "";
  useEffect(() => {
    for (const r of data?.invite?.recent ?? []) {
      if (pexoMark(`invite.joined.${r.inviteeId}`, true)) {
        pexoReact("invite.joined", { friend: r.name }, { kind: "celebration" });
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `recent` captures the list
  }, [recent]);

  if (!data?.invite || !Array.isArray(data.together)) return null;
  const rows = full ? data.together : data.together.slice(0, 3);
  const inviteLine = data.together.length === 0 ? lineText({ trigger: "together.invite", context: {} }) : null;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-4" aria-labelledby="together-title" data-testid="climb-together">
      <div className="flex items-center justify-between gap-2">
        <h2 id="together-title" className="text-[15px] font-bold text-ink">Climb Together</h2>
        <span className="text-[12px] text-muted">{data.together.filter((t) => t.status === "active").length} of 5</span>
      </div>
      {inviteLine && <PexoNote text={inviteLine} testId="together-invite-line" />}
      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((t) => (
            <TogetherRow key={t.id} t={t} full={full} onChange={reload} />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <GhostButton className="min-h-11" onClick={() => setPicker(true)} data-testid="together-pick">Climb with a friend</GhostButton>
        <GhostButton className="min-h-11" onClick={() => setInvite(true)} data-testid="invite-open">Invite a friend</GhostButton>
      </div>
      <FriendPicker open={picker} title="Climb with a friend" onClose={() => setPicker(false)} onPick={async (f) => { await inviteTogether(f.userId); reload(); }} />
      <InviteSheet open={invite} onClose={() => setInvite(false)} code={data.invite.code} />
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Weekly XP duel
// ---------------------------------------------------------------------------------------------------------------------

function DuelRow({ d, onChange }: { d: PexoDuel; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);
  // won / lost are said once
  const [fresh] = useState(() => d.status !== "done" || firstTime(`duel.done.${d.id}`));
  const text = fresh ? lineText(d.line) : null;
  const [now] = useState(() => Date.now());
  const days = d.endsAt ? Math.max(0, Math.ceil((new Date(d.endsAt).getTime() - now) / 86_400_000)) : null;
  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-border-subtle px-3 py-2" data-testid="duel-row" data-status={d.status}>
      <div className="flex items-center justify-between gap-2 text-[14px]">
        <span className="font-semibold text-ink">You vs {d.friend.name}</span>
        {(d.status === "active" || d.status === "done") && (
          <span className="font-bold tabular-nums text-ink">
            {d.me} : {d.them} XP
          </span>
        )}
      </div>
      {d.status === "active" && days !== null && <p className="text-[12px] text-muted">{days} day{days === 1 ? "" : "s"} left</p>}
      {d.status === "pending_out" && <p className="text-[12px] text-muted">Waiting for {d.friend.name} to accept.</p>}
      {d.status === "pending_in" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">{d.friend.name} challenged you to 7 days of XP.</span>
          <GhostButton className="min-h-11" onClick={() => void answerDuel(d.id, true).then(onChange).catch((e: unknown) => setError(errText(e)))} data-testid="duel-accept">Accept</GhostButton>
          <GhostButton className="min-h-11" onClick={() => void answerDuel(d.id, false).then(onChange).catch((e: unknown) => setError(errText(e)))}>Not now</GhostButton>
        </div>
      )}
      {text && <PexoNote text={text} testId="duel-line" />}
      {error && <p role="alert" className="text-[12px] font-medium text-danger">{error}</p>}
    </li>
  );
}

/** Weekly XP duels. Hidden in care mode. */
export function Duels() {
  const data = usePexoSocial();
  const [picker, setPicker] = useState(false);
  if (!data || data.care || !Array.isArray(data.duels)) return null;
  const shown = data.duels.filter((d) => d.status !== "done" || d.result !== "draw");
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-4" aria-labelledby="duels-title" data-testid="duels">
      <div className="flex items-center justify-between gap-2">
        <h2 id="duels-title" className="text-[15px] font-bold text-ink">Weekly duel</h2>
        <GhostButton className="min-h-11" onClick={() => setPicker(true)} data-testid="duel-pick">Challenge a friend</GhostButton>
      </div>
      {shown.length === 0 ? (
        <p className="text-[13px] text-muted">7 days, XP only. Pick someone you follow.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((d) => (
            <DuelRow key={d.id} d={d} onChange={() => void reloadSocial()} />
          ))}
        </ul>
      )}
      <FriendPicker open={picker} title="Challenge a friend" onClose={() => setPicker(false)} onPick={async (f) => { await challengeDuel(f.userId); void reloadSocial(); }} />
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Batch rank
// ---------------------------------------------------------------------------------------------------------------------

const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-${Math.ceil(((t.getTime() - y.getTime()) / 86_400_000 + 1) / 7)}`;
};

/** "You're #3 in your Allen batch on Prepex this month." Always on the leaderboard; on Home once a week. */
export function BatchRank({ weekly = false }: { weekly?: boolean }) {
  const data = usePexoSocial();
  const [show] = useState(() => !weekly || firstTime(`batch.${isoWeek(new Date())}`));
  if (!data?.batch || data.care || !show) return null;
  const text = lineText({ trigger: "social.batch_rank", context: { rank: data.batch.rank, coaching: data.batch.coaching } });
  return text ? <PexoNote text={text} testId="batch-rank" /> : null;
}

/** Home: the compact social block (shared flames, the duel, the weekly batch line). */
export function HomeSocial() {
  const data = usePexoSocial();
  if (!data) return null;
  return (
    <div className="flex flex-col gap-3" data-testid="home-social">
      <BatchRank weekly />
      <div className="grid gap-3 lg:grid-cols-2">
        <ClimbTogether />
        <Duels />
      </div>
    </div>
  );
}
