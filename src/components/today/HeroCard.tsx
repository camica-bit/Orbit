import StatusChip from "@/components/shared/StatusChip";
import OrbitPulse from "@/components/shared/OrbitPulse";
import DitherDivider from "@/components/shared/DitherDivider";
import styles from "./HeroCard.module.css";

interface HeroCardProps {
  taskTitle: string;
  estimatedMins: number;
  aiRationale?: string;
  onStart: () => void;
  onDone: () => void;
  onSkip: () => void;
  onReschedule: () => void;
}

export default function HeroCard({
  taskTitle,
  estimatedMins,
  aiRationale,
  onStart,
  onDone,
  onSkip,
  onReschedule,
}: HeroCardProps) {
  return (
    <section className={`pixel-border corner-brackets ${styles.hero}`} aria-labelledby="hero-task-title">
      {/* Atmospheric overlay */}
      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.inner}>
        {/* Status bar */}
        <div className={styles.statusBar}>
          <OrbitPulse size={8} />
          <span className={`${styles.statusLabel} font-label-mono`}>Priority Protocol Active</span>
        </div>

        {/* Task title */}
        <h2
          id="hero-task-title"
          className={`${styles.taskTitle} font-headline-xl`}
        >
          {taskTitle}
        </h2>

        {/* Time estimate */}
        <p className={`${styles.estimate} font-body-lg`}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle" }}>
            timer
          </span>{" "}
          Estimated ~{estimatedMins} mins remaining
        </p>

        {/* AI rationale */}
        {aiRationale && (
          <div className={styles.rationale}>
            <div className={styles.rationaleBar} aria-hidden="true" />
            <p className={`${styles.rationaleText} font-body-md`}>
              &ldquo;{aiRationale}&rdquo;
            </p>
          </div>
        )}

        <DitherDivider style={{ margin: "20px 0" }} />

        {/* CTA buttons */}
        <div className={styles.actions}>
          <button
            id="hero-start-btn"
            className={`pixel-btn pixel-btn-primary ${styles.startBtn}`}
            onClick={onStart}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
            START
          </button>

          <button
            id="hero-done-btn"
            className={`pixel-btn ${styles.actionBtn}`}
            onClick={onDone}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done</span>
            Mark Done
          </button>

          <button
            id="hero-skip-btn"
            className={`pixel-btn ${styles.actionBtn} ${styles.actionBtnMuted}`}
            onClick={onSkip}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>skip_next</span>
            Skip
          </button>

          <button
            id="hero-reschedule-btn"
            className={`${styles.rescheduleLink} font-label-mono`}
            onClick={onReschedule}
          >
            Reschedule
          </button>
        </div>
      </div>
    </section>
  );
}
