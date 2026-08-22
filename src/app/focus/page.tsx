"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Starfield from "@/components/focus/Starfield";
import FocusHeader from "@/components/focus/FocusHeader";
import FocusIdle from "@/components/focus/FocusIdle";
import FocusActive from "@/components/focus/FocusActive";
import FocusComplete from "@/components/focus/FocusComplete";
import OrbitPulse from "@/components/shared/OrbitPulse";
import { clientTimeZone } from "@/lib/time";
import styles from "./page.module.css";

type SessionState = "idle" | "active" | "paused" | "complete";

type FocusTask = {
  id: string | null;
  title: string;
  estimatedMins: number;
  aiRationale: string;
};

const DEFAULT_TASK: FocusTask = {
  id: null,
  title: "Focused Work Session",
  estimatedMins: 30,
  aiRationale: "Your current priority task.",
};

// An in-progress session survives a refresh, but not a stale one from yesterday.
const RESUME_KEY = "orbit:focus-session";
const RESUME_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type Resumable = {
  task: FocusTask;
  bankedSeconds: number;
  runningSince: number | null; // epoch ms, null while paused
  savedAt: number;
};

function readResumable(): Resumable | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Resumable;
    if (!saved?.task?.title || Date.now() - saved.savedAt > RESUME_MAX_AGE_MS) {
      localStorage.removeItem(RESUME_KEY);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

function FocusSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramTaskId = searchParams.get("taskId");
  const paramTitle = searchParams.get("title");

  const [task, setTask] = useState<FocusTask>(() => ({
    id: paramTaskId ?? DEFAULT_TASK.id,
    title: paramTitle ?? DEFAULT_TASK.title,
    estimatedMins:
      parseInt(searchParams.get("mins") ?? String(DEFAULT_TASK.estimatedMins), 10) ||
      DEFAULT_TASK.estimatedMins,
    aiRationale: searchParams.get("rationale") ?? DEFAULT_TASK.aiRationale,
  }));

  const [state, setState] = useState<SessionState>("idle");
  const [elapsed, setElapsed] = useState(0); // seconds
  const [streak, setStreak] = useState(0);
  const [restored, setRestored] = useState(false);

  // Wall-clock stamps, not a counter: `setInterval` is throttled in a background
  // tab, so incrementing per tick logged 14 minutes for a 25-minute session.
  const bankedRef = useRef(0); // seconds completed before the current run
  const runningSinceRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionSavedRef = useRef(false);

  const readClock = useCallback(() => {
    const running = runningSinceRef.current;
    return Math.floor(bankedRef.current + (running ? (Date.now() - running) / 1000 : 0));
  }, []);

  const startTicking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    // The interval only nudges a re-render; the value itself comes from the clock.
    intervalRef.current = setInterval(() => setElapsed(readClock()), 1000);
  }, [readClock]);

  const startTimer = useCallback(() => {
    runningSinceRef.current = Date.now();
    setElapsed(readClock());
    startTicking();
  }, [readClock, startTicking]);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    bankedRef.current = readClock();
    runningSinceRef.current = null;
    setElapsed(bankedRef.current);
  }, [readClock]);

  // Restore an interrupted session, or fall back to the real next task when
  // /focus is opened directly with no params.
  useEffect(() => {
    let cancelled = false;

    const saved = readResumable();
    if (saved && (!paramTaskId || paramTaskId === saved.task.id)) {
      setTask(saved.task);
      bankedRef.current = saved.bankedSeconds;
      runningSinceRef.current = saved.runningSince;
      setElapsed(
        Math.floor(
          saved.bankedSeconds +
            (saved.runningSince ? (Date.now() - saved.runningSince) / 1000 : 0)
        )
      );
      setState(saved.runningSince ? "active" : "paused");
      if (saved.runningSince) startTicking();
      setRestored(true);
      return;
    }

    if (!paramTaskId && !paramTitle) {
      fetch(`/api/ai/whats-next?tz=${encodeURIComponent(clientTimeZone())}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (cancelled || !json?.task) return;
          setTask({
            id: json.task.id,
            title: json.task.title,
            estimatedMins: json.task.estimated_mins ?? DEFAULT_TASK.estimatedMins,
            aiRationale: json.rationale ?? DEFAULT_TASK.aiRationale,
          });
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
    // Params are fixed for the life of this mount; restore must run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load current streak from recent sessions (the server owns the arithmetic).
  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setStreak(json?.sessions?.[0]?.streak ?? 0))
      .catch(() => {});
  }, []);

  // Persist whenever the run/pause boundary moves, so a refresh resumes here.
  useEffect(() => {
    if (state === "idle" || state === "complete") {
      localStorage.removeItem(RESUME_KEY);
      return;
    }
    const payload: Resumable = {
      task,
      bankedSeconds: bankedRef.current,
      runningSince: runningSinceRef.current,
      savedAt: Date.now(),
    };
    localStorage.setItem(RESUME_KEY, JSON.stringify(payload));
  }, [state, task]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleStart = useCallback(() => { setState("active"); startTimer(); }, [startTimer]);
  const handlePause = useCallback(() => { pauseTimer(); setState("paused"); }, [pauseTimer]);
  const handleResume = handleStart;

  // Keyboard shortcut: Space = start/pause, Escape = exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (state === "idle" || state === "paused") handleStart();
        else if (state === "active") handlePause();
      }
      if (e.code === "Escape" && state === "idle") router.push("/");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state, router, handleStart, handlePause]);

  const handleComplete = async () => {
    pauseTimer();
    const finalSeconds = bankedRef.current;
    setState("complete");

    // Save session to Supabase (only once per completion)
    if (!sessionSavedRef.current) {
      sessionSavedRef.current = true;
      const actualMins = Math.max(1, Math.round(finalSeconds / 60));

      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_id: task.id,
            task_title: task.title,
            estimated_mins: task.estimatedMins,
            actual_mins: actualMins,
            // Same clamp the completion screen shows, so stats and UI agree.
            efficiency_score: Math.min(Math.round((task.estimatedMins / actualMins) * 100), 200),
            timeZone: clientTimeZone(),
          }),
        });
        const json = await res.json();
        // The server derives the streak from distinct completion days.
        if (typeof json?.session?.streak === "number") setStreak(json.session.streak);
      } catch {
        // Non-fatal: session stats didn't persist, but UX continues
      }
    }
  };

  const handleExit = () => {
    pauseTimer();
    localStorage.removeItem(RESUME_KEY);
    router.push("/");
  };

  const handleRestart = () => {
    bankedRef.current = 0;
    runningSinceRef.current = null;
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
            streak={streak}
            onRestart={handleRestart}
            onExit={handleExit}
          />
        )}
      </main>

      <div className={styles.keyHint}>
        {restored && state !== "complete" && (
          <span className={`${styles.keyBadge} font-label-mono`}>RESUMED</span>
        )}
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

export default function FocusPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Starfield />
          <OrbitPulse size={24} gold />
        </div>
      }
    >
      <FocusSession />
    </Suspense>
  );
}
