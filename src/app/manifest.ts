import type { MetadataRoute } from "next";

/**
 * Orbit is a phone-first daily planner, so "Add to Home Screen" is close to a
 * core feature — and there was no manifest at all. `src/proxy.ts` already
 * excludes `manifest.webmanifest` from the auth matcher, so this is reachable
 * before login (installing shouldn't require a session).
 *
 * ponytail: one 672×672 icon, no maskable variant. Add purpose-"maskable" 192
 * and 512 PNGs when the Android launcher crop starts looking wrong.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orbit — Analog-Future Life Planner",
    short_name: "Orbit",
    description:
      "An AI-powered personal operating environment that learns your rhythms and surfaces what matters most.",
    start_url: "/",
    // No browser chrome; the app already draws its own nav on every edge.
    display: "standalone",
    orientation: "portrait",
    background_color: "#141313", // --background
    theme_color: "#141313",
    icons: [
      {
        src: "/Logo.png",
        sizes: "672x672",
        type: "image/png",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
