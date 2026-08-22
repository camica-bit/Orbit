import { getAuthUser } from "@/lib/supabase/server";
import {
  clockToMinutes,
  localDateKey,
  localMinutesOfDay,
  resolveTimeZone,
  withDisplayableTime,
} from "@/lib/time";
import type { NextRequest } from "next/server";

/**
 * GET /api/ai/whats-next?tz=Area/City
 *
 * Time-aware task ranking algorithm ("What's Next") scoped to authenticated user:
 * 1. Fetch pending/active tasks scheduled for the user's today (or undated)
 * 2. Parse any scheduled_time values against the current wall clock
 * 3. Boost tasks that are scheduled "soon" (within 2 hours)
 * 4. Penalise tasks that conflict with imminent fixed commitments
 * 5. Return the top-ranked task with an AI rationale
 */
export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthUser();

  if (!user) {
    return Response.json({
      task: null,
      rationale: "Sign in to Orbit to initialize your personal schedule.",
    });
  }

  const timeZone = resolveTimeZone(request.nextUrl.searchParams.get("tz"));
  const today = localDateKey(new Date(), timeZone);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["pending", "active"])
    // Without a date bound this happily proposed a task from next week.
    // Undated rows predate scheduled_date and would otherwise disappear.
    .or(`scheduled_date.eq.${today},scheduled_date.is.null`)
    .order("priority", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const noTasks = {
    task: null,
    rationale: "No pending tasks. Tell Orbit what's on your mind below.",
  };
  if (!tasks || tasks.length === 0) return Response.json(noTasks);

  const nowMinutes = localMinutesOfDay(new Date(), timeZone);

  // ─── Scoring ────────────────────────────────────────────────────────────────
  const scored = tasks.map((task) => {
    let score = (task.priority ?? 5) * 10; // base: 10–100

    // Anchored parse: the old regex was unanchored with an optional meridiem,
    // so a bare "3" scored as 3 AM and "meeting at 5" matched the wrong digits.
    const scheduledMinutes = clockToMinutes(task.scheduled_time);

    if (scheduledMinutes !== null) {
      const hoursUntil = (scheduledMinutes - nowMinutes) / 60;

      if (task.type === "fixed") {
        // Fixed upcoming: very high urgency if < 1 h away
        if (hoursUntil > 0 && hoursUntil <= 1) score += 50;
        else if (hoursUntil > 0 && hoursUntil <= 2) score += 25;
        else if (hoursUntil < 0) score -= 20; // already past
      } else {
        // Flexible — boost if we have a window before next fixed commitment
        if (hoursUntil > 0 && hoursUntil <= 2) score += 15;
      }
    } else if (task.type === "flexible") {
      // Flexible tasks with no usable time get a small urgency boost (do now)
      score += 5;
    }

    // Informational tasks are low priority
    if (task.type === "informational") score -= 30;

    return { task, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0]?.task;
  if (!winner) return Response.json(noTasks);

  // Build a time-aware rationale if none exists
  const nowHour = nowMinutes / 60;
  const timeOfDay = nowHour < 12 ? "morning" : nowHour < 17 ? "afternoon" : "evening";
  const rationale =
    winner.ai_rationale ??
    `Best ${timeOfDay} task given your current schedule and priority.`;

  // A legacy row can still hold "after my nap"; show it as flexible rather than
  // handing the UI a time it can't render.
  const task = withDisplayableTime(winner);

  return Response.json({ task, rationale });
}
