"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import HeroCard from "@/components/today/HeroCard";
import Timeline from "@/components/today/Timeline";
import DitherDivider from "@/components/shared/DitherDivider";
import OrbitPulse from "@/components/shared/OrbitPulse";
import { TimelineEvent } from "@/components/today/TimelineItem";
import styles from "./page.module.css";

// Static seed data (will be wired to AI/DB in Phase 3)
const CURRENT_TASK = {
  title: "Finish Python Functions",
  estimatedMins: 45,
  aiRationale: "Best thing to do before your 4 PM commitment.",
};

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "1",
    title: "Data Structures Lecture",
    description: "Room 302, Engineering Building. Focus on Hash Maps.",
    type: "fixed",
    time: "10:00 AM",
    icon: "location_on",
    meta: "Campus",
  },
  {
    id: "2",
    title: "Gym Session",
    description: "Upper body routine. 1 hour expected.",
    type: "flexible",
    time: "Afternoon",
    icon: "fitness_center",
    meta: "1.5 hrs",
    onLockTime: () => alert("Lock time coming in Phase 3"),
  },
  {
    id: "3",
    title: "F1 Race: Monaco GP",
    description: "Lights out. Tracking telemetry.",
    type: "informational",
    time: "14:00 GMT",
    icon: "sports_motorsports",
    meta: "Broadcast",
  },
];

export default function TodayPage() {
  const router = useRouter();
  const [taskDone, setTaskDone] = useState(false);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (taskDone) {
    return (
      <div className={styles.done}>
        <OrbitPulse size={24} gold />
        <h2 className={`${styles.doneTitle} font-headline-lg`}>
          Task Complete. Orbit is recalculating...
        </h2>
        <button className="pixel-btn pixel-btn-primary" onClick={() => setTaskDone(false)}>
          Next Mission
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Greeting */}
      <header className={styles.greeting}>
        <div>
          <h2 className={`${styles.greetingTitle} font-headline-lg`}>Good morning, Alex.</h2>
          <div className={styles.greetingSubrow}>
            <OrbitPulse size={10} />
            <p className={`${styles.greetingSub} font-body-lg`}>The path is clear.</p>
          </div>
        </div>
        <div className={styles.sysDate}>
          <span className="font-label-mono">SYS_DATE: {today}</span>
        </div>
      </header>

      {/* Hero: What's Next */}
      <HeroCard
        taskTitle={CURRENT_TASK.title}
        estimatedMins={CURRENT_TASK.estimatedMins}
        aiRationale={CURRENT_TASK.aiRationale}
        onStart={() => router.push("/focus")}
        onDone={() => setTaskDone(true)}
        onSkip={() => {}}
        onReschedule={() => {}}
      />

      <DitherDivider style={{ margin: "40px 0" }} />

      {/* Timeline */}
      <Timeline events={TIMELINE_EVENTS} />
    </div>
  );
}
