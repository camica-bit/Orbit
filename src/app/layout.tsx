import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";   // Orbit Design System
import "@/styles/pixel-effects.css";
import "@/styles/animations.css";
import AppShell from "@/components/shell/AppShell";

/**
 * These three were two render-blocking `@import url(...)` lines at the top of
 * `styles/globals.css`, which serialise: fetch our CSS, parse it, *then* go ask
 * Google for the font CSS, then fetch the font. `next/font` self-hosts the
 * files at build time and emits a preload, so there is no third-party request
 * and no layout shift. Variable axes cover every weight the design system uses.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  // Several components italicise body copy (HeroCard, InputBar, TranscriptionBox).
  style: ["normal", "italic"],
  variable: "--font-hanken-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Orbit — Analog-Future Life Planner",
  description: "An AI-powered personal operating environment that learns your rhythms and surfaces what matters most.",
  keywords: ["productivity", "AI planner", "personal assistant", "task management"],
};

/**
 * There was no `viewport` export at all, so mobile browsers fell back to a
 * ~980px virtual viewport and scaled the whole phone-first layout down.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Left zoomable on purpose — locking it out fails WCAG 1.4.4.
  themeColor: "#141313",
  // The fullscreen routes paint to the edges; keep content clear of the notch.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* `Material Symbols Outlined` is an icon font and is absent from
            next/font/google's catalogue (see its font-data.json), so it stays a
            stylesheet. This used to be loaded twice — here *and* via an @import
            in globals.css. The lint rule below is a Pages Router rule about
            `pages/_document.js`; it has no App Router equivalent. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
