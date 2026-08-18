"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import OrbitPulse from "@/components/shared/OrbitPulse";
import styles from "./SideNav.module.css";

const NAV_ITEMS = [
  { id: "today",    label: "Today's Focus",  icon: "auto_awesome",      href: "/" },
  { id: "week",     label: "Weekly Flow",    icon: "insights",          href: "/week" },
  { id: "orbit",    label: "Personal Orbit", icon: "hub",               href: "/orbit" },
  { id: "calendar", label: "Calendar Sync",  icon: "sync",              href: "/calendar" },
];

interface SideNavProps {
  activeNav: string;
  onNavChange: (id: string) => void;
}

export default function SideNav({ activeNav, onNavChange }: SideNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className={styles.sidenav}>
      {/* Logo / Header */}
      <div className={styles.header}>
        <div className={`${styles.logoMark} pixel-border`}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--secondary)" }}>
            token
          </span>
        </div>
        <div>
          <h1 className={`${styles.logoText} font-headline-md`}>Orbit v1.0</h1>
          <div className={styles.logoSub}>
            <OrbitPulse size={8} />
            <span className="font-label-mono">Analog-Future Syncing</span>
          </div>
        </div>
      </div>

      <div className="pixel-divider-h" style={{ marginBottom: 24 }} />

      {/* Nav Links */}
      <ul className={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""} font-label-mono`}
                onClick={() => onNavChange(item.id)}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Bottom Actions */}
      <div className={styles.footer}>
        <div className="pixel-divider-h" style={{ marginBottom: 16 }} />
        <button className={`pixel-btn pixel-btn-primary ${styles.syncBtn}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sync</span>
          Sync Core
        </button>
        <div className={styles.footerLinks}>
          <button className={`${styles.footerLink} font-label-mono`}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>help</span>
            Support
          </button>
          <button className={`${styles.footerLink} ${styles.footerLinkDanger} font-label-mono`}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
            Log Out
          </button>
        </div>
      </div>
    </nav>
  );
}
