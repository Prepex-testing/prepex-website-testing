import { ImageResponse } from "next/og";

// TEMPORARY placeholder icon — replace with real brand artwork once available.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a4e",
          fontFamily: "sans-serif",
        }}
      >
        <span style={{ fontSize: 100, fontWeight: 800, color: "#faf7f2" }}>
          p<span style={{ color: "#ff7a59" }}>.</span>
        </span>
      </div>
    ),
    { ...size }
  );
}
