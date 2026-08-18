"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BlinkCursor from "@/components/shared/BlinkCursor";
import styles from "./InputBar.module.css";

export default function InputBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    // TODO: wire up to AI processing
    console.log("Orbit input:", value);
    setValue("");
  };

  return (
    <div className={styles.inputBar}>
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Mic button */}
        <button type="button" className={`${styles.micBtn} pixel-btn`} aria-label="Voice input" onClick={() => router.push("/listen")}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
            mic
          </span>
        </button>

        {/* Terminal input container */}
        <div className={`${styles.inputWrap} terminal-input`}>
          <span className={styles.prompt} aria-hidden="true">&gt;</span>
          <input
            className={styles.input}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Tell Orbit what's on your mind..."
            aria-label="Natural language input"
            autoComplete="off"
            spellCheck={false}
          />
          {!isFocused && !value && <BlinkCursor />}
        </div>

        {/* Send button */}
        <button
          type="submit"
          className={`${styles.sendBtn} pixel-btn pixel-btn-secondary`}
          aria-label="Send"
          disabled={!value.trim()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
            send
          </span>
        </button>
      </form>
    </div>
  );
}
