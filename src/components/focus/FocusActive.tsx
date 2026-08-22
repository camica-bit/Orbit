import { formatDuration } from "@/lib/time";
import styles from "./FocusActive.module.css";

type SessionState = "active" | "paused";

interface Task { title: string; estimatedMins: number; }

interface FocusActiveProps {
  task: Task;
  state: SessionState;
  elapsed: number;
  progress: number;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
}

export default function FocusActive({
  task, state, elapsed, progress, onPause, onResume, onComplete
}: FocusActiveProps) {
  const isPaused = state === "paused";
  // Past the estimate the session is in overtime, not "-3 min remaining".
  const minsLeft = Math.max(0, task.estimatedMins - Math.floor(elapsed / 60));
  const overtimeMins = Math.max(0, Math.floor(elapsed / 60) - task.estimatedMins);

  return (
    <div className={styles.wrap}>
      {/* Giant timer ring */}
      <div className={styles.timerRingWrap}>
        <svg className={styles.timerRing} viewBox="0 0 200 200">
          {/* Dithered track */}
          <circle cx="100" cy="100" r="88" className={styles.trackCircle} />
          {/* Progress arc */}
          <circle
            cx="100" cy="100" r="88"
            className={`${styles.progressCircle} ${isPaused ? styles.progressPaused : ""}`}
            style={{
              strokeDashoffset: 553 - (553 * progress) / 100,
              transition: "stroke-dashoffset 1s linear",
            }}
          />
          {/* Corner tick marks */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const angle = (pct / 100) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = 100 + 80 * Math.cos(rad);
            const y1 = 100 + 80 * Math.sin(rad);
            const x2 = 100 + 92 * Math.cos(rad);
            const y2 = 100 + 92 * Math.sin(rad);
            return <line key={pct} x1={x1} y1={y1} x2={x2} y2={y2} className={styles.tickMark} />;
          })}
        </svg>

        {/* Center content */}
        <div className={styles.timerCenter}>
          <span className={`${styles.elapsedTime} font-headline-xl`}>
            {formatDuration(elapsed)}
          </span>
          <span className={`${styles.taskName} font-label-mono`}>{task.title}</span>
          {isPaused && (
            <span className={`${styles.pausedLabel} font-label-mono anim-blink`}>PAUSED</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {isPaused ? (
          <button
            id="focus-resume-btn"
            className={`pixel-btn pixel-btn-primary ${styles.mainBtn}`}
            onClick={onResume}
            autoFocus
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            RESUME
          </button>
        ) : (
          <button
            id="focus-pause-btn"
            className={`pixel-btn ${styles.mainBtn}`}
            onClick={onPause}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>pause</span>
            PAUSE
          </button>
        )}

        <button
          id="focus-done-btn"
          className={`pixel-btn pixel-btn-secondary ${styles.doneBtn}`}
          onClick={onComplete}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          DONE
        </button>
      </div>

      {/* Progress label */}
      <p className={`${styles.progressLabel} font-label-mono`}>
        {Math.round(progress)}% complete ·{" "}
        {overtimeMins > 0 ? `${overtimeMins} min over estimate` : `${minsLeft} min remaining`}
      </p>
    </div>
  );
}
