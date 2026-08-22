"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./PixelDialog.module.css";

type PixelDialogProps = {
  open: boolean;
  title: string;
  /** Supporting copy shown under the title. */
  message?: string;
  /** Present = prompt (editable field); absent = plain confirm. */
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  /** Style the confirm button as destructive. */
  danger?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

/**
 * Replaces `window.prompt` / `window.confirm`, which ignore the app's styling
 * and block the main thread. Built on the native `<dialog>` element so focus
 * trapping, Escape-to-close and the backdrop come from the platform.
 */
export default function PixelDialog({
  open,
  title,
  message,
  defaultValue,
  placeholder,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: PixelDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");
  const isPrompt = defaultValue !== undefined;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setValue(defaultValue ?? "");
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, defaultValue]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPrompt && !value.trim()) return;
    onConfirm(value.trim());
  };

  return (
    <dialog
      ref={ref}
      className={`pixel-border ${styles.dialog}`}
      aria-labelledby="pixel-dialog-title"
      // Escape key — the platform fires `cancel` before `close`.
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      // A click landing on the dialog element itself is a backdrop click.
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
    >
      <form className={styles.form} onSubmit={submit}>
        <h2 id="pixel-dialog-title" className={`${styles.title} font-headline-md`}>
          {title}
        </h2>
        {message && <p className={`${styles.message} font-body-md`}>{message}</p>}

        {isPrompt && (
          <input
            className={`terminal-input ${styles.input}`}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            aria-label={title}
            autoComplete="off"
            spellCheck={false}
            /* A modal's field is the reason the modal opened; the platform
               returns focus to the opener on close. */
            autoFocus
          />
        )}

        <div className={styles.actions}>
          <button type="button" className="pixel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            className={`pixel-btn ${danger ? styles.dangerBtn : "pixel-btn-primary"}`}
            disabled={isPrompt && !value.trim()}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
