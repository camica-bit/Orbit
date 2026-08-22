"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActiveHref } from "./navItems";
import styles from "./BottomNav.module.css";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomnav} aria-label="Mobile navigation">
      {NAV_ITEMS.map((tab) => {
        const active = isActiveHref(pathname, tab.href);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`${styles.tab} ${active ? styles.tabActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span className={`${styles.tabLabel} font-label-mono`}>{tab.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
