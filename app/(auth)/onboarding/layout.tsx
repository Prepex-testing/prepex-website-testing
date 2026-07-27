import { ScheduleSuggestionProvider } from "@/lib/onboarding/schedule-suggestion-context";

export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ScheduleSuggestionProvider>{children}</ScheduleSuggestionProvider>;
}
