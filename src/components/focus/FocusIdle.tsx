import styles from "./FocusIdle.module.css";

interface Task {
  title: string;
  estimatedMins: number;
  aiRationale?: string;
}

interface FocusIdleProps {
  task: Task;
  onStart: () => void;
}

export default function FocusIdle({ task, onStart }: FocusIdleProps) {
  return (
    <div className={styles.wrap}>
      <p className={`${styles.heading} font-headline-xl`}>WHAT&apos;S NEXT?</p>

      {/* Task card */}
      <div className={`pixel-border corner-brackets ${styles.card}`}>
        <div className="noise-overlay" />

        <div className={styles.cardInner}>
          <div className={styles.cardTop}>
            <div className={styles.objectiveRow}>
              <div className={`pixel-border ${styles.termIcon}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                  terminal
                </span>
              </div>
              <span className={`${styles.objectiveLabel} font-label-mono`}>Active Objective</span>
            </div>
            <div className={`pixel-border ${styles.timeChip}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--tertiary)" }}>timer</span>
              <span className={`${styles.timeText} font-label-mono`}>~{task.estimatedMins} MINS</span>
            </div>
          </div>

          <h2 className={`${styles.taskTitle} font-headline-lg`}>{task.title}</h2>

          {task.aiRationale && (
            <div className={styles.rationale}>
              <div className={styles.rationaleBar} />
              <p className={`${styles.rationaleText} font-body-md`}>&ldquo;{task.aiRationale}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Subtle radial glow */}
        <div className={styles.glow} aria-hidden="true" />
      </div>

      {/* START button */}
      <button
        id="focus-start-btn"
        className={`pixel-border-interactive ${styles.startBtn} font-headline-md`}
        onClick={onStart}
        autoFocus
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>
          play_arrow
        </span>
        START SESSION
        <div className={styles.startPulseWrap}>
          <div className="anim-pulse-glow" style={{
            width: 12, height: 12, borderRadius: "50%",
            backgroundColor: "var(--on-primary)", flexShrink: 0
          }} />
        </div>
      </button>
    </div>
  );
}
