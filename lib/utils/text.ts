// Some subject/exam names come back from the API in all caps (e.g. "BUSINESS
// STUDIES") while others are already mixed case (e.g. "Biology") — normalize
// both to a consistent Title Case for display.
export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}
