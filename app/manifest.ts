import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BoValvet – Ditt digitala hemvalv",
    short_name: "BoValvet",
    description: "Digital heminventering, garantivakt och skadeunderlag för ditt lösöre.",
    start_url: "/",
    display: "standalone",
    background_color: "#F9F5EF",
    theme_color: "#2B574A",
    orientation: "portrait",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}