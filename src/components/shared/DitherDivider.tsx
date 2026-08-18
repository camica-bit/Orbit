import React from "react";
import styles from "./DitherDivider.module.css";

interface DitherDividerProps {
  vertical?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function DitherDivider({
  vertical = false,
  style,
  className = "",
}: DitherDividerProps) {
  return (
    <div
      className={`${vertical ? "pixel-divider-v" : "pixel-divider-h"} ${styles.divider} ${className}`}
      style={style}
      role="separator"
      aria-hidden="true"
    />
  );
}
