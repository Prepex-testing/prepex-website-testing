import type { PexoMood } from "@/lib/pexo/engine";

/**
 * Pexo's ten expressions (guide, section 3) as plain numbers the SVG reads. No crying, angry, sad or worried states exist.
 * Coordinates are in the 120 x 120 viewBox.
 */
export type MouthShape = "smile" | "wide" | "open" | "o" | "side" | "flat" | "small" | "yawn";
export type PexoProp = "book" | "lamp" | "flag" | "hammer" | "gem" | "nightcap" | "popper";
export type PexoAccessory = "cap" | "scarf" | "headphones";
export type PexoSize = 24 | 48 | 96 | 160;

export interface MoodSpec {
  /** How far the upper lid covers the eye, 0 (open) to 1 (closed). */
  lid: number;
  /** The lower lid: a little of it gives "smiling eyes". */
  lowerLid: number;
  /** Where the pupils rest, before the cursor nudges them. */
  pupil: [number, number];
  sparkle: boolean;
  /** Each brow: [raise (negative is up), tilt in degrees]. */
  browL: [number, number];
  browR: [number, number];
  mouth: MouthShape;
  cheeks: boolean;
  /** Arm angles in degrees from hanging straight down; positive lifts outward, negative folds in (hands on hips, hand to chin). */
  armL: number;
  armR: number;
  /** Whole-body lean, in degrees. */
  tilt: number;
  /** The CSS class that carries the looping or one-shot body motion (full motion only). */
  motion: string;
  /** Props this mood wears unless the caller chooses others. */
  props: PexoProp[];
}

export const MOODS: Record<PexoMood, MoodSpec> = {
  happy: { lid: 0, lowerLid: 0, pupil: [0, 0], sparkle: false, browL: [0, 0], browR: [0, 0], mouth: "smile", cheeks: true, armL: 24, armR: 24, tilt: 0, motion: "pexo-bounce", props: [] },
  proud: { lid: 0.22, lowerLid: 0.3, pupil: [0, 0], sparkle: false, browL: [-3, -6], browR: [-3, 6], mouth: "wide", cheeks: true, armL: -40, armR: -40, tilt: 0, motion: "pexo-breathe", props: [] },
  celebrating: { lid: 0, lowerLid: 0, pupil: [0, -1], sparkle: true, browL: [-5, -8], browR: [-5, 8], mouth: "open", cheeks: true, armL: 150, armR: 150, tilt: 0, motion: "pexo-jump", props: ["popper"] },
  cheering: { lid: 0, lowerLid: 0, pupil: [0, -1], sparkle: false, browL: [-4, -6], browR: [-4, 6], mouth: "open", cheeks: false, armL: 155, armR: 155, tilt: 0, motion: "pexo-hop", props: [] },
  curious: { lid: 0, lowerLid: 0, pupil: [2, -2.5], sparkle: false, browL: [0, 0], browR: [-5, 10], mouth: "o", cheeks: false, armL: 24, armR: 24, tilt: -7, motion: "pexo-breathe", props: [] },
  thinking: { lid: 0.1, lowerLid: 0, pupil: [1.5, -3.5], sparkle: false, browL: [2, 8], browR: [-2, 4], mouth: "side", cheeks: false, armL: 24, armR: -55, tilt: 0, motion: "pexo-breathe", props: [] },
  focused: { lid: 0.42, lowerLid: 0, pupil: [0, 2.5], sparkle: false, browL: [2, 10], browR: [2, -10], mouth: "flat", cheeks: false, armL: 40, armR: 40, tilt: 0, motion: "pexo-breathe", props: ["book", "lamp"] },
  calm: { lid: 0.12, lowerLid: 0, pupil: [0, 0], sparkle: false, browL: [0, 0], browR: [0, 0], mouth: "small", cheeks: false, armL: 24, armR: 24, tilt: 0, motion: "pexo-breathe-slow", props: [] },
  sleepy: { lid: 0.62, lowerLid: 0, pupil: [0, 2], sparkle: false, browL: [3, -8], browR: [3, 8], mouth: "yawn", cheeks: false, armL: 20, armR: 20, tilt: 0, motion: "pexo-sway", props: ["nightcap"] },
  waving: { lid: 0, lowerLid: 0, pupil: [0, 0], sparkle: false, browL: [-3, -4], browR: [-3, 4], mouth: "smile", cheeks: false, armL: 24, armR: 150, tilt: 0, motion: "pexo-breathe", props: [] },
};

export const MOOD_NAMES = Object.keys(MOODS) as PexoMood[];
export const PEXO_SIZES: PexoSize[] = [24, 48, 96, 160];
export const PEXO_PROPS: PexoProp[] = ["book", "lamp", "flag", "hammer", "gem", "nightcap", "popper"];
export const PEXO_ACCESSORIES: PexoAccessory[] = ["cap", "scarf", "headphones"];
