"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Pexo } from "@/components/pexo/Pexo";
import { Logo } from "@/components/ui/Logo";
import { lookupInvite } from "@/lib/api/pexo";
import { savePendingInvite } from "@/lib/pexo/invite";

/** /join/<code>: a friend's invite link. Remembers the link on this device, then signs the student up or in. */
export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <Join />
    </Suspense>
  );
}

function Join() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const code = String(params?.code ?? "").toLowerCase();
  const [invite, setInvite] = useState<{ valid: boolean; name: string | null } | null>(null);

  useEffect(() => {
    let live = true;
    lookupInvite(code)
      .then((r) => {
        if (!live) return;
        setInvite(r);
        if (r.valid) savePendingInvite(code, search);
      })
      .catch(() => live && setInvite({ valid: false, name: null }));
    return () => {
      live = false;
    };
  }, [code, search]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 text-center" data-testid="join-page">
      <Logo />
      <Pexo size={160} mood="waving" />
      {invite === null ? (
        <div className="skeleton h-16 w-72 rounded-xl" aria-label="Checking the link" />
      ) : invite.valid ? (
        <div className="flex max-w-sm flex-col gap-2">
          <h1 className="text-[22px] font-extrabold text-ink" data-testid="join-title">
            {invite.name ? `${invite.name} invited you to Prepex` : "You were invited to Prepex"}
          </h1>
          <p className="text-[14px] text-muted">Plan your JEE prep, study with focus, and share a streak with your friend.</p>
        </div>
      ) : (
        <div className="flex max-w-sm flex-col gap-2">
          <h1 className="text-[22px] font-extrabold text-ink">This link does not work</h1>
          <p className="text-[14px] text-muted">You can still join Prepex.</p>
        </div>
      )}
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Link href="/create-account" className="flex min-h-12 items-center justify-center rounded-full bg-brand px-6 text-[15px] font-bold text-white dark:text-[#0b0b1f]" data-testid="join-signup">
          Join Prepex
        </Link>
        <Link href="/login" className="flex min-h-11 items-center justify-center text-[14px] font-semibold text-ink underline">
          I already have an account
        </Link>
      </div>
    </main>
  );
}
