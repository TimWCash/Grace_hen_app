import type { MetadataRoute } from "next";
import { EVENT } from "@/config/event";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: EVENT.app.title,
    short_name: EVENT.app.shortName,
    description: EVENT.app.description,
    start_url: "/",
    display: "standalone",
    background_color: EVENT.brand.colors.background,
    theme_color: EVENT.brand.colors.text,
    orientation: "portrait",
    icons: [
      // PNGs so Android shows the proper install prompt + home-screen icon.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: EVENT.brand.icon, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
