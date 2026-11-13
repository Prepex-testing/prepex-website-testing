import library from "@/lib/pexo/library.json";
import { selectLine, type PexoContext, type PexoLanguage, type PexoLibrary, type PexoPick } from "@/lib/pexo/engine";

const PEXO_LIBRARY = library as unknown as PexoLibrary;

/**
 * Onboarding v2: Pexo's lines before (and during) sign-up, when there is no Pexo state on the server yet. Only library
 * lines are ever said, and a line that cannot be filled with real values is never shown (selectLine returns null).
 */
export function sayLocal(trigger: string | readonly string[], context: PexoContext = {}, language: PexoLanguage = "en"): PexoPick | null {
  const today = new Date().toISOString().slice(0, 10);
  return selectLine(PEXO_LIBRARY, trigger, context, { language, shown: {} }, today);
}
