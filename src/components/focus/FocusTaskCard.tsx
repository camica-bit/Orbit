import Link from "next/link";
import styles from "./FocusTaskCard.module.css";

interface FocusTaskCardProps {
  taskTitle: string;
  estimatedMins: number;
  aiRationale?: string;
  onStart: () => void;
}

export default function FocusTaskCard({
  taskTitle,
  estimatedMins,
  aiRationale,
  onStart,
}: FocusTaskCardProps) {
  return (
    <div className={styles.wrap}>
      {/* Exit affordance */}
      <div className={styles.exitWrap}>
        <Link href="/" className={`${styles.exitBtn} font-label-mono`}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          EXIT FOCUS
        </Link>
      </div>

      {/* Main heading */}
      <h1 className={`${styles.heading} font-headline-xl`}>WHAT&apos;S NEXT?</h1>

      {/* Task card */}
      <div className={`pixel-border ${styles.card}`}>
        {/* Noise overlay */}
        <div className="noise-overlay" />

        <div className={styles.cardInner}>
          {/* Header row */}
          <div className={styles.cardTop}>
            <div className={styles.objectiveLabel}>
              <div className={`pixel-border ${styles.termIcon}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                  terminal
                </span>
              </div>
              <span className={`${styles.objectiveText} font-label-mono`}>Active Objective</span>
            </div>
            <div className={`pixel-border ${styles.timerChip}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--tertiary)" }}>timer</span>
              <span className={`${styles.timerText} font-label-mono`}>~{estimatedMins} MINS</span>
            </div>
          </div>

          {/* Task title */}
          <h2 className={`${styles.taskTitle} font-headline-lg`}>{taskTitle}</h2>

          {/* AI rationale */}
          {aiRationale && (
            <div className={styles.rationale}>
              <div className={styles.rationaleBar} />
              <p className={`${styles.rationaleText} font-body-md`}>
                &ldquo;{aiRationale}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Glow effect */}
        <div className={styles.glow} aria-hidden="true" />
      </div>

      {/* START button */}
      <button
        id="focus-start-btn"
        className={`pixel-border-interactive ${styles.startBtn} font-headline-md`}
        onClick={onStart}
      >
        START
        <div className={styles.startPulse}>
          <div className={`${styles.startPulseInner} anim-orbit-pulse`} />
        </div>
        <span className="material-symbols-outlined" style={{ transition: "transform 0.2s" }}>
          arrow_forward
        </span>
      </button>

      {/* Footer label */}
      <p className={`${styles.footer} font-label-mono`}>
        ORBIT // FOCUS PROTOCOL ACTIVATED
      </p>
    </div>
  );
}
