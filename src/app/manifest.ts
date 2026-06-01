import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grace's Hen — Dublin",
    short_name: "Grace's Hen",
    description:
      "A keepsake companion for Grace's hen weekend and wedding day.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf8ef",
    theme_color: "#0a1f44",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
