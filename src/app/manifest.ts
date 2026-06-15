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
      {
        src: EVENT.brand.icon,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
