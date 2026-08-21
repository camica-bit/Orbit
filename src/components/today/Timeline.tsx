import TimelineItem, { TimelineEvent } from "./TimelineItem";
import styles from "./Timeline.module.css";

interface TimelineProps {
  events: TimelineEvent[];
}

export default function Timeline({ events }: TimelineProps) {
  return (
    <section aria-label="Path ahead timeline">
      <div className={styles.header}>
        <h3 className={`${styles.title} font-headline-lg`}>The Path Ahead</h3>
        <div className={styles.controls}>
          <button className={`pixel-btn ${styles.arrowBtn}`} aria-label="Previous">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span>
          </button>
          <button className={`pixel-btn ${styles.arrowBtn}`} aria-label="Next">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* Desktop: card grid */}
      <div className={styles.cardGrid}>
        {events.map((event) => (
          <TimelineItem key={event.id} event={event} variant="card" />
        ))}
      </div>

      {/* Mobile: vertical timeline */}
      <div className={styles.verticalTimeline}>
        <div className={styles.timelineLine} aria-hidden="true" />
        {events.map((event) => (
          <TimelineItem key={event.id} event={event} variant="list" />
        ))}
      </div>
    </section>
  );
}
