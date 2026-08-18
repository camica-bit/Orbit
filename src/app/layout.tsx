import type { Metadata } from "next";
import "./globals.css";          // Next.js scaffold (minimal)
import "@/styles/globals.css";   // Orbit Design System (overrides above)
import "@/styles/pixel-effects.css";
import "@/styles/animations.css";
import AppShell from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "Orbit — Analog-Future Life Planner",
  description: "An AI-powered personal operating environment that learns your rhythms and surfaces what matters most.",
  keywords: ["productivity", "AI planner", "personal assistant", "task management"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
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
