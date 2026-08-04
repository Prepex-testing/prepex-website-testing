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
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
