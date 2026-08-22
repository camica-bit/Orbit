import Link from "next/link";
import DitherDivider from "@/components/shared/DitherDivider";
import OrbitPulse from "@/components/shared/OrbitPulse";
import styles from "./page.module.css";

/**
 * Reachable by URL only — deliberately absent from `navItems.ts`.
 *
 * This screen used to render three provider cards with "Connect" buttons that
 * had no `onClick`, above a panel promising two-way sync "in Phase 4". Nothing
 * is wired to a calendar provider, so every one of those was a dead control
 * dressed as a feature. The route stays so an old bookmark lands somewhere
 * truthful instead of a 404, and it now states the limitation plainly — a user
 * who believes Orbit can see their meetings will trust a plan that silently
 * omits them.
 */
export const metadata = {
  title: "Calendar Sync — not yet available",
};

export default function CalendarPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <OrbitPulse size={12} />
          <h1 className={`${styles.title} font-headline-xl`}>Calendar Sync</h1>
        </div>
        <p className={`${styles.subtitle} font-body-lg`}>
          Orbit cannot see your external calendars yet.
        </p>
        <DitherDivider style={{ marginTop: 20 }} />
      </header>

      <div className={`pixel-border ${styles.notice}`}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 20, color: "var(--secondary)" }}
          aria-hidden="true"
        >
          construction
        </span>
        <div>
          <p className={`${styles.noticeTitle} font-label-mono`}>Not connected</p>
          <p className={`${styles.noticeBody} font-body-md`}>
            There is no integration with Google Calendar, Apple Calendar, or Outlook —
            not a disconnected one, an unbuilt one. Orbit plans your day only from what
            you tell it directly, so anything living on another calendar is invisible to
            it. If a meeting matters, add it as a task.
          </p>
          <p className={styles.noticeBack}>
            <Link href="/" className="font-label-mono">
              ← Back to Today&rsquo;s Focus
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
