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
        {/* The ‹ › arrows that used to sit here had `aria-label`s and no
            handlers. There is nothing for them to page: `.cardGrid` is a fixed
            3-column grid with no overflow and both views render every event. */}
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
