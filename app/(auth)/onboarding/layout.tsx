import { OnboardingDraftProvider } from "@/lib/onboarding/draft-context";

export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <OnboardingDraftProvider>{children}</OnboardingDraftProvider>;
}
