import React from "react";
import styles from "./StatusChip.module.css";

type ChipVariant = "fixed" | "flex" | "info" | "error" | "category" | "custom";

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
  icon?: string;
  style?: React.CSSProperties;
}

const VARIANT_CLASS: Record<ChipVariant, string> = {
  fixed:    "status-chip-fixed",
  flex:     "status-chip-flex",
  info:     "status-chip-info",
  error:    "status-chip-error",
  category: "status-chip-category",
  custom:   "",
};

export default function StatusChip({
  label,
  variant = "category",
  icon,
  style,
}: StatusChipProps) {
  return (
    <span
      className={`status-chip ${VARIANT_CLASS[variant]} ${styles.chip}`}
      style={style}
    >
      {icon && (
        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
          {icon}
        </span>
      )}
      {label}
    </span>
  );
}
