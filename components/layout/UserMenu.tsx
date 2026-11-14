"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserIcon, LogoutIcon } from "@/components/ui/icons";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { useAvatarSrc } from "@/lib/profile/avatar";
import { AvatarFace } from "@/components/ui/AvatarFace";
import { performLogout } from "@/lib/api/auth";
import { getStoredUser } from "@/lib/auth/session";
import { isGuestUser } from "@/lib/onboardingV2/guest";

type UserMenuProps = {
  name?: string;
  initial?: string;
};

export function UserMenu({ name, initial }: UserMenuProps) {
  const storedFullName = useStoredFullName();
  const displayName = name ?? (storedFullName.trim().split(/\s+/)[0] || "Student");
  const displayInitial = initial ?? displayName[0]?.toUpperCase() ?? "S";
  const avatarSrc = useAvatarSrc();
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const [isLogoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  // Part D: a guest can save their account from here at any time, and is warned before logging out unsaved
  const [isGuest, setIsGuest] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from this device
    setIsGuest(isGuestUser(getStoredUser()));
  }, []);
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
        // Below sm the name is hidden, so the label keeps it for screen readers.
        aria-label={`Account menu, ${displayName}`}
        // Below sm: a 44px circle with just the avatar/initial, so the header
        // title keeps the width. From sm up: avatar + name pill.
        className="
    flex
    h-11
    w-11
    items-center
    justify-center
    rounded-full
    bg-icon-action-bg
    transition-colors
    hover:bg-tint-strong
    sm:w-auto
    sm:min-w-[100px]
    sm:justify-start
    sm:gap-2.5
    sm:px-1.5
    sm:pr-3
  "
      >
        <AvatarFace
          src={avatarSrc}
          fallback={displayInitial}
          className="
    flex
    h-8
    w-8
    shrink-0
    items-center
    justify-center
    rounded-full
    bg-[#171658]
    text-sm
    font-bold
    leading-5
    text-white
    dark:bg-[#FAF7F2]
    dark:text-[#171658]
  "
        />

        <span
          className="
      hidden
      min-w-0
      truncate
      sm:block
      text-sm
      font-semibold
      leading-5
      text-ink
    "
        >
          {displayName}
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="
        absolute right-0 top-full z-40 mt-2
        w-44 overflow-hidden
        rounded-xl border border-brand/10
        bg-surface py-1 shadow-modal
      "
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

          {isGuest && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                window.location.assign("/home?save=1");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold text-ink hover:bg-tint-strong"
              data-testid="menu-save-account"
            >
              <UserIcon />
              Save your account
            </button>
          )}

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
        onConfirm={async () => {
          await performLogout();
          router.push("/login");
        }}
        title="Log out"
        description={isGuest ? "You are using a guest account. If you log out before saving it, your progress cannot be recovered." : "Are you sure you want to logout?"}
        confirmLabel="Logout"
      />
    </div>
  );
}
