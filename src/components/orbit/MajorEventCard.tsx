import OrbitPulse from "@/components/shared/OrbitPulse";
import styles from "./MajorEventCard.module.css";

export interface MajorEvent {
  id: string;
  title: string;
  description?: string;
  /** `null` when the event has no `event_date` yet. */
  daysLeft: number | null;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function MajorEventCard({ event }: { event: MajorEvent }) {
  return (
    <article className={`pixel-border ${styles.card}`} aria-label={`Major event: ${event.title}`}>
      <div className={styles.top}>
        <div className={styles.chipRow}>
          <span className={`${styles.chip} font-label-mono`}>
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>flight_takeoff</span>
            Major Event
          </span>
          <span className={`${styles.countdown} font-label-mono`}>
            {/* A dateless event used to read "T-Minus 0 Days", i.e. today. */}
            {event.daysLeft === null
              ? "No date set"
              : `T-Minus ${event.daysLeft} Days`}
          </span>
        </div>
        <div className={styles.cardActions}>
          {event.onEdit && (
            <button className={styles.iconBtn} onClick={event.onEdit} aria-label="Edit event">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
            </button>
          )}
          {/* Major events could be created and then never removed — the delete
              path existed for ordinary context items only. */}
          {event.onDelete && (
            <button className={styles.iconBtn} onClick={event.onDelete} aria-label="Remove event">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.bottom}>
        <div>
          <h3 className={`${styles.title} font-headline-lg`}>{event.title}</h3>
          {event.description && (
            <p className={`${styles.desc} font-body-md`}>{event.description}</p>
          )}
        </div>

        <div className={styles.actions}>
          <OrbitPulse size={16} />
          {event.onView && (
            <button className={`pixel-btn ${styles.viewBtn}`} onClick={event.onView}>
              View Plan
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
