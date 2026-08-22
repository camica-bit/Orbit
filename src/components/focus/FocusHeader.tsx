"use client";
import { formatDuration } from "@/lib/time";
import styles from "./FocusHeader.module.css";

type SessionState = "idle" | "active" | "paused" | "complete";

interface FocusHeaderProps {
  state: SessionState;
  elapsed: number;
  progress: number;
  estimatedMins: number;
  onExit: () => void;
}

export default function FocusHeader({ state, elapsed, progress, estimatedMins, onExit }: FocusHeaderProps) {
  return (
    <header className={styles.header}>
      {/* Left: exit */}
      <button className={`${styles.exitBtn} font-label-mono`} onClick={onExit}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
        EXIT FOCUS
      </button>

      {/* Center: session info */}
      <div className={styles.center}>
        <span className={`${styles.sessionLabel} font-label-mono`}>
          {state === "idle" && "FOCUS PROTOCOL"}
          {state === "active" && "SESSION ACTIVE"}
          {state === "paused" && "SESSION PAUSED"}
          {state === "complete" && "SESSION COMPLETE"}
        </span>

        {state !== "idle" && (
          <div className={styles.timerWrap}>
            <span className={`${styles.timer} font-headline-md`}>{formatDuration(elapsed)}</span>
            <span className={`${styles.timerEst} font-label-mono`}>/ {estimatedMins}:00</span>
          </div>
        )}
      </div>

      {/* Right: ORBIT brand */}
      <div className={`${styles.brand} font-label-mono`}>ORBIT</div>

      {/* Progress bar — full width at bottom of header */}
      {state !== "idle" && (
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${state === "complete" ? styles.progressComplete : ""}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </header>
  );
}
