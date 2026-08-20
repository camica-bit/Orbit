"use client";
import { useState, useEffect, useCallback } from "react";
import ContextCard, { ContextItem } from "@/components/orbit/ContextCard";
import MajorEventCard, { MajorEvent } from "@/components/orbit/MajorEventCard";
import ContextInput from "@/components/orbit/ContextInput";
import OrbitPulse from "@/components/shared/OrbitPulse";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

type DbItem = {
  id: string;
  category: string;
  content: string;
  color: string | null;
  bg_color: string | null;
  tags: string[] | null;
  is_major_event: boolean | null;
  event_date: string | null;
  created_at: string | null;
  user_id: string | null;
};

// Map category name to a nice colour pair
const CATEGORY_COLOURS: Record<string, { color: string; bgColor: string }> = {
  Workstyle:    { color: "var(--secondary)",  bgColor: "var(--secondary-container)" },
  Fitness:      { color: "var(--primary)",     bgColor: "var(--surface-container-high)" },
  Interests:    { color: "var(--secondary)",  bgColor: "var(--secondary-container)" },
  Academic:     { color: "var(--error)",       bgColor: "var(--error-container)" },
  "Major Event":{ color: "var(--orbit-gold)", bgColor: "var(--secondary-container)" },
};

function toContextItem(db: DbItem, onEdit: (id: string) => void, onDelete: (id: string) => void): ContextItem {
  const colours = CATEGORY_COLOURS[db.category] ?? { color: "var(--secondary)", bgColor: "var(--secondary-container)" };
  return {
    id: db.id,
    category: db.category,
    content: db.content,
    color: db.color ?? colours.color,
    bgColor: db.bg_color ?? colours.bgColor,
    tags: db.tags ?? [],
    onEdit: () => onEdit(db.id),
    onDelete: () => onDelete(db.id),
  };
}

function toMajorEvent(db: DbItem, onEdit: (id: string) => void): MajorEvent {
  const eventDate = db.event_date ? new Date(db.event_date) : null;
  const daysLeft = eventDate
    ? Math.max(0, Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  return {
    id: db.id,
    title: db.content,
    description: undefined,
    daysLeft,
    onEdit: () => onEdit(db.id),
  };
}

export default function OrbitPage() {
  const { user } = useAuth();
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [majorEvent, setMajorEvent] = useState<MajorEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleEdit = useCallback((id: string) => {
    const item = contextItems.find((i) => i.id === id);
    const newContent = window.prompt("Edit context directive:", item?.content ?? "");
    if (!newContent?.trim() || newContent === item?.content) return;
    fetch("/api/context", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content: newContent.trim() }),
    }).then(() => load());
  }, [contextItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm("Remove this context directive from Orbit?")) return;
    fetch("/api/context", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).then(() => load());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/context");
      const json = await res.json();
      const items: DbItem[] = json.items ?? [];

      const major = items.find((i) => i.is_major_event);
      const regular = items.filter((i) => !i.is_major_event);

      setMajorEvent(major ? toMajorEvent(major, handleEdit) : null);
      setContextItems(regular.map((db) => toContextItem(db, handleEdit, handleDelete)));
    } finally {
      setLoading(false);
    }
  }, [handleEdit, handleDelete]);

  useEffect(() => {
    load();
  }, [load, user]);

  const handleAddContext = async (text: string) => {
    setSaving(true);
    try {
      // Intelligent category detection
      let category = "General";
      const lower = text.toLowerCase();
      if (/gym|fitness|workout|run|swim|sport|exercise|lift/.test(lower)) category = "Fitness";
      else if (/class|lecture|university|course|study|exam|assignment|homework/.test(lower)) category = "Academic";
      else if (/work|project|deep|focus|productivity|deadline|client|code/.test(lower)) category = "Workstyle";
      else if (/interest|hobby|watch|read|music|game|f1|race|movie/.test(lower)) category = "Interests";

      const colours = CATEGORY_COLOURS[category] ?? CATEGORY_COLOURS["Workstyle"];

      await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          content: text,
          color: colours.color,
          bg_color: colours.bgColor,
        }),
      });
      await load();
    } finally {
      setSaving(false);
    }
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

      {/* Loading skeleton */}
      {loading && (
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`pixel-border ${styles.skeletonCard} anim-orbit-pulse`} />
          ))}
        </div>
      )}

      {/* Bento Grid */}
      {!loading && (
        <div className={styles.bentoGrid}>
          {contextItems.map((item) => (
            <ContextCard key={item.id} item={item} />
          ))}

          {/* Major Event — spans 2 columns on md+ */}
          {majorEvent && (
            <div className={styles.majorEventWrap}>
              <MajorEventCard event={majorEvent} />
            </div>
          )}

          {contextItems.length === 0 && !majorEvent && (
            <div className={`pixel-border ${styles.emptyState}`}>
              <OrbitPulse size={14} gold />
              <div>
                <p className="font-headline-md" style={{ color: "var(--on-surface)", marginBottom: 4 }}>
                  No context registered for this account.
                </p>
                <p className="font-body-md" style={{ color: "var(--on-surface-variant)" }}>
                  Teach Orbit your rhythms, preferences, and commitments using the terminal below.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Context Terminal Input */}
      <ContextInput onSubmit={handleAddContext} loading={saving} />

      {/* Decorative glow */}
      <div className={styles.bgGlow} aria-hidden="true" />
    </div>
  );
}
