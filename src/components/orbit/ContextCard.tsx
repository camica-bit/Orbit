import styles from "./ContextCard.module.css";

export interface ContextItem {
  id: string;
  category: string;
  content: string;
  color?: string;
  bgColor?: string;
  tags?: string[];
  onEdit?: () => void;
}

export default function ContextCard({ item }: { item: ContextItem }) {
  return (
    <article className={`pixel-border ${styles.card}`} aria-label={item.category}>
      <div className={styles.top}>
        <span
          className={`${styles.chip} font-label-mono`}
          style={{
            color: item.color ?? "var(--secondary)",
            backgroundColor: item.bgColor ?? "var(--secondary-container)",
          }}
        >
          {item.category.toUpperCase()}
        </span>
        {item.onEdit && (
          <button className={styles.editBtn} onClick={item.onEdit} aria-label={`Edit ${item.category}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
          </button>
        )}
      </div>

      <p className={`${styles.content} font-body-lg`}>{item.content}</p>

      {item.tags && item.tags.length > 0 && (
        <div className={styles.tags}>
          {item.tags.map((tag) => (
            <span key={tag} className={`${styles.tag} font-label-mono`}>{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}
