"use client";
import { useState, useEffect, useCallback } from "react";
import ContextCard, { ContextItem } from "@/components/orbit/ContextCard";
import MajorEventCard, { MajorEvent } from "@/components/orbit/MajorEventCard";
import ContextInput from "@/components/orbit/ContextInput";
import PixelDialog from "@/components/shared/PixelDialog";
import OrbitPulse from "@/components/shared/OrbitPulse";
import { useAuth } from "@/context/AuthContext";
import { daysBetweenKeys, localDateKey } from "@/lib/time";
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

type EditRequest = { id: string; content: string };

function toContextItem(
  db: DbItem,
  onEdit: (req: EditRequest) => void,
  onDelete: (id: string) => void
): ContextItem {
  const colours = CATEGORY_COLOURS[db.category] ?? { color: "var(--secondary)", bgColor: "var(--secondary-container)" };
  return {
    id: db.id,
    category: db.category,
    content: db.content,
    color: db.color ?? colours.color,
    bgColor: db.bg_color ?? colours.bgColor,
    tags: db.tags ?? [],
    onEdit: () => onEdit({ id: db.id, content: db.content }),
    onDelete: () => onDelete(db.id),
  };
}

function toMajorEvent(
  db: DbItem,
  onEdit: (req: EditRequest) => void,
  onDelete: (id: string) => void
): MajorEvent {
  return {
    id: db.id,
    title: db.content,
    description: undefined,
    // Whole calendar days in the viewer's zone — `event_date` is a date, so
    // subtracting raw timestamps would be off by up to a day either way.
    daysLeft: db.event_date
      ? Math.max(0, daysBetweenKeys(localDateKey(), db.event_date))
      : null,
    onEdit: () => onEdit({ id: db.id, content: db.content }),
    onDelete: () => onDelete(db.id),
  };
}

export default function OrbitPage() {
  const { user } = useAuth();
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [majorEvents, setMajorEvents] = useState<MajorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditRequest | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/context");
      // A failed request used to render the same "no context" empty state as a
      // genuinely empty account, which reads as data loss.
      if (!res.ok) throw new Error(`context request failed: ${res.status}`);
      const json = await res.json();
      const items: DbItem[] = json.items ?? [];

      setMajorEvents(
        items.filter((i) => i.is_major_event).map((db) => toMajorEvent(db, setEditing, setDeletingId))
      );
      setContextItems(
        items
          .filter((i) => !i.is_major_event)
          .map((db) => toContextItem(db, setEditing, setDeletingId))
      );
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, user]);

  const handleAddContext = async (text: string, eventDate?: string) => {
    setSaving(true);
    try {
      // The category is derived by /api/context; the browser used to run a
      // second copy of those regexes.
      await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, event_date: eventDate ?? null }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (content: string) => {
    const target = editing;
    setEditing(null);
    if (!target || content === target.content) return;
    await fetch("/api/context", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: target.id, content }),
    });
    await load();
  };

  const submitDelete = async () => {
    const id = deletingId;
    setDeletingId(null);
    if (!id) return;
    await fetch("/api/context", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
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

      {/* Load failure — distinct from an empty account */}
      {!loading && failed && (
        <div className={`pixel-border ${styles.emptyState}`} role="alert">
          <div>
            <p className="font-headline-md" style={{ color: "var(--error)", marginBottom: 4 }}>
              Could not reach your context.
            </p>
            <p className="font-body-md" style={{ color: "var(--on-surface-variant)" }}>
              Nothing has been lost — the request failed.
            </p>
          </div>
          <button className="pixel-btn" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {/* Bento Grid */}
      {!loading && !failed && (
        <div className={styles.bentoGrid}>
          {contextItems.map((item) => (
            <ContextCard key={item.id} item={item} />
          ))}

          {/* Major Events — each spans 2 columns on md+ */}
          {majorEvents.map((event) => (
            <div key={event.id} className={styles.majorEventWrap}>
              <MajorEventCard event={event} />
            </div>
          ))}

          {contextItems.length === 0 && majorEvents.length === 0 && (
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

      <PixelDialog
        open={editing !== null}
        title="Edit context directive"
        defaultValue={editing?.content ?? ""}
        confirmLabel="Save"
        onConfirm={submitEdit}
        onCancel={() => setEditing(null)}
      />

      <PixelDialog
        open={deletingId !== null}
        title="Remove directive?"
        message="Orbit will stop using this context when planning your day."
        confirmLabel="Remove"
        danger
        onConfirm={submitDelete}
        onCancel={() => setDeletingId(null)}
      />

      {/* Decorative glow */}
      <div className={styles.bgGlow} aria-hidden="true" />
    </div>
  );
}
