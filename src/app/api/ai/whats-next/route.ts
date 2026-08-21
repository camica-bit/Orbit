import { getAuthUser } from "@/lib/supabase/server";
import { normalizeClockTime, resolveTimeToClock } from "@/app/api/ai/extract/route";

/**
 * GET /api/ai/whats-next
 *
 * Time-aware task ranking algorithm ("What's Next") scoped to authenticated user:
 * 1. Fetch pending/active tasks for current user
 * 2. Parse any scheduled_time values against the current hour
 * 3. Boost tasks that are scheduled "soon" (within 2 hours)
 * 4. Penalise tasks that conflict with imminent fixed commitments
 * 5. Return the top-ranked task with an AI rationale
 */
export async function GET() {
  const { supabase, user } = await getAuthUser();

  if (!user) {
    return Response.json({
      task: null,
      rationale: "Sign in to Orbit to initialize your personal schedule.",
    });
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["pending", "active"])
    .order("priority", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!tasks || tasks.length === 0) {
    return Response.json({
      task: null,
      rationale: "No pending tasks. Tell Orbit what's on your mind below.",
    });
  }

  // Pre-resolve any tasks that had relative/unresolved scheduled_time
  const { data: ctxData } = await supabase
    .from("context_items")
    .select("category, content, event_date")
    .eq("user_id", user.id);

  const contextDirectives = (ctxData ?? []).map(
    (c) => `[${c.category}] ${c.content}${c.event_date ? ` (Date: ${c.event_date})` : ""}`
  );

  for (const t of tasks) {
    if (t.scheduled_time && !normalizeClockTime(t.scheduled_time)) {
      const resolved = resolveTimeToClock(t.scheduled_time, contextDirectives, []);
      t.scheduled_time = resolved.time;
      if (resolved.time) {
        t.type = "fixed";
        if (resolved.rationale) t.ai_rationale = resolved.rationale;
      }
    }
  }

  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;

  // ─── Scoring ────────────────────────────────────────────────────────────────
  const scored = tasks.map((task) => {
    let score = (task.priority ?? 5) * 10; // base: 10–100

    const scheduledRaw = task.scheduled_time?.toLowerCase() ?? "";

    // Parse a simple "HH AM/PM" or "HH:MM" time from the scheduled_time string
    const timeMatch = scheduledRaw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();
      if (meridiem === "pm" && h < 12) h += 12;
      if (meridiem === "am" && h === 12) h = 0;
      const taskHour = h + m / 60;
      const hoursUntil = taskHour - nowHour;

      if (task.type === "fixed") {
        // Fixed upcoming: very high urgency if < 1 h away
        if (hoursUntil > 0 && hoursUntil <= 1) score += 50;
        else if (hoursUntil > 0 && hoursUntil <= 2) score += 25;
        else if (hoursUntil < 0) score -= 20; // already past
      } else {
        // Flexible — boost if we have a window before next fixed commitment
        if (hoursUntil > 0 && hoursUntil <= 2) score += 15;
      }
    }

    // Flexible tasks with no scheduled time get a small urgency boost (do now)
    if (task.type === "flexible" && !scheduledRaw) score += 5;

    // Informational tasks are low priority
    if (task.type === "informational") score -= 30;

    return { task, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0].task;

  // Build a time-aware rationale if none exists
  const timeOfDay =
    nowHour < 12 ? "morning" : nowHour < 17 ? "afternoon" : "evening";
  const rationale =
    winner.ai_rationale ??
    `Best ${timeOfDay} task given your current schedule and priority.`;

  return Response.json({ task: winner, rationale });
}
