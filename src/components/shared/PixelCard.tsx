import React from "react";
import styles from "./PixelCard.module.css";

interface PixelCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  elevated?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  id?: string;
}

export default function PixelCard({
  children,
  className = "",
  style,
  elevated = false,
  interactive = false,
  onClick,
  id,
}: PixelCardProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      id={id}
      className={`pixel-border ${styles.card} ${elevated ? styles.elevated : ""} ${interactive ? styles.interactive : ""} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}
