"use client";
import { useState } from "react";
import ContextCard, { ContextItem } from "@/components/orbit/ContextCard";
import MajorEventCard, { MajorEvent } from "@/components/orbit/MajorEventCard";
import ContextInput from "@/components/orbit/ContextInput";
import OrbitPulse from "@/components/shared/OrbitPulse";
import styles from "./page.module.css";

const CONTEXT_ITEMS: ContextItem[] = [
  {
    id: "workstyle",
    category: "Workstyle",
    content: "Prefers deep work in the evening.",
    color: "var(--secondary)",
    bgColor: "var(--secondary-container)",
    tags: ["EVENING_BIAS"],
    onEdit: () => {},
  },
  {
    id: "fitness",
    category: "Fitness",
    content: "Gym schedule is flexible.",
    color: "var(--primary)",
    bgColor: "var(--surface-variant)",
    tags: ["FLEX_ROUTINE"],
    onEdit: () => {},
  },
  {
    id: "interests",
    category: "Interests",
    content: "F1 events are purely informational.",
    color: "var(--secondary)",
    bgColor: "var(--secondary-container)",
    tags: ["PASSIVE_TRACKING"],
    onEdit: () => {},
  },
  {
    id: "academic",
    category: "Academic",
    content: "University classes are strictly mandatory.",
    color: "var(--error)",
    bgColor: "var(--error-container)",
    tags: ["STRICT_ATTENDANCE"],
    onEdit: () => {},
  },
];

const MAJOR_EVENT: MajorEvent = {
  id: "moving",
  title: "Moving to Malaysia.",
  description: "Logistics, visas, and housing finalization phase.",
  daysLeft: 20,
  onView: () => {},
  onEdit: () => {},
};

export default function OrbitPage() {
  const [items, setItems] = useState<ContextItem[]>(CONTEXT_ITEMS);

  const handleAddContext = (text: string) => {
    // TODO: run through AI to classify category
    const newItem: ContextItem = {
      id: `ctx-${Date.now()}`,
      category: "New",
      content: text,
      color: "var(--tertiary)",
      bgColor: "var(--tertiary-container)",
      onEdit: () => {},
    };
    setItems((prev) => [...prev, newItem]);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <OrbitPulse size={14} gold />
          <h1 className={`${styles.title} font-headline-xl`}>My Orbit</h1>
        </div>
        <p className={`${styles.subtitle} font-body-lg`}>
          Your personal context, rhythm, and directives mapped as actionable intelligence.
        </p>
        <div className="pixel-divider-h" style={{ marginTop: 20 }} />
      </header>

      {/* Bento Grid */}
      <div className={styles.bentoGrid}>
        {items.map((item) => (
          <ContextCard key={item.id} item={item} />
        ))}

        {/* Major Event — spans 2 columns on md+ */}
        <div className={styles.majorEventWrap}>
          <MajorEventCard event={MAJOR_EVENT} />
        </div>
      </div>

      {/* Add Context */}
      <ContextInput onSubmit={handleAddContext} />

      {/* Decorative glow */}
      <div className={styles.bgGlow} aria-hidden="true" />
    </div>
  );
}
