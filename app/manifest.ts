import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "prepex — Plan. Execute. Survive. Win.",
    short_name: "prepex",
    description: "Plan. Execute. Survive. Win.",
    start_url: "/splash",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f2",
    theme_color: "#1a1a4e",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        // Full-bleed indigo with the pyramid inside the 80% safe zone, so
        // launcher masks (circle, squircle) never clip the artwork.
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
