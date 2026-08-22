"use client";
import { useEffect, useRef } from "react";
import styles from "./TranscriptionBox.module.css";

interface TranscriptionBoxProps {
  text: string;
  interimText?: string;
  isListening: boolean;
  /**
   * Provided = the captured text becomes an editable field whenever the mic is
   * off. Without it there was no way to correct a misheard word — or to enter
   * anything at all in a browser with no Speech API.
   */
  onTextChange?: (text: string) => void;
}

export default function TranscriptionBox({
  text,
  interimText = "",
  isListening,
  onTextChange,
}: TranscriptionBoxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as text grows
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, interimText]);

  const isEmpty = !text && !interimText;

  return (
    <div
      className={`pixel-border ${styles.box}`}
      role="status"
      // A live region wrapping an editable field re-announces every keystroke,
      // so it is only live while speech is actually arriving.
      aria-live={isListening ? "polite" : "off"}
      aria-label="Transcription"
    >
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
        {!isListening && onTextChange ? (
          <textarea
            className={`${styles.editor} font-headline-md`}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Speak your schedule, intentions, or anything on your mind..."
            aria-label="Captured text — edit before sending"
            spellCheck
            rows={4}
          />
        ) : isEmpty ? (
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
