"use client";
import { useState } from "react";
import BlinkCursor from "@/components/shared/BlinkCursor";
import styles from "./ContextInput.module.css";

interface ContextInputProps {
  /** `eventDate` (YYYY-MM-DD) marks the entry as a major event. */
  onSubmit?: (text: string, eventDate?: string) => void;
  loading?: boolean;
}

export default function ContextInput({ onSubmit, loading = false }: ContextInputProps) {
  const [value, setValue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit?.(value.trim(), eventDate || undefined);
    setValue("");
    setEventDate("");
  };

  return (
    <section className={styles.section}>
      <h3 className={`${styles.heading} font-headline-md`}>
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>add_circle</span>
        Add Context
      </h3>

      <form onSubmit={handleSubmit}>
        <div className={`terminal-input ${styles.inputWrap}`}>
          <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 20 }}>
            terminal
          </span>
          <input
            className={styles.input}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Tell me more about your rhythm..."
            aria-label="Add personal context"
            autoComplete="off"
            spellCheck={false}
          />
          {!focused && !value && <BlinkCursor color="var(--orbit-gold)" />}
          <button
            type="submit"
            className={`pixel-btn pixel-btn-secondary ${styles.submitBtn}`}
            disabled={!value.trim() || loading}
          >
            {loading ? (
              <span className="material-symbols-outlined anim-orbit-pulse" style={{ fontSize: 16 }}>sync</span>
            ) : "INPUT"}
          </button>
        </div>
        <p className={`${styles.hint} font-label-mono`}>
          Press Enter to process intelligence into Orbit.
        </p>

        {/* The only way to create a major event — a bare date input beats a
            second form, and the browser supplies the picker and validation. */}
        <label className={`${styles.eventRow} font-label-mono`}>
          Countdown date (optional — makes this a major event)
          <input
            className={`terminal-input ${styles.dateInput}`}
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </label>
      </form>
    </section>
  );
}
