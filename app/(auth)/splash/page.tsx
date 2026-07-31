"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo, Logo1 } from "@/components/ui/Logo";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

const REDIRECT_DELAY_MS = 2000;

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/welcome");
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-[25px] bg-background px-6">
      <Logo1 />
      <LoadingIndicator />
    </main>
  );
}
