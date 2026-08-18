import styles from "./OrbitPulse.module.css";

interface OrbitPulseProps {
  size?: number;
  color?: string;
  gold?: boolean;
}

export default function OrbitPulse({
  size = 16,
  color,
  gold = false,
}: OrbitPulseProps) {
  const bg = color ?? (gold ? "var(--orbit-gold)" : "var(--secondary)");
  const animClass = gold ? "anim-gold-pulse" : "anim-pulse-glow";

  return (
    <div
      className={`${styles.pulse} ${animClass}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
      }}
      aria-hidden="true"
    />
  );
}
