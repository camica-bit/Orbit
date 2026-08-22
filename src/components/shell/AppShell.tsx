"use client";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import SideNav from "./SideNav";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import InputBar from "./InputBar";
import styles from "./AppShell.module.css";

// Pages that render as full-screen overlays and don't need shell chrome
const FULLSCREEN_ROUTES = ["/focus", "/listen", "/login", "/auth"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <AuthProvider>
      <div className={styles.shell}>
        {/* Without this, reaching the page content meant tabbing the whole
            sidebar on every navigation. Visible only when focused. */}
        {!isFullscreen && (
          <a href="#main-content" className={styles.skipLink}>
            Skip to content
          </a>
        )}

        {!isFullscreen && <SideNav />}
        {!isFullscreen && <TopBar />}

        {/* The fullscreen routes each render their own <main>, and a document
            may only have one. */}
        {isFullscreen ? (
          <div className={styles.contentFullscreen}>{children}</div>
        ) : (
          <main id="main-content" className={styles.content}>
            {children}
          </main>
        )}

        {!isFullscreen && <InputBar />}
        {!isFullscreen && <BottomNav />}
      </div>
    </AuthProvider>
  );
}
