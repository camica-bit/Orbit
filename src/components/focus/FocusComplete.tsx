import { formatDuration } from "@/lib/time";
import styles from "./FocusComplete.module.css";

interface Task { title: string; estimatedMins: number; }

interface FocusCompleteProps {
  task: Task;
  elapsed: number;
  /** Consecutive-day streak as computed by the server on save. */
  streak: number;
  onRestart: () => void;
  onExit: () => void;
}

// A 20-second session on a 30-minute task is not 9000% efficient.
const EFFICIENCY_CAP = 200;

export default function FocusComplete({ task, elapsed, streak, onRestart, onExit }: FocusCompleteProps) {
  const efficiency =
    elapsed > 0
      ? Math.min(Math.round((task.estimatedMins * 60 / elapsed) * 100), EFFICIENCY_CAP)
      : 100;

  return (
    <div className={styles.wrap}>
      {/* Celebration */}
      <div className={styles.celebration}>
        <div className={`${styles.goldRing} anim-orbit-pulse`} aria-hidden="true" />
        <div className={styles.checkMark}>
          <span className="material-symbols-outlined" style={{ fontSize: 52, fontVariationSettings: "'FILL' 1", color: "var(--on-primary-fixed)" }}>
            check_circle
          </span>
        </div>
      </div>

      <div className={styles.textBlock}>
        <h2 className={`${styles.headline} font-headline-xl`}>Mission Complete.</h2>
        <p className={`${styles.taskTitle} font-body-lg`}>{task.title}</p>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={`pixel-border ${styles.stat}`}>
          <span className={`${styles.statNum} font-headline-lg`}>{formatDuration(elapsed)}</span>
          <span className={`${styles.statLabel} font-label-mono`}>Time Logged</span>
        </div>
        <div className={`pixel-border ${styles.stat}`}>
          <span className={`${styles.statNum} font-headline-lg`} style={{
            color: efficiency >= 100 ? "var(--orbit-gold)" : efficiency >= 80 ? "var(--secondary)" : "var(--on-surface)"
          }}>
            {efficiency}%
          </span>
          <span className={`${styles.statLabel} font-label-mono`}>Efficiency</span>
        </div>
        <div className={`pixel-border ${styles.stat}`}>
          <span className={`${styles.statNum} font-headline-lg`}>{streak}</span>
          <span className={`${styles.statLabel} font-label-mono`}>
            Day Streak
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={`pixel-btn pixel-btn-primary ${styles.exitBtn}`} onClick={onExit} autoFocus>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          Back to Today
        </button>
        <button className={`pixel-btn ${styles.restartBtn}`} onClick={onRestart}>
          <span className="material-symbols-outlined">refresh</span>
          Next Task
        </button>
      </div>
    </div>
  );
}
