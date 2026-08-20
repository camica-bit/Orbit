"use client";
import { useState, useEffect, useCallback } from "react";
import DitherDivider from "@/components/shared/DitherDivider";
import OrbitPulse from "@/components/shared/OrbitPulse";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

type DayData = {
  date: string;
  taskCount: number;
  hours: number;
  tasks: { id: string; title: string; type: string | null; status: string | null }[];
};

const MAX_HOURS = 8; // scale bar: 8 h = full height

export default function WeekPage() {
  const { user } = useAuth();
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks/week");
      const json = await res.json();
      setDays(json.days ?? []);
      setWeekStart(json.weekStart ?? "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, user]);

  const weekLabel = weekStart
    ? new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : "";

  const totalTasks = days.reduce((s, d) => s + d.taskCount, 0);
  const totalHours = Math.round(days.reduce((s, d) => s + d.hours, 10) * 10) / 10;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <OrbitPulse size={12} />
          <h1 className={`${styles.title} font-headline-xl`}>Weekly Flow</h1>
          {weekLabel && (
            <span className={`${styles.weekLabel} font-label-mono`}>
              WK: {weekLabel}
            </span>
          )}
        </div>
        <p className={`${styles.subtitle} font-body-lg`}>
          Your cognitive load and momentum mapped across the week.
        </p>
        <DitherDivider style={{ marginTop: 20 }} />
      </header>

      {/* Summary row */}
      {!loading && (
        <div className={styles.summaryRow}>
          <div className={`pixel-border ${styles.summaryCard}`}>
            <span className={`${styles.summaryNum} font-headline-md`}>{totalTasks}</span>
            <span className={`${styles.summaryLabel} font-label-mono`}>Tasks This Week</span>
          </div>
          <div className={`pixel-border ${styles.summaryCard}`}>
            <span className={`${styles.summaryNum} font-headline-md`}>{totalHours}h</span>
            <span className={`${styles.summaryLabel} font-label-mono`}>Estimated Load</span>
          </div>
          <div className={`pixel-border ${styles.summaryCard}`}>
            <span className={`${styles.summaryNum} font-headline-md`}>
              {days.filter((d) => d.taskCount > 0).length}
            </span>
            <span className={`${styles.summaryLabel} font-label-mono`}>Active Days</span>
          </div>
        </div>
      )}

      {/* Week grid */}
      <section className={styles.weekGrid} aria-label="Weekly task grid">
        {loading
          ? WEEK_DAYS.map((day) => (
              <div key={day} className={`pixel-border ${styles.dayCard} anim-orbit-pulse`}
                style={{ opacity: 0.3 }}>
                <span className={`${styles.dayLabel} font-label-mono`}>{day}</span>
              </div>
            ))
          : days.map((dayData, i) => {
              const isToday = i === TODAY_IDX;
              const barH = Math.max((dayData.hours / MAX_HOURS) * 90, dayData.taskCount > 0 ? 8 : 4);
              const colour =
                dayData.hours > 6 ? "var(--error)" :
                dayData.hours > 3 ? "var(--secondary)" :
                dayData.taskCount > 0 ? "var(--primary)" :
                "var(--outline)";
              const isSelected = selectedDay === i;

              return (
                <div
                  key={dayData.date}
                  className={`pixel-border ${styles.dayCard}
                    ${isToday ? styles.dayCardToday : ""}
                    ${isSelected ? styles.dayCardSelected : ""}`}
                  onClick={() => setSelectedDay(isSelected ? null : i)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${WEEK_DAYS[i]}: ${dayData.taskCount} tasks`}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedDay(isSelected ? null : i)}
                >
                  <span
                    className={`${styles.dayLabel} font-label-mono`}
                    style={{ color: isToday ? "var(--secondary)" : "var(--on-surface-variant)" }}
                  >
                    {WEEK_DAYS[i]}
                  </span>
                  {isToday && (
                    <span className={`${styles.todayBadge} font-label-mono`}>NOW</span>
                  )}

                  {/* Bar chart */}
                  <div className={styles.barWrap}>
                    <div className={styles.bar} style={{ height: barH, backgroundColor: colour }} />
                  </div>

                  {dayData.taskCount > 0 ? (
                    <div className={styles.dayStats}>
                      <span
                        className={`${styles.statNum} font-headline-md`}
                        style={{ color: isToday ? "var(--secondary)" : "var(--on-surface)" }}
                      >
                        {dayData.taskCount}
                      </span>
                      <span className={`${styles.statLabel} font-label-mono`}>tasks</span>
                      <span className={`${styles.statHours} font-label-mono`}>{dayData.hours}h</span>
                    </div>
                  ) : (
                    <div className={`${styles.restDay} font-label-mono`}>REST</div>
                  )}
                </div>
              );
            })}
      </section>

      {/* Task detail panel — shown when a day is selected */}
      {selectedDay !== null && !loading && days[selectedDay] && (
        <div className={`pixel-border ${styles.detailPanel}`}>
          <div className={styles.detailHeader}>
            <h3 className={`${styles.detailTitle} font-headline-md`}>
              {WEEK_DAYS[selectedDay]} — {days[selectedDay].tasks.length} task{days[selectedDay].tasks.length !== 1 ? "s" : ""}
            </h3>
            <button
              className={styles.detailClose}
              onClick={() => setSelectedDay(null)}
              aria-label="Close"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
          {days[selectedDay].tasks.length === 0 ? (
            <p className="font-body-md" style={{ color: "var(--on-surface-variant)" }}>
              No tasks scheduled for this day.
            </p>
          ) : (
            <ul className={styles.taskList}>
              {days[selectedDay].tasks.map((t) => (
                <li key={t.id} className={`${styles.taskItem} font-body-md`}>
                  <span
                    className={styles.taskDot}
                    style={{
                      backgroundColor:
                        t.type === "fixed" ? "var(--primary)" :
                        t.type === "flexible" ? "var(--secondary)" : "var(--outline)",
                    }}
                  />
                  <span className={t.status === "completed" ? styles.taskDone : ""}>{t.title}</span>
                  {t.status === "completed" && (
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--secondary)", marginLeft: 6 }}>
                      check_circle
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
