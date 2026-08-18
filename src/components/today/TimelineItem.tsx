import StatusChip from "@/components/shared/StatusChip";
import DitherDivider from "@/components/shared/DitherDivider";
import styles from "./TimelineItem.module.css";

export type EventType = "fixed" | "flexible" | "informational";

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  time?: string;
  icon?: string;
  meta?: string;
  onLockTime?: () => void;
}

const TYPE_CONFIG: Record<EventType, { chipVariant: "fixed" | "flex" | "info"; chipLabel: string }> = {
  fixed:        { chipVariant: "fixed", chipLabel: "Fixed" },
  flexible:     { chipVariant: "flex",  chipLabel: "Flex" },
  informational:{ chipVariant: "info",  chipLabel: "Info" },
};

interface TimelineItemProps {
  event: TimelineEvent;
  variant: "card" | "list";
}

export default function TimelineItem({ event, variant }: TimelineItemProps) {
  const config = TYPE_CONFIG[event.type];

  if (variant === "card") {
    return (
      <article
        className={`pixel-border ${styles.card} ${event.type === "informational" ? styles.cardInfo : ""}`}
        aria-label={event.title}
      >
        {/* Subtle texture for info cards */}
        {event.type === "informational" && (
          <div className={`dither-bg ${styles.infoOverlay}`} aria-hidden="true" />
        )}

        <div className={styles.cardTop}>
          <StatusChip label={config.chipLabel} variant={config.chipVariant} />
          {event.time && (
            <span className={`${styles.time} font-label-mono`}
              style={{ color: event.type === "fixed" ? "var(--primary)" : event.type === "flexible" ? "var(--secondary)" : "var(--on-surface-variant)" }}
            >
              {event.time}
            </span>
          )}
        </div>

        <h4 className={`${styles.cardTitle} font-headline-md`}>{event.title}</h4>

        {event.description && (
          <p className={`${styles.cardDesc} font-body-md`}>{event.description}</p>
        )}

        <DitherDivider style={{ margin: "12px 0" }} />

        <div className={styles.cardFooter}>
          {event.type === "flexible" && event.onLockTime ? (
            <button className={`${styles.lockBtn} font-label-mono`} onClick={event.onLockTime}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
              Lock Time
            </button>
          ) : (
            <div className={styles.metaRow}>
              {event.icon && (
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>
                  {event.icon}
                </span>
              )}
              {event.meta && (
                <span className={`${styles.meta} font-label-mono`}>{event.meta}</span>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }

  // List variant (mobile vertical timeline)
  return (
    <div className={`${styles.listItem} ${event.type === "informational" ? styles.listItemInfo : ""}`}>
      {/* Timeline node */}
      <div className={`${styles.node} pixel-border`}>
        <div
          className={styles.nodeDot}
          style={{
            backgroundColor:
              event.type === "fixed" ? "var(--on-surface)" :
              event.type === "flexible" ? "var(--secondary)" : "transparent",
          }}
        />
      </div>

      {/* Content */}
      <div className={`pixel-border ${styles.listCard}`}>
        <div className={styles.listCardTop}>
          <h4 className={`${styles.listTitle} font-body-lg`}>{event.title}</h4>
          {event.time && (
            <span className={`${styles.listTime} font-label-mono`}>{event.time}</span>
          )}
        </div>
        <div className={styles.listMeta}>
          {event.icon && (
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {event.icon}
            </span>
          )}
          <span className={`font-label-mono ${styles.listMetaText}`}>
            {event.type === "fixed" ? "Fixed Commitment" :
             event.type === "flexible" ? `Est. ${event.meta}` :
             "Informational"}
          </span>
        </div>
      </div>
    </div>
  );
}
