"use client";
import styles from "./TopBar.module.css";

export default function TopBar() {
  return (
    <header className={styles.topbar}>
      <button className={styles.menuBtn} aria-label="Menu">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          token
        </span>
      </button>

      <h1 className={`${styles.title} font-headline-md`}>ORBIT</h1>

      <button className={styles.profileBtn} aria-label="Profile">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
          account_circle
        </span>
      </button>
    </header>
  );
}
