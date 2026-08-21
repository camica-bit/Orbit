"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import HeroCard from "@/components/today/HeroCard";
import Timeline from "@/components/today/Timeline";
import DitherDivider from "@/components/shared/DitherDivider";
import OrbitPulse from "@/components/shared/OrbitPulse";
import { TimelineEvent } from "@/components/today/TimelineItem";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

type DbTask = {
  id: string;
  title: string;
  description: string | null;
  estimated_mins: number | null;
  type: string | null;
  status: string | null;
  scheduled_time: string | null;
  icon: string | null;
  meta: string | null;
  ai_rationale: string | null;
  priority: number | null;
};

type LoadState = "loading" | "ready" | "empty" | "error";

// Convert a DB task row into the TimelineEvent shape
function toTimelineEvent(
  task: DbTask,
  onLockTime?: (id: string, time: string) => void
): TimelineEvent {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    type: (task.type as TimelineEvent["type"]) ?? "flexible",
    time: task.scheduled_time ?? undefined,
    icon: task.icon ?? undefined,
    meta: task.meta ?? undefined,
    onLockTime:
      task.type === "flexible" && onLockTime
        ? () => onLockTime(task.id, task.scheduled_time ?? "")
        : undefined,
  };
}

export default function TodayPage() {
  const router = useRouter();
  const { user, displayName } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [heroTask, setHeroTask] = useState<DbTask | null>(null);
  const [heroRationale, setHeroRationale] = useState<string>("");
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [taskDone, setTaskDone] = useState(false);
  const [allTasks, setAllTasks] = useState<DbTask[]>([]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userDisplayName = displayName || "Pilot";

  const loadRef = useRef<() => Promise<void>>(async () => {});

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const [whatsNextRes, tasksRes] = await Promise.all([
        fetch("/api/ai/whats-next"),
        fetch("/api/tasks"),
      ]);

      const whatsNextJson = await whatsNextRes.json();
      const tasksJson = await tasksRes.json();

      const tasks: DbTask[] = tasksJson.tasks ?? [];
      const hero: DbTask | null = whatsNextJson.task ?? null;
      const rationale: string =
        whatsNextJson.rationale ?? hero?.ai_rationale ?? "";

      const timeline = tasks
        .filter((t) => t.id !== hero?.id)
        .map((t) => toTimelineEvent(t, (id, cur) => handleLockTime(id, cur)));

      setAllTasks(tasks);
      setHeroTask(hero);
      setHeroRationale(rationale);
      setTimelineEvents(timeline);
      setLoadState(hero ? "ready" : "empty");
    } catch {
      setLoadState("error");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep loadRef in sync so handleLockTime can call the latest load
  useEffect(() => { loadRef.current = load; }, [load]);

  const handleLockTime = useCallback(async (id: string, currentTime: string) => {
    const newTime = window.prompt(
      "Lock this task to a specific time (e.g. 2 PM, 14:30):",
      currentTime
    );
    if (!newTime?.trim()) return;
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, scheduled_time: newTime.trim(), type: "fixed" }),
    });
    await loadRef.current();
  }, []);

  useEffect(() => {
    load();
  }, [load, user]);

  const handleDone = async () => {
    if (!heroTask) return;
    // Mark task completed via API
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: heroTask.id, status: "completed" }),
    });
    setTaskDone(true);
  };

  const handleSkip = async () => {
    if (!heroTask) return;
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: heroTask.id, status: "skipped" }),
    });
    await load(); // re-rank
  };

  // ── Task Done state ────────────────────────────────────────────────────────
  if (taskDone) {
    return (
      <div className={styles.done}>
        <OrbitPulse size={24} gold />
        <h2 className={`${styles.doneTitle} font-headline-lg`}>
          Task Complete. Orbit is recalculating...
        </h2>
        <button
          className="pixel-btn pixel-btn-primary"
          onClick={() => {
            setTaskDone(false);
            load();
          }}
        >
          Next Mission
        </button>
      </div>
    );
  }

  const timeOfDay =
    new Date().getHours() < 12
      ? "morning"
      : new Date().getHours() < 17
      ? "afternoon"
      : "evening";

  return (
    <div className={styles.page}>
      {/* Greeting */}
      <header className={styles.greeting}>
        <div>
          <h2 className={`${styles.greetingTitle} font-headline-lg`}>
            Good {timeOfDay}, {userDisplayName}.
          </h2>
          <div className={styles.greetingSubrow}>
            <OrbitPulse size={10} />
            <p className={`${styles.greetingSub} font-body-lg`}>
              {loadState === "loading"
                ? "Orbit is computing your path..."
                : loadState === "ready"
                ? "The path is clear."
                : loadState === "empty"
                ? "No active missions. Tell Orbit what is on your mind."
                : "Connection issue — retrying..."}
            </p>
          </div>
        </div>
        <div className={styles.sysDate}>
          <span className="font-label-mono">SYS_DATE: {today}</span>
        </div>
      </header>

      {/* Loading skeleton */}
      {loadState === "loading" && (
        <div className={styles.skeleton} aria-busy="true">
          <div className={`${styles.skeletonHero} pixel-border anim-orbit-pulse`} />
          <div className={`${styles.skeletonRow} pixel-border`} style={{ animationDelay: "0.1s" }} />
          <div className={`${styles.skeletonRow} pixel-border`} style={{ animationDelay: "0.2s" }} />
        </div>
      )}

      {/* Hero: What's Next */}
      {loadState === "ready" && heroTask && (
        <>
          <HeroCard
            taskTitle={heroTask.title}
            estimatedMins={heroTask.estimated_mins ?? 30}
            scheduledTime={heroTask.scheduled_time}
            aiRationale={heroRationale}
            onStart={() =>
              router.push(
                `/focus?taskId=${heroTask.id}&title=${encodeURIComponent(heroTask.title)}&mins=${heroTask.estimated_mins ?? 30}`
              )
            }
            onDone={handleDone}
            onSkip={handleSkip}
            onReschedule={() => {}}
          />

          {timelineEvents.length > 0 && (
            <>
              <DitherDivider style={{ margin: "40px 0" }} />
              <Timeline events={timelineEvents} />
            </>
          )}
        </>
      )}

      {/* Empty state */}
      {loadState === "empty" && (
        <div className={styles.emptyState}>
          <OrbitPulse size={16} />
          <p className={`${styles.emptyText} font-body-lg`}>
            No missions queued. Use the input bar below to tell Orbit what you
            need to do today.
          </p>
        </div>
      )}

      {/* Error state */}
      {loadState === "error" && (
        <div className={styles.emptyState}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 32, color: "var(--error)" }}
          >
            wifi_off
          </span>
          <p className={`${styles.emptyText} font-body-lg`}>
            Could not connect to Orbit backend.
          </p>
          <button className="pixel-btn pixel-btn-primary" onClick={load}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
