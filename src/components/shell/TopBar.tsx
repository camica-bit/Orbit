"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "./TopBar.module.css";

export default function TopBar() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleProfileClick = async () => {
    if (user) {
      const confirmLogout = window.confirm(`Signed in as ${user.email}.\nLog out from Orbit?`);
      if (confirmLogout) {
        await signOut();
        router.push("/login");
        router.refresh();
      }
    } else {
      router.push("/login");
    }
  };

  return (
    <header className={styles.topbar}>
      <button className={styles.menuBtn} aria-label="Menu" onClick={() => router.push("/")}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          token
        </span>
      </button>

      <h1 className={`${styles.title} font-headline-md`}>ORBIT</h1>

      <button
        className={styles.profileBtn}
        onClick={handleProfileClick}
        aria-label={user ? `Profile: ${user.email}` : "Sign In"}
        title={user ? `Logged in as ${user.email}` : "Sign In"}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontVariationSettings: user ? "'FILL' 1" : "'FILL' 0",
            color: user ? "var(--secondary)" : "var(--primary)",
          }}
        >
          account_circle
        </span>
      </button>
    </header>
  );
}
