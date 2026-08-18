"use client";
import { useEffect, useRef } from "react";
import styles from "./AudioBars.module.css";

interface AudioBarsProps {
  isListening: boolean;
  audioLevel: number; // 0..1
}

const BAR_COUNT = 12;

export default function AudioBars({ isListening, audioLevel }: AudioBarsProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    barsRef.current.forEach((bar, i) => {
      if (!bar) return;
      const center = BAR_COUNT / 2;
      const distFromCenter = Math.abs(i - center) / center; // 0..1
      const baseH = 4;
      const maxH = isListening ? 40 + audioLevel * 28 * (1 - distFromCenter * 0.6) : 4;
      const h = baseH + (maxH - baseH) * (0.5 + 0.5 * Math.sin(Date.now() / 200 + i * 0.7));
      bar.style.height = `${h}px`;
    });
  });

  return (
    <div className={styles.bars} aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className={`${styles.bar} ${isListening ? styles.barActive : ""}`}
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  );
}
