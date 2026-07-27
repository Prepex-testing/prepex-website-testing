"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { ChronotypeValue, StudyWindowValue } from "@/lib/api/onboarding";

type ScheduleSuggestion = {
  chronotype: ChronotypeValue;
  studyWindows: StudyWindowValue[];
};

type ScheduleSuggestionContextValue = {
  suggestion: ScheduleSuggestion | null;
  setSuggestion: (suggestion: ScheduleSuggestion) => void;
};

const ScheduleSuggestionContext = createContext<ScheduleSuggestionContextValue | null>(null);

export function ScheduleSuggestionProvider({ children }: { children: ReactNode }) {
  const [suggestion, setSuggestion] = useState<ScheduleSuggestion | null>(null);

  return (
    <ScheduleSuggestionContext.Provider value={{ suggestion, setSuggestion }}>
      {children}
    </ScheduleSuggestionContext.Provider>
  );
}

// Step 3's schedule upload (step3a) only returns a suggestion — nothing is
// persisted server-side until step 4 is actually submitted. This context
// carries that suggestion across the client-side navigation from step 3 to
// step 4 without round-tripping through storage.
export function useScheduleSuggestion() {
  const ctx = useContext(ScheduleSuggestionContext);
  if (!ctx) {
    throw new Error("useScheduleSuggestion must be used within ScheduleSuggestionProvider");
  }
  return ctx;
}
