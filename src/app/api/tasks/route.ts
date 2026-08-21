import { getAuthUser } from "@/lib/supabase/server";
import { normalizeClockTime, resolveTimeToClock } from "@/app/api/ai/extract/route";
import type { NextRequest } from "next/server";

// GET /api/tasks — returns all pending/active tasks for current user ordered by priority
export async function GET() {
  const { supabase, user } = await getAuthUser();

  if (!user) {
    return Response.json({ tasks: [] });
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["pending", "active"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!tasks) return Response.json({ tasks: [] });

  // Auto-resolve any non-clock scheduled_time using context items
  const hasInvalidTimes = tasks.some(
    (t) => t.scheduled_time && !normalizeClockTime(t.scheduled_time)
  );

  if (hasInvalidTimes) {
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
        const newTime = resolved.time;
        t.scheduled_time = newTime;
        if (newTime) {
          t.type = "fixed";
          if (resolved.rationale) t.ai_rationale = resolved.rationale;
        }
        await supabase
          .from("tasks")
          .update({
            scheduled_time: newTime,
            type: newTime ? "fixed" : "flexible",
            ai_rationale: t.ai_rationale,
          })
          .eq("id", t.id)
          .eq("user_id", user.id);
      }
    }
  }

  return Response.json({ tasks });
}

// POST /api/tasks — create one or more tasks scoped to current user
export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthUser();
  const body = await request.json();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawTasks = Array.isArray(body) ? body : [body];
  const tasksWithUser = rawTasks.map((t) => ({
    ...t,
    user_id: user.id,
  }));

  const { data, error } = await supabase.from("tasks").insert(tasksWithUser).select();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ tasks: data }, { status: 201 });
}

// PATCH /api/tasks — update task for current user
export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getAuthUser();
  const { id, ...updates } = await request.json();

  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ task: data });
}
