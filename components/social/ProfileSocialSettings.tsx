"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GhostButton } from "@/components/ui/GhostButton";
import { Switch } from "@/components/ui/Switch";
import { ApiError } from "@/lib/api/http";
import { getSocialSettings, updateSocialSettings, type SocialSettings } from "@/lib/api/social";

/** What a username looks like before it is sent: 3 to 20 lowercase letters, digits or underscores. */
export function cleanUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}
export function usernameProblem(raw: string): string | null {
  const u = cleanUsername(raw);
  if (u === "") return "Pick a username.";
  if (!/^[a-z0-9_]{3,20}$/.test(u)) return "Use 3 to 20 letters, numbers or underscores.";
  return null;
}

/** Profile: the @username other students find you by, and what your public profile shows. */
export function ProfileSocialSettings() {
  const [s, setS] = useState<SocialSettings | null>(null);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    void getSocialSettings()
      .then((r) => {
        if (!alive) return;
        setS(r);
        setUsername(r.username ?? "");
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  async function save(patch: Partial<SocialSettings>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      const next = await updateSocialSettings(patch);
      setS(next);
      setUsername(next.username ?? "");
      setMessage({ kind: "ok", text: done });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof ApiError ? err.message : "That didn't save. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  if (!s) return null;
  const problem = username.trim() === "" ? null : usernameProblem(username);
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-6" data-testid="profile-social" aria-label="Username and privacy">
      <h2 className="text-[16px] font-extrabold text-ink">Username and privacy</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-[14px] font-semibold text-body-text dark:text-ink">
          Your @username
        </label>
        <div className="flex gap-2">
          <input id="username" data-testid="username-input" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} maxLength={21} placeholder="aarav_sharma" className="h-12 min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-3 text-[16px] text-ink outline-none focus:border-brand" />
          <GhostButton data-testid="username-save" disabled={busy || username.trim() === "" || problem !== null || cleanUsername(username) === s.username} onClick={() => void save({ username: cleanUsername(username) }, "Username saved")}>
            Save
          </GhostButton>
        </div>
        {problem && (
          <p role="alert" className="text-[12px] text-danger" data-testid="username-problem">
            {problem}
          </p>
        )}
        {s.username && (
          <Link href={`/u/${s.username}`} className="text-[13px] font-semibold text-ink underline">
            See how your profile looks
          </Link>
        )}
      </div>

      {[
        { id: "showAccuracy" as const, label: "Show my accuracy on my profile", hint: "Off by default. Other students only see it when this is on." },
        { id: "showMockScores" as const, label: "Show my latest mock score", hint: "Off by default." },
        { id: "leaderboardHidden" as const, label: "Hide me from leaderboards", hint: "You still earn XP. Only you can see it." },
      ].map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">{row.label}</p>
            <p className="text-[12px] text-muted">{row.hint}</p>
          </div>
          <Switch checked={s[row.id]} onChange={(v) => void save({ [row.id]: v }, "Saved")} label={row.label} />
        </div>
      ))}
      <p className="text-[12px] text-muted">Your phone number and email are never shown to other students.</p>

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`text-[13px] ${message.kind === "error" ? "text-danger" : "text-muted"}`} data-testid="social-message">
          {message.text}
        </p>
      )}
    </section>
  );
}
