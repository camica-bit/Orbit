"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import SideNav from "./SideNav";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import InputBar from "./InputBar";
import styles from "./AppShell.module.css";

// Pages that render as full-screen overlays and don't need shell chrome
const FULLSCREEN_ROUTES = ["/focus", "/listen"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [activeNav, setActiveNav] = useState("today");
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <div className={styles.shell}>
      {!isFullscreen && <SideNav activeNav={activeNav} onNavChange={setActiveNav} />}
      {!isFullscreen && <TopBar />}

      <div className={isFullscreen ? styles.contentFullscreen : styles.content}>
        {children}
      </div>

      {!isFullscreen && <InputBar />}
      {!isFullscreen && <BottomNav activeNav={activeNav} onNavChange={setActiveNav} />}
    </div>
  );
}

