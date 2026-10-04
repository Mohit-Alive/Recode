import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Recode: Spaced Repetition for Coding Interviews",
    short_name: SITE.name,
    description: SITE.description,
    id: "/",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#08090a",
    theme_color: "#08090a",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
