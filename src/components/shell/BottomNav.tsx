"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

const TABS = [
  { id: "today",    label: "Today",    icon: "target",             href: "/" },
  { id: "week",     label: "Week",     icon: "calendar_view_week", href: "/week" },
  { id: "orbit",    label: "Context",  icon: "psychology_alt",     href: "/orbit" },
  { id: "calendar", label: "Calendar", icon: "calendar_month",     href: "/calendar" },
];

interface BottomNavProps {
  activeNav: string;
  onNavChange: (id: string) => void;
}

export default function BottomNav({ activeNav, onNavChange }: BottomNavProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className={styles.bottomnav} aria-label="Mobile navigation">
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`${styles.tab} ${active ? styles.tabActive : ""}`}
            onClick={() => onNavChange(tab.id)}
            aria-current={active ? "page" : undefined}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span className={`${styles.tabLabel} font-label-mono`}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
