"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import HeroCard from "@/components/today/HeroCard";
import Timeline from "@/components/today/Timeline";
import DitherDivider from "@/components/shared/DitherDivider";
import OrbitPulse from "@/components/shared/OrbitPulse";
import PixelDialog from "@/components/shared/PixelDialog";
import { TimelineEvent } from "@/components/today/TimelineItem";
import { useAuth } from "@/context/AuthContext";
import { clientTimeZone } from "@/lib/time";
import { useTasksChanged } from "@/lib/taskEvents";
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

/** The task whose time is being set, plus its current value. */
type TimeRequest = { id: string; current: string };

// Convert a DB task row into the TimelineEvent shape
function toTimelineEvent(
  task: DbTask,
  onLockTime: (req: TimeRequest) => void
): TimelineEvent {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    type: (task.type as TimelineEvent["type"]) ?? "flexible",
    time: task.scheduled_time ?? undefined,
    icon: task.icon ?? undefined,
    meta: task.meta ?? undefined,
    onLockTime: () => onLockTime({ id: task.id, current: task.scheduled_time ?? "" }),
  };
}

export default function TodayPage() {
  const router = useRouter();
  const { user, displayName } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [heroTask, setHeroTask] = useState<DbTask | null>(null);
  const [heroRationale, setHeroRationale] = useState("");
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [justDone, setJustDone] = useState<string | null>(null);
  const [timeRequest, setTimeRequest] = useState<TimeRequest | null>(null);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userDisplayName = displayName || "Pilot";

  const load = useCallback(async () => {
    // Blanking to "loading" also stops the previous user's tasks staying on
    // screen while `user` changes underneath this effect.
    setLoadState("loading");
    try {
      const [nextRes, tasksRes] = await Promise.all([
        // The ranking is clock- and date-sensitive, so it needs the viewer's
        // zone rather than the deployment region's.
        fetch(`/api/ai/whats-next?tz=${encodeURIComponent(clientTimeZone())}`),
        fetch("/api/tasks"),
      ]);

      // A 500 used to fall through to the "no missions queued" empty state,
      // which tells the user their tasks are gone.
      if (!nextRes.ok || !tasksRes.ok) {
        throw new Error(`load failed: ${nextRes.status}/${tasksRes.status}`);
      }

      const [nextJson, tasksJson] = await Promise.all([nextRes.json(), tasksRes.json()]);
      const tasks: DbTask[] = tasksJson.tasks ?? [];
      const hero: DbTask | null = nextJson.task ?? null;

      setHeroTask(hero);
      setHeroRationale(nextJson.rationale ?? hero?.ai_rationale ?? "");
      setTimelineEvents(
        tasks.filter((t) => t.id !== hero?.id).map((t) => toTimelineEvent(t, setTimeRequest))
      );
      setLoadState(hero || tasks.length > 0 ? "ready" : "empty");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, user]);

  // The input bar and /listen create tasks from outside this tree, and
  // `router.refresh()` cannot reach a client-side fetch.
  useTasksChanged(load);

  const submitTime = async (value: string) => {
    const target = timeRequest;
    setTimeRequest(null);
    if (!target || !value) return;
    // The server normalises the clock string; a second parser here would drift.
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: target.id, scheduled_time: value, type: "fixed" }),
    });
    await load();
  };

  const setStatus = async (status: "completed" | "skipped") => {
    if (!heroTask) return;
    const finished = heroTask.title;
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: heroTask.id, status }),
    });
    if (status === "completed") setJustDone(finished);
    await load(); // re-rank
  };

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const statusLine =
    loadState === "loading"
      ? "Orbit is computing your path..."
      : loadState === "ready"
      ? "The path is clear."
      : loadState === "empty"
      ? "No active missions. Tell Orbit what is on your mind."
      : // Nothing retries on its own — the Retry button does.
        "Could not reach Orbit.";

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
            <p className={`${styles.greetingSub} font-body-lg`}>{statusLine}</p>
          </div>
        </div>
        <div className={styles.sysDate}>
          <span className="font-label-mono">SYS_DATE: {today}</span>
        </div>
      </header>

      {/* Completion notice — inline, so the recalculated day stays on screen */}
      {justDone && (
        <div className={`pixel-border ${styles.doneBanner}`} role="status">
          <OrbitPulse size={12} gold />
          <span className={`${styles.doneBannerText} font-body-md`}>
            {justDone} — complete. Orbit recalculated your path.
          </span>
          <button
            className={`pixel-btn ${styles.doneDismiss}`}
            onClick={() => setJustDone(null)}
            aria-label="Dismiss completion notice"
          >
            OK
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loadState === "loading" && (
        <div className={styles.skeleton} aria-busy="true">
          <div className={`${styles.skeletonHero} pixel-border anim-orbit-pulse`} />
          <div className={`${styles.skeletonRow} pixel-border`} style={{ animationDelay: "0.1s" }} />
          <div className={`${styles.skeletonRow} pixel-border`} style={{ animationDelay: "0.2s" }} />
        </div>
      )}

      {loadState === "ready" && (
        <>
          {heroTask && (
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
              onDone={() => setStatus("completed")}
              onSkip={() => setStatus("skipped")}
              // Was `() => {}` — a button that rendered, hovered and did nothing.
              onReschedule={() =>
                setTimeRequest({ id: heroTask.id, current: heroTask.scheduled_time ?? "" })
              }
            />
          )}

          {timelineEvents.length > 0 && (
            <>
              {heroTask && <DitherDivider style={{ margin: "40px 0" }} />}
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

      {/* Load failure — distinct from an empty day */}
      {loadState === "error" && (
        <div className={styles.emptyState} role="alert">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 32, color: "var(--error)" }}
            aria-hidden="true"
          >
            wifi_off
          </span>
          <p className={`${styles.emptyText} font-body-lg`}>
            Could not reach the Orbit backend. Nothing has been lost.
          </p>
          <button className="pixel-btn pixel-btn-primary" onClick={load}>
            Retry
          </button>
        </div>
      )}

      <PixelDialog
        open={timeRequest !== null}
        title="Lock this task to a time"
        message="Examples: 2 PM, 14:30, noon."
        defaultValue={timeRequest?.current ?? ""}
        placeholder="2 PM"
        confirmLabel="Lock time"
        onConfirm={submitTime}
        onCancel={() => setTimeRequest(null)}
      />
    </div>
  );
}
