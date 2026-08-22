"use client";
import { useEffect } from "react";

/**
 * Cross-page "the task list changed" signal.
 *
 * The InputBar used to call `router.refresh()`, which only re-runs server
 * components — every task view fetches from a client `useEffect`, so newly
 * extracted tasks never appeared until a hard reload. A DOM event reaches any
 * mounted view without threading a callback through the shell.
 */
const TASKS_CHANGED = "orbit:tasks-changed";

/** Announce that tasks were created, edited or deleted. */
export function notifyTasksChanged() {
  window.dispatchEvent(new Event(TASKS_CHANGED));
}

/** Re-run `reload` whenever anything in the app writes a task. */
export function useTasksChanged(reload: () => void) {
  useEffect(() => {
    window.addEventListener(TASKS_CHANGED, reload);
    return () => window.removeEventListener(TASKS_CHANGED, reload);
  }, [reload]);
}
