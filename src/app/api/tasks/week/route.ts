import { getAuthUser } from "@/lib/supabase/server";

/**
 * GET /api/tasks/week
 * Returns task counts + hours grouped by weekday for the current ISO week (Mon–Sun) scoped to user.
 */
export async function GET() {
  const { supabase, user } = await getAuthUser();

  // Monday of current ISO week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Initialize empty Mon-Sun buckets
  const byDate: Record<string, { tasks: any[]; totalMins: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    byDate[d.toISOString().slice(0, 10)] = { tasks: [], totalMins: 0 };
  }

  if (!user) {
    const days = Object.entries(byDate).map(([date, { tasks: t, totalMins }]) => ({
      date,
      taskCount: t.length,
      hours: Math.round((totalMins / 60) * 10) / 10,
      tasks: t,
    }));
    return Response.json({ days, weekStart: monday.toISOString().slice(0, 10) });
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, estimated_mins, scheduled_date, status, type")
    .eq("user_id", user.id)
    .gte("scheduled_date", monday.toISOString().slice(0, 10))
    .lte("scheduled_date", sunday.toISOString().slice(0, 10));

  if (error) return Response.json({ error: error.message }, { status: 500 });

  for (const task of tasks ?? []) {
    const key = task.scheduled_date ?? "";
    if (byDate[key]) {
      byDate[key].tasks.push(task);
      byDate[key].totalMins += task.estimated_mins ?? 0;
    }
  }

  const days = Object.entries(byDate).map(([date, { tasks: t, totalMins }]) => ({
    date,
    taskCount: t.length,
    hours: Math.round((totalMins / 60) * 10) / 10,
    tasks: t,
  }));

  return Response.json({ days, weekStart: monday.toISOString().slice(0, 10) });
}
