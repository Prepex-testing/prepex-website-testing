import { ImageResponse } from "next/og";

// TEMPORARY placeholder icon — replace with real brand artwork once available.
// Logo.tsx is a text wordmark only; there is no square/maskable brand asset yet.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 96,
          fontFamily: "sans-serif",
        }}
      >
        <span style={{ fontSize: 280, fontWeight: 800, color: "#faf7f2" }}>
          p<span style={{ color: "#ff7a59" }}>.</span>
        </span>
      </div>
    ),
    { ...size }
  );
}
