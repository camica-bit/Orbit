"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BlinkCursor from "@/components/shared/BlinkCursor";
import styles from "./InputBar.module.css";

type SubmitState = "idle" | "loading" | "success" | "error";

export default function InputBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [addedCount, setAddedCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;

    setSubmitState("loading");
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("AI extraction failed");

      const json = await res.json();
      const count: number = json.tasks?.length ?? 1;

      setAddedCount(count);
      setSubmitState("success");
      setValue("");

      // After a brief success flash, reset and navigate home to show new tasks
      setTimeout(() => {
        setSubmitState("idle");
        router.push("/");
        router.refresh();
      }, 1500);
    } catch {
      setSubmitState("error");
      setTimeout(() => setSubmitState("idle"), 2000);
    }
  };

  const isLoading = submitState === "loading";
  const isSuccess = submitState === "success";
  const isError = submitState === "error";

  return (
    <div className={styles.inputBar}>
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Mic button */}
        <button
          type="button"
          className={`${styles.micBtn} pixel-btn`}
          aria-label="Voice input"
          onClick={() => router.push("/listen")}
          disabled={isLoading}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
          >
            mic
          </span>
        </button>

        {/* Terminal input container */}
        <div className={`${styles.inputWrap} terminal-input ${isError ? styles.inputError : isSuccess ? styles.inputSuccess : ""}`}>
          <span className={styles.prompt} aria-hidden="true">
            {isLoading ? "~" : isSuccess ? "✓" : isError ? "!" : ">"}
          </span>
          <input
            className={styles.input}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              isSuccess
                ? `Added ${addedCount} task${addedCount !== 1 ? "s" : ""} to Orbit`
                : isError
                ? "Something went wrong — try again"
                : "Tell Orbit what's on your mind..."
            }
            aria-label="Natural language input"
            autoComplete="off"
            spellCheck={false}
            disabled={isLoading || isSuccess}
          />
          {!isFocused && !value && !isLoading && !isSuccess && !isError && (
            <BlinkCursor />
          )}
          {isLoading && (
            <span
              className="material-symbols-outlined anim-orbit-pulse"
              style={{ fontSize: 16, color: "var(--primary)", flexShrink: 0 }}
            >
              sync
            </span>
          )}
        </div>

        {/* Send button */}
        <button
          type="submit"
          className={`${styles.sendBtn} pixel-btn pixel-btn-secondary`}
          aria-label="Send"
          disabled={!value.trim() || isLoading || isSuccess}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
          >
            {isLoading ? "sync" : "send"}
          </span>
        </button>
      </form>
    </div>
  );
}
