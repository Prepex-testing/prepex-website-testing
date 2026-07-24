export const MOODS = [
  { id: "drained", emoji: "😴", label: "Drained" },
  { id: "heavy", emoji: "😐", label: "Heavy" },
  { id: "steady", emoji: "🙂", label: "Steady" },
  { id: "good", emoji: "😀", label: "Good" },
  { id: "energised", emoji: "🔥", label: "Energised" },
];

export type Mood = (typeof MOODS)[number];
