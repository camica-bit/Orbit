import OrbitPulse from "@/components/shared/OrbitPulse";
import styles from "./MajorEventCard.module.css";

export interface MajorEvent {
  id: string;
  title: string;
  description?: string;
  daysLeft: number;
  onView?: () => void;
  onEdit?: () => void;
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
            T-Minus {event.daysLeft} Days
          </span>
        </div>
        {event.onEdit && (
          <button className={styles.editBtn} onClick={event.onEdit} aria-label="Edit event">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
          </button>
        )}
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
