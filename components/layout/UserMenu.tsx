"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserIcon, LogoutIcon } from "@/components/ui/icons";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type UserMenuProps = {
  name?: string;
  initial?: string;
};

export function UserMenu({ name = "Rohan", initial = "R" }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const [isLogoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-tint-strong"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
          {initial}
        </span>
        <span className="text-sm font-semibold text-ink">{name}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-xl border border-brand/10 bg-surface py-1 shadow-modal"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink hover:bg-tint-strong"
          >
            <UserIcon />
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setLogoutConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-danger hover:bg-tint-strong"
          >
            <LogoutIcon />
            Logout
          </button>
        </div>
      )}

      <ConfirmModal
        open={isLogoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => router.push("/login")}
        title="Log out?"
        description="Are you sure you want to logout? You'll need to sign in again to access your plan."
        confirmLabel="Yes, Logout"
      />
    </div>
  );
}
