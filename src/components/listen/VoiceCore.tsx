import styles from "./VoiceCore.module.css";

interface VoiceCoreProps {
  isListening: boolean;
  audioLevel?: number; // 0..1
}

export default function VoiceCore({ isListening, audioLevel = 0 }: VoiceCoreProps) {
  const scale = 1 + audioLevel * 0.15;

  return (
    <div className={styles.container} aria-label="Voice visualization">
      {/* Outer ring — slow pulse */}
      <div className={`${styles.ring} ${styles.ringOuter} ${isListening ? styles.ringActive : ""}`} aria-hidden="true" />
      <div className={`${styles.ring} ${styles.ringMid}   ${isListening ? styles.ringActive : ""}`} aria-hidden="true" />
      <div className={`${styles.ring} ${styles.ringInner} ${isListening ? styles.ringActive : ""}`} aria-hidden="true" />

      {/* Core sphere — scales with audio */}
      <div
        className={`pixel-border ${styles.core} ${isListening ? styles.coreActive : ""}`}
        style={{ transform: `scale(${scale})`, transition: "transform 0.05s ease" }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 52,
            fontVariationSettings: isListening ? "'FILL' 1" : "'FILL' 0",
            color: "var(--on-secondary)",
            transition: "font-variation-settings 0.3s",
          }}
        >
          mic
        </span>
      </div>
    </div>
  );
}
