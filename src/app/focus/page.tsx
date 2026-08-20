"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Starfield from "@/components/focus/Starfield";
import FocusHeader from "@/components/focus/FocusHeader";
import FocusIdle from "@/components/focus/FocusIdle";
import FocusActive from "@/components/focus/FocusActive";
import FocusComplete from "@/components/focus/FocusComplete";
import styles from "./page.module.css";

type SessionState = "idle" | "active" | "paused" | "complete";

const DEFAULT_TASK = {
  id: null as string | null,
  title: "Focused Work Session",
  estimatedMins: 30,
  aiRationale: "Your current priority task.",
};

export default function FocusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read task from URL params (passed from home page hero card)
  const task = {
    id: searchParams.get("taskId") ?? DEFAULT_TASK.id,
    title: searchParams.get("title") ?? DEFAULT_TASK.title,
    estimatedMins: parseInt(searchParams.get("mins") ?? String(DEFAULT_TASK.estimatedMins), 10),
    aiRationale: searchParams.get("rationale") ?? DEFAULT_TASK.aiRationale,
  };

  const [state, setState] = useState<SessionState>("idle");
  const [elapsed, setElapsed] = useState(0); // seconds
  const [streak, setStreak] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionSavedRef = useRef(false);

  // Load current streak from recent sessions
  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((json) => {
        const sessions = json.sessions ?? [];
        if (sessions.length > 0) {
          setStreak((sessions[0].streak ?? 0) + 1);
        } else {
          setStreak(1);
        }
      })
      .catch(() => setStreak(1));
  }, []);

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
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
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

  const handleComplete = async () => {
    pauseTimer();
    setState("complete");

    // Save session to Supabase (only once per completion)
    if (!sessionSavedRef.current) {
      sessionSavedRef.current = true;
      const actualMins = Math.round(elapsed / 60);
      const efficiencyScore =
        actualMins > 0
          ? Math.round((task.estimatedMins / actualMins) * 100)
          : 100;

      try {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_id: task.id,
            task_title: task.title,
            estimated_mins: task.estimatedMins,
            actual_mins: actualMins,
            efficiency_score: Math.min(efficiencyScore, 200),
            streak,
          }),
        });
      } catch {
        // Non-fatal: session stats didn't persist, but UX continues
      }
    }
  };

  const handleExit = () => { pauseTimer(); router.push("/"); };
  const handleRestart = () => {
    setElapsed(0);
    sessionSavedRef.current = false;
    setState("idle");
  };

  const progress = Math.min((elapsed / (task.estimatedMins * 60)) * 100, 100);

  return (
    <div className={styles.page}>
      <Starfield />
      <FocusHeader
        state={state}
        elapsed={elapsed}
        progress={progress}
        estimatedMins={task.estimatedMins}
        onExit={handleExit}
      />

      <main className={styles.main}>
        {state === "idle" && (
          <FocusIdle task={task} onStart={handleStart} />
        )}
        {(state === "active" || state === "paused") && (
          <FocusActive
            task={task}
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
            task={task}
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
