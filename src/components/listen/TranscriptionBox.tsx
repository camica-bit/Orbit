"use client";
import { useEffect, useRef } from "react";
import styles from "./TranscriptionBox.module.css";

interface TranscriptionBoxProps {
  text: string;
  interimText?: string;
  isListening: boolean;
}

export default function TranscriptionBox({ text, interimText = "", isListening }: TranscriptionBoxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as text grows
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, interimText]);

  const isEmpty = !text && !interimText;

  return (
    <div className={`pixel-border ${styles.box}`} role="status" aria-live="polite" aria-label="Transcription">
      {/* LISTENING / STANDBY badge */}
      <div className={styles.badge}>
        <span
          className={`${styles.badgeDot} ${isListening ? styles.badgeDotActive : ""}`}
        />
        <span className={`${styles.badgeText} font-label-mono`}>
          {isListening ? "LISTENING" : text ? "CAPTURED" : "STANDBY"}
        </span>
      </div>

      {/* Transcription content */}
      <div ref={scrollRef} className={styles.textScroll}>
        {isEmpty ? (
          <p className={`${styles.placeholder} font-body-md`}>
            Speak your schedule, intentions, or anything on your mind...
          </p>
        ) : (
          <p className={styles.text}>
            {/* Committed text */}
            {text && (
              <span className={`${styles.finalText} font-headline-md`}>{text}</span>
            )}
            {/* Interim (in-flight) text */}
            {interimText && (
              <span className={`${styles.interimText} font-headline-md`}>
                {text ? " " : ""}{interimText}
              </span>
            )}
            {/* Blinking cursor when listening */}
            {isListening && (
              <span className={`${styles.cursor} anim-blink`} aria-hidden="true" />
            )}
          </p>
        )}
      </div>

      {/* Word count */}
      {text && (
        <div className={styles.footer}>
          <span className={`${styles.wordCount} font-label-mono`}>
            {text.split(/\s+/).filter(Boolean).length} words captured
          </span>
        </div>
      )}
    </div>
  );
}
