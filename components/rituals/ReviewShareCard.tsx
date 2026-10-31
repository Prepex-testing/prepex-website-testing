import { forwardRef } from "react";
import { STORY_HEIGHT, STORY_WIDTH } from "@/lib/share/reviewShare";

export type ShareFigures = { hours: number; questions: number; streak: number; level: number; title: string; week: string };

/**
 * The Sunday Review story card, laid out at exactly 1080x1920 so the exported PNG is the story size. Fixed colours and
 * inline sizes on purpose: it must look the same on every device and in both themes. Real figures only.
 */
export const ReviewShareCard = forwardRef<HTMLDivElement, { figures: ShareFigures }>(function ReviewShareCard({ figures }, ref) {
  const stat = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 40, letterSpacing: 4, textTransform: "uppercase", color: "#9AA3B2" }}>{label}</span>
      <span style={{ fontSize: 148, fontWeight: 800, lineHeight: 1, color: "#FAF7F2" }}>{value}</span>
    </div>
  );
  return (
    <div
      ref={ref}
      data-testid="review-share-card"
      style={{ width: STORY_WIDTH, height: STORY_HEIGHT, background: "#0F1115", color: "#FAF7F2", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 96, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <span style={{ fontSize: 64, fontWeight: 800, color: "#FF6B47" }}>Prepex</span>
        <span style={{ fontSize: 52, color: "#9AA3B2" }}>My week · {figures.week}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 96 }}>
        {stat("Hours studied", `${figures.hours}h`)}
        {stat("Questions solved", figures.questions.toLocaleString("en-IN"))}
        {stat("Day streak", String(figures.streak))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: "2px solid #2A2F3A", paddingTop: 56 }}>
        <span style={{ fontSize: 44, color: "#9AA3B2" }}>Level {figures.level}</span>
        <span style={{ fontSize: 88, fontWeight: 800 }}>{figures.title}</span>
        <span style={{ fontSize: 40, color: "#9AA3B2" }}>prepex.io</span>
      </div>
    </div>
  );
});
