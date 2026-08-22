"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import OrbitPulse from "@/components/shared/OrbitPulse";
import { useAuth } from "@/context/AuthContext";
import { NAV_ITEMS, isActiveHref } from "./navItems";
import styles from "./SideNav.module.css";

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, displayName } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const userDisplayName = displayName || "Pilot";

  return (
    <nav className={styles.sidenav}>
      {/* Logo / Header */}
      <div className={styles.header}>
        <Image
          src="/Logo.png"
          alt="Orbit Logo"
          width={40}
          height={40}
          priority
          style={{ objectFit: "contain", flexShrink: 0 }}
        />
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
          const active = isActiveHref(pathname, item.href);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""} font-label-mono`}
                // BottomNav already announced the current page; desktop didn't.
                aria-current={active ? "page" : undefined}
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
        {/* User identification badge */}
        {user && (
          <div className={`pixel-border ${styles.userBadge}`}>
            <div className={styles.userDot} />
            <div className={styles.userInfo}>
              <span className={`${styles.userPrefix} font-label-mono`}>AUTH ID</span>
              <span className={`${styles.userEmail} font-label-mono`} title={user.email}>
                {userDisplayName}
              </span>
            </div>
          </div>
        )}

        <div className="pixel-divider-h" style={{ marginBottom: 16, marginTop: user ? 12 : 0 }} />

        {/* "Sync Core" and "Support" lived here with no handler at all — a
            primary-styled button that did nothing on click. Calendar sync is
            reachable from the nav above; there is no support destination yet. */}
        <div className={styles.footerLinks}>
          {user ? (
            <button
              id="sidenav-logout-btn"
              onClick={handleSignOut}
              className={`${styles.footerLink} ${styles.footerLinkDanger} font-label-mono`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
              Log Out
            </button>
          ) : (
            <Link
              href="/login"
              className={`${styles.footerLink} font-label-mono`}
              style={{ color: "var(--secondary)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
