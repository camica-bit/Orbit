import { getAuthUser } from "@/lib/supabase/server";
import { isoWeekKeys, localDateKey, resolveTimeZone } from "@/lib/time";
import type { NextRequest } from "next/server";

type WeekTask = {
  id: string;
  title: string;
  estimated_mins: number | null;
  scheduled_date: string | null;
  status: string | null;
  type: string | null;
};

/**
 * GET /api/tasks/week?tz=Area/City&offset=0
 * Returns task counts + hours grouped by weekday for one ISO week (Mon–Sun) scoped to user.
 * `offset` shifts whole weeks so the client can page backwards and forwards.
 *
 * The bucket keys, the query bounds and "which day is today" all come from the
 * same zone — mixing a local Monday with UTC date keys shifted the whole grid
 * by a day for anyone behind UTC. `today` is returned so the client never has
 * to compute it (a prerendered build-time date would disagree with the browser).
 */
export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthUser();

  const params = request.nextUrl.searchParams;
  const timeZone = resolveTimeZone(params.get("tz"));
  const offset = Math.trunc(Number(params.get("offset")) || 0);
  const now = new Date();
  const weekKeys = isoWeekKeys(now, timeZone, offset);
  const weekStart = weekKeys[0];
  const today = localDateKey(now, timeZone);

  // Initialize empty Mon-Sun buckets
  const byDate: Record<string, { tasks: WeekTask[]; totalMins: number }> = {};
  for (const key of weekKeys) {
    byDate[key] = { tasks: [], totalMins: 0 };
  }

  const toDays = () =>
    weekKeys.map((date) => ({
      date,
      taskCount: byDate[date].tasks.length,
      hours: Math.round((byDate[date].totalMins / 60) * 10) / 10,
      tasks: byDate[date].tasks,
    }));

  if (!user) {
    return Response.json({ days: toDays(), weekStart, today, offset });
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, estimated_mins, scheduled_date, status, type")
    .eq("user_id", user.id)
    .gte("scheduled_date", weekStart)
    .lte("scheduled_date", weekKeys[6]);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  for (const task of tasks ?? []) {
    const key = task.scheduled_date ?? "";
    if (byDate[key]) {
      byDate[key].tasks.push(task);
      byDate[key].totalMins += task.estimated_mins ?? 0;
    }
  }

  return Response.json({ days: toDays(), weekStart, today, offset });
}
