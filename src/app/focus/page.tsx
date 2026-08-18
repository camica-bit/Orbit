"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Starfield from "@/components/focus/Starfield";
import FocusHeader from "@/components/focus/FocusHeader";
import FocusIdle from "@/components/focus/FocusIdle";
import FocusActive from "@/components/focus/FocusActive";
import FocusComplete from "@/components/focus/FocusComplete";
import styles from "./page.module.css";

type SessionState = "idle" | "active" | "paused" | "complete";

const TASK = {
  title: "Finish Python Functions",
  estimatedMins: 42,
  aiRationale: "Your highest-priority task before your 4 PM commitment.",
};

export default function FocusPage() {
  const router = useRouter();
  const [state, setState] = useState<SessionState>("idle");
  const [elapsed, setElapsed] = useState(0); // seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer logic
  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
  }, []);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Keyboard shortcut: Space = start/pause, Escape = exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (state === "idle") { setState("active"); startTimer(); }
        else if (state === "active") { setState("paused"); pauseTimer(); }
        else if (state === "paused") { setState("active"); startTimer(); }
      }
      if (e.code === "Escape" && state === "idle") router.push("/");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state, router, startTimer, pauseTimer]);

  const handleStart = () => { setState("active"); startTimer(); };
  const handlePause = () => { setState("paused"); pauseTimer(); };
  const handleResume = () => { setState("active"); startTimer(); };
  const handleComplete = () => { pauseTimer(); setState("complete"); };
  const handleExit = () => { pauseTimer(); router.push("/"); };
  const handleRestart = () => {
    setElapsed(0);
    setState("idle");
  };

  const progress = Math.min((elapsed / (TASK.estimatedMins * 60)) * 100, 100);

  return (
    <div className={styles.page}>
      <Starfield />
      <FocusHeader
        state={state}
        elapsed={elapsed}
        progress={progress}
        estimatedMins={TASK.estimatedMins}
        onExit={handleExit}
      />

      <main className={styles.main}>
        {state === "idle" && (
          <FocusIdle task={TASK} onStart={handleStart} />
        )}
        {(state === "active" || state === "paused") && (
          <FocusActive
            task={TASK}
            state={state}
            elapsed={elapsed}
            progress={progress}
            onPause={handlePause}
            onResume={handleResume}
            onComplete={handleComplete}
          />
        )}
        {state === "complete" && (
          <FocusComplete
            task={TASK}
            elapsed={elapsed}
            onRestart={handleRestart}
            onExit={handleExit}
          />
        )}
      </main>

      <div className={styles.keyHint}>
        <span className={`${styles.keyBadge} font-label-mono`}>SPACE</span>
        <span className="font-label-mono">
          {state === "idle" ? "Start" : state === "active" ? "Pause" : state === "paused" ? "Resume" : ""}
        </span>
        {state === "idle" && (
          <>
            <span className={`${styles.keyBadge} font-label-mono`}>ESC</span>
            <span className="font-label-mono">Exit</span>
          </>
        )}
      </div>
    </div>
  );
}
