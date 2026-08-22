import { getAuthUser } from "@/lib/supabase/server";
import { localDateKey, resolveTimeZone, shiftDateKey } from "@/lib/time";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { NextRequest } from "next/server";

const STREAK_WINDOW_DAYS = 120;

/**
 * Consecutive days — including today — on which the user completed a session.
 *
 * The client used to send `(lastSession.streak ?? 0) + 1`, which double-counted
 * two sessions in the same minute and never reset after a skipped week. Deriving
 * it from the distinct completion days makes both cases fall out for free: a
 * second session today lands on a day already in the set, and any gap ends the
 * walk.
 */
async function currentStreak(
  supabase: SupabaseClient<Database>,
  userId: string,
  todayKey: string,
  timeZone: string | undefined
): Promise<number> {
  const since = new Date(Date.now() - STREAK_WINDOW_DAYS * 86_400_000).toISOString();

  const { data } = await supabase
    .from("sessions")
    .select("completed_at")
    .eq("user_id", userId)
    .gte("completed_at", since);

  const days = new Set<string>([todayKey]); // the session being saved right now
  for (const row of data ?? []) {
    if (row.completed_at) days.add(localDateKey(new Date(row.completed_at), timeZone));
  }

  let streak = 0;
  // ponytail: caps at STREAK_WINDOW_DAYS; widen the window if anyone gets there.
  for (let key = todayKey; days.has(key); key = shiftDateKey(key, -1)) streak++;
  return streak;
}

// POST /api/sessions — save a completed focus session scoped to current user
export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { task_id, task_title, estimated_mins, actual_mins, efficiency_score } = body;

  if (typeof task_title !== "string" || !task_title.trim() || !estimated_mins) {
    return Response.json({ error: "task_title and estimated_mins required" }, { status: 400 });
  }

  const timeZone = resolveTimeZone(typeof body.timeZone === "string" ? body.timeZone : null);
  const todayKey = localDateKey(new Date(), timeZone);
  const streak = await currentStreak(supabase, user.id, todayKey, timeZone);

  // Persist session
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      task_id: typeof task_id === "string" ? task_id : null,
      task_title: task_title.trim(),
      estimated_mins: Number(estimated_mins),
      actual_mins: Number(actual_mins) || 0,
      efficiency_score: Number(efficiency_score) || 0,
      streak,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Mark the task as completed if task_id provided
  if (typeof task_id === "string" && task_id) {
    await supabase
      .from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", task_id)
      .eq("user_id", user.id);
  }

  return Response.json({ session: data }, { status: 201 });
}

// GET /api/sessions — get last N sessions for streak/stats for current user
export async function GET() {
  const { supabase, user } = await getAuthUser();

  if (!user) {
    return Response.json({ sessions: [] });
  }

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ sessions: data });
}
