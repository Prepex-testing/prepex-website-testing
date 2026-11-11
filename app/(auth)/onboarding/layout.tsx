import { OnboardingPexo } from "@/components/pexo/OnboardingPexo";
import { OnboardingDraftProvider } from "@/lib/onboarding/draft-context";

export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <OnboardingDraftProvider>
      {children}
      {/* Pexo narrates the steps as an overlay; the steps themselves are untouched */}
      <OnboardingPexo />
    </OnboardingDraftProvider>
  );
}
