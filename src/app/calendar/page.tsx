import DitherDivider from "@/components/shared/DitherDivider";
import OrbitPulse from "@/components/shared/OrbitPulse";
import styles from "./page.module.css";

export default function CalendarPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <OrbitPulse size={12} />
          <h1 className={`${styles.title} font-headline-xl`}>Calendar Sync</h1>
        </div>
        <p className={`${styles.subtitle} font-body-lg`}>
          Connect external calendars to give Orbit a complete picture of your time.
        </p>
        <DitherDivider style={{ marginTop: 20 }} />
      </header>

      {/* Sync sources */}
      <div className={styles.sources}>
        {[
          { name: "Google Calendar", icon: "event", status: "Connect", connected: false },
          { name: "Apple Calendar",  icon: "calendar_month", status: "Connect", connected: false },
          { name: "Outlook",         icon: "mail", status: "Connect", connected: false },
        ].map((src) => (
          <div key={src.name} className={`pixel-border ${styles.sourceCard}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--on-surface-variant)" }}>
              {src.icon}
            </span>
            <div className={styles.sourceInfo}>
              <span className={`${styles.sourceName} font-body-lg`}>{src.name}</span>
              <span className={`${styles.sourceStatus} font-label-mono`}>
                {src.connected ? "SYNCED" : "NOT CONNECTED"}
              </span>
            </div>
            <button className={`pixel-btn ${src.connected ? "" : "pixel-btn-primary"} ${styles.sourceBtn}`}>
              {src.status}
            </button>
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <div className={`pixel-border ${styles.comingSoon}`}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--secondary)" }}>
          construction
        </span>
        <div>
          <p className={`${styles.csTitle} font-label-mono`}>Calendar Sync — Phase 4</p>
          <p className={`${styles.csSub} font-body-md`}>
            Two-way Google Calendar sync, conflict detection, and AI scheduling intelligence launching in Phase 4.
          </p>
        </div>
      </div>
    </div>
  );
}
