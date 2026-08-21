"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "./TopBar.module.css";

export default function TopBar() {
  const router = useRouter();
  const { user, signOut, displayName } = useAuth();

  const handleProfileClick = async () => {
    if (user) {
      const confirmLogout = window.confirm(
        `Signed in as ${displayName} (${user.email}).\nLog out from Orbit?`
      );
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
      <button className={styles.menuBtn} aria-label="Home" onClick={() => router.push("/")}>
        <Image
          src="/Logo.png"
          alt="Orbit Logo"
          width={28}
          height={28}
          priority
          style={{ objectFit: "contain", display: "block" }}
        />
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
