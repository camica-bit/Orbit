import styles from "./BlinkCursor.module.css";

interface BlinkCursorProps {
  color?: string;
  width?: number;
}

export default function BlinkCursor({
  color = "var(--secondary)",
  width = 8,
}: BlinkCursorProps) {
  return (
    <span
      className={`${styles.cursor} anim-blink`}
      style={{ backgroundColor: color, width }}
      aria-hidden="true"
    />
  );
}
