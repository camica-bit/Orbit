"use client";
import DitherDivider from "@/components/shared/DitherDivider";
import OrbitPulse from "@/components/shared/OrbitPulse";
import styles from "./page.module.css";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

const WEEK_DATA = [
  { tasks: 3, hours: 4.5, color: "var(--secondary)" },
  { tasks: 5, hours: 6.0, color: "var(--secondary)" },
  { tasks: 2, hours: 3.0, color: "var(--primary)" },
  { tasks: 6, hours: 7.5, color: "var(--secondary)" },
  { tasks: 1, hours: 1.5, color: "var(--tertiary)" },
  { tasks: 0, hours: 0,   color: "var(--outline)" },
  { tasks: 0, hours: 0,   color: "var(--outline)" },
];

export default function WeekPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <OrbitPulse size={12} />
          <h1 className={`${styles.title} font-headline-xl`}>Weekly Flow</h1>
        </div>
        <p className={`${styles.subtitle} font-body-lg`}>
          Your cognitive load and momentum mapped across the week.
        </p>
        <DitherDivider style={{ marginTop: 20 }} />
      </header>

      {/* Week grid */}
      <section className={styles.weekGrid}>
        {WEEK_DAYS.map((day, i) => {
          const isToday = i === TODAY_IDX;
          const data = WEEK_DATA[i];
          const barH = Math.max(data.hours * 12, 4);
          return (
            <div
              key={day}
              className={`pixel-border ${styles.dayCard} ${isToday ? styles.dayCardToday : ""}`}
            >
              <span className={`${styles.dayLabel} font-label-mono`}
                style={{ color: isToday ? "var(--secondary)" : "var(--on-surface-variant)" }}>
                {day}
              </span>
              {isToday && (
                <span className={`${styles.todayBadge} font-label-mono`}>NOW</span>
              )}

              {/* Bar chart */}
              <div className={styles.barWrap}>
                <div
                  className={styles.bar}
                  style={{ height: barH, backgroundColor: data.color }}
                />
              </div>

              {data.tasks > 0 ? (
                <div className={styles.dayStats}>
                  <span className={`${styles.statNum} font-headline-md`}
                    style={{ color: isToday ? "var(--secondary)" : "var(--on-surface)" }}>
                    {data.tasks}
                  </span>
                  <span className={`${styles.statLabel} font-label-mono`}>tasks</span>
                  <span className={`${styles.statHours} font-label-mono`}>{data.hours}h</span>
                </div>
              ) : (
                <div className={`${styles.restDay} font-label-mono`}>REST</div>
              )}
            </div>
          );
        })}
      </section>

      {/* Coming soon notice */}
      <div className={`pixel-border ${styles.comingSoon}`}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--secondary)" }}>
          construction
        </span>
        <div>
          <p className={`${styles.csTitle} font-label-mono`}>Full Weekly View — Phase 4</p>
          <p className={`${styles.csSub} font-body-md`}>
            Drag-to-schedule, AI load balancing, and deep work block detection coming in Phase 4.
          </p>
        </div>
      </div>
    </div>
  );
}
