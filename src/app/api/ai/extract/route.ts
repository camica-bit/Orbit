import { getAuthUser } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import { localDateKey, normalizeClockTime, resolveTimeZone } from "@/lib/time";
import type { NextRequest } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS = (
  process.env.GEMINI_MODELS ??
  "gemini-3.6-flash,gemini-3.7-flash,gemini-flash-latest,gemini-pro-latest"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 12_000);

const MAX_INPUT_CHARS = 4000;
const MAX_TASK_MINS = 24 * 60;

/**
 * Per-user throttle on a paid endpoint.
 *
 * ponytail: in-memory, so the budget is per server process. Move the counter
 * into Postgres or Redis if Orbit ever runs more than one instance.
 */
const RATE_LIMIT = { max: 20, windowMs: 5 * 60_000 };
const recentCalls = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const fresh = (recentCalls.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recentCalls.size > 1000) {
    for (const [key, times] of recentCalls) {
      if (times.every((t) => now - t >= RATE_LIMIT.windowMs)) recentCalls.delete(key);
    }
  }
  if (fresh.length >= RATE_LIMIT.max) {
    recentCalls.set(userId, fresh);
    return true;
  }
  fresh.push(now);
  recentCalls.set(userId, fresh);
  return false;
}

function buildPrompt(nowStr: string, contextSummary?: string, existingTasksSummary?: string): string {
  return `You are Orbit, an AI-powered personal operating environment and autonomous scheduler.
Your objective is to extract actionable tasks and events from the user's input, scheduling them accurately while reasoning over their personal context and constraints.

CURRENT SYSTEM TIME & DATE:
${nowStr}

${
  contextSummary
    ? `USER'S PERSONAL CONTEXT & CONSTRAINTS:
The following items represent the user's active commitments, routines, daily rhythms, habits, and preferences stored in Orbit. Account for ALL of them as real-world scheduling constraints:
${contextSummary}
`
    : ""
}
${
  existingTasksSummary
    ? `EXISTING SCHEDULED TASKS FOR TODAY:
${existingTasksSummary}
`
    : ""
}

REASONING & SCHEDULING GUIDELINES:
1. Title Extraction:
   - Extract a clean, concise, action-oriented title (e.g. "Meeting", "Study Calculus", "Team Sync", "Dentist Appointment").
   - NEVER use the user's conversational command or raw prompt sentence (e.g. "I have a meeting after I take my nap so add a task for that", "remind me to...", "add a task for...") as the title.
2. Dynamic Schedule & Constraint Reasoning:
   - Reason over ALL user personal context constraints and today's existing tasks.
   - When the user schedules in relation to a context event or daily rhythm (e.g. "after my nap", "before standup", "after lecture"):
     - Look up that event's start and end times in Personal Context or Existing Tasks.
     - "after [event]": lock "scheduled_time" to the exact END time of that event (e.g. if nap is 4:00 PM to 5:00 PM, "after my nap" -> "5:00 PM").
     - "before [event]": lock "scheduled_time" to finish before the START time of that event.
   - Meetings, calls, appointments, and events anchored to a specific time or context rhythm MUST be type: "fixed" with a locked "scheduled_time".
   - Only set type: "flexible" and "scheduled_time": null if the task has no specific time anchor and can happen anytime during the day.
3. Output Specifications:
   - "scheduled_time" MUST strictly be a standard 12-hour clock time (e.g. "5:00 PM", "10:00 AM", "2:30 PM") or null if completely flexible.
   - NEVER output relative or placeholder text (like "after nap") in "scheduled_time".
   - "ai_rationale" MUST concisely explain how the time was calculated (e.g. "Scheduled for 5:00 PM immediately following your nap (4:00 PM – 5:00 PM).").

Return ONLY a valid JSON array of task objects matching this schema:
[
  {
    "title": "Meeting",
    "description": null,
    "estimated_mins": 30, // integer minutes
    "type": "fixed", // strictly one of: "fixed", "flexible", "informational"
    "scheduled_time": "5:00 PM", // standard 12-hour clock format (e.g. "5:00 PM", "10:00 AM") or null
    "icon": "groups", // Material symbol name matching the activity
    "meta": "30 min", // Short duration tag
    "ai_rationale": "Scheduled for 5:00 PM immediately following your nap (4:00 PM – 5:00 PM).",
    "priority": 8 // integer 1-10
  }
]

User input: `;
}

const TASK_TYPES = ["fixed", "flexible", "informational"] as const;
type TaskType = (typeof TASK_TYPES)[number];

export type ExtractedTask = {
  title: string;
  description?: string | null;
  estimated_mins?: number;
  type?: TaskType;
  scheduled_time?: string | null;
  icon?: string;
  meta?: string | null;
  ai_rationale?: string | null;
  priority?: number;
};

/** Trimmed string, or null for anything that isn't usable text. */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Coerce one model-produced object into a task we're willing to store.
 *
 * Everything here is untrusted: the model hallucinates fields, types, and
 * out-of-range numbers, so each value is range-checked rather than passed through.
 */
function sanitizeTask(raw: Record<string, unknown>, fallbackText: string): ExtractedTask {
  const directTime = normalizeClockTime(text(raw.scheduled_time));

  let type: TaskType = "flexible";
  const rawType = text(raw.type)?.toLowerCase();
  if (directTime) {
    type = "fixed";
  } else if (rawType && (TASK_TYPES as readonly string[]).includes(rawType)) {
    type = rawType as TaskType;
  }

  let priority = 5;
  if (typeof raw.priority === "number" && Number.isFinite(raw.priority)) {
    priority = Math.max(1, Math.min(10, Math.round(raw.priority)));
  } else if (typeof raw.priority === "string") {
    const pLower = raw.priority.toLowerCase();
    if (pLower.includes("high") || pLower.includes("urgent")) priority = 9;
    else if (pLower.includes("low")) priority = 3;
  }
  if (directTime && priority < 7) priority = 8;

  let mins = 30;
  if (typeof raw.estimated_mins === "number" && raw.estimated_mins > 0) {
    mins = Math.min(MAX_TASK_MINS, Math.round(raw.estimated_mins));
  }

  const rationale =
    text(raw.ai_rationale) ??
    (directTime
      ? `Scheduled for ${directTime} based on your Orbit schedule.`
      : "Added to your Orbit workflow.");

  return {
    title: text(raw.title) ?? fallbackText.slice(0, 60),
    description: text(raw.description),
    estimated_mins: mins,
    type,
    scheduled_time: directTime,
    icon: text(raw.icon) ?? "task_alt",
    meta: text(raw.meta) ?? `${mins} min`,
    ai_rationale: rationale,
    priority,
  };
}

function localFallback(input: string): ExtractedTask[] {
  const durMatch = input.match(/(\d+)\s*(?:hours?|hrs?|mins?|minutes?)/i);
  let mins = 30;
  if (durMatch) {
    const val = parseInt(durMatch[1], 10);
    if (/hours?|hrs?/i.test(durMatch[0])) mins = val * 60;
    else mins = val;
  }

  return [
    sanitizeTask(
      {
        title: input.length > 60 ? input.slice(0, 60) + "…" : input,
        description: input,
        estimated_mins: mins,
        icon: "task_alt",
        meta: `${mins} min`,
      },
      input
    ),
  ];
}

async function queryModel(
  model: string,
  input: string,
  nowStr: string,
  contextSummary?: string,
  existingTasksSummary?: string
): Promise<ExtractedTask[]> {
  const prompt = buildPrompt(nowStr, contextSummary, existingTasksSummary);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt + input }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          maxOutputTokens: 2048,
        },
      }),
      // Without this one hung upstream request stalls the user's submit forever.
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini ${model} returned ${res.status}: ${errBody}`);
  }

  const json = await res.json();
  const raw: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Gemini ${model} returned malformed JSON`);
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => sanitizeTask(item, input));
}

async function callGemini(
  input: string,
  nowStr: string,
  contextSummary?: string,
  existingTasksSummary?: string
): Promise<ExtractedTask[]> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
    return localFallback(input);
  }

  for (const model of GEMINI_MODELS) {
    try {
      const results = await queryModel(model, input, nowStr, contextSummary, existingTasksSummary);
      if (results.length > 0) {
        return results;
      }
    } catch (err) {
      console.warn(
        `[Orbit AI] Model ${model} failed, attempting next model...`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // If all API calls fail, gracefully fallback to local parser
  console.warn("[Orbit AI] All Gemini models unavailable, using local intelligent fallback.");
  return localFallback(input);
}

/**
 * POST /api/ai/extract
 * Body: { text: string, timeZone?: string }
 * Calls Gemini AI to extract structured tasks, saves them to Supabase for the current user.
 */
export async function POST(request: NextRequest) {
  let body: { text?: unknown; timeZone?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = text(body.text);
  if (!input) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  if (input.length > MAX_INPUT_CHARS) {
    return Response.json(
      { error: `text must be ${MAX_INPUT_CHARS} characters or fewer` },
      { status: 413 }
    );
  }

  const { supabase, user } = await getAuthUser();
  // Anonymous requests used to burn Gemini quota and insert user_id: null rows
  // that no user could ever read back through RLS.
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (rateLimited(user.id)) {
    return Response.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  try {
    const userId = user.id;
    // The client's zone, validated — Intl throws on anything it doesn't know.
    // Falling back to the server's zone files evening tasks on tomorrow's date
    // for anyone behind UTC, which is what "vanished from Today" looked like.
    const timeZone = resolveTimeZone(typeof body.timeZone === "string" ? body.timeZone : null);
    const todayStr = localDateKey(new Date(), timeZone);
    const nowStr = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone,
    });

    // Fetch user's active personal context from Supabase
    const { data: ctxData } = await supabase
      .from("context_items")
      .select("category, content, is_major_event, event_date")
      .eq("user_id", userId);

    const contextDirectives = (ctxData ?? []).map(
      (c) => `[${c.category}] ${c.content}${c.event_date ? ` (Date: ${c.event_date})` : ""}`
    );

    // Fetch user's existing tasks for today
    const { data: taskData } = await supabase
      .from("tasks")
      .select("title, scheduled_time, type")
      .eq("user_id", userId)
      .in("status", ["pending", "active"])
      .eq("scheduled_date", todayStr);

    const existingTasks = taskData ?? [];

    const contextSummary = contextDirectives.length > 0 ? contextDirectives.join("\n") : undefined;
    const existingTasksSummary =
      existingTasks.length > 0
        ? existingTasks
            .map(
              (t) =>
                `- ${t.title}${t.scheduled_time ? ` (Scheduled: ${t.scheduled_time})` : " (Flexible)"}`
            )
            .join("\n")
        : undefined;

    const extracted = await callGemini(input, nowStr, contextSummary, existingTasksSummary);

    // Save raw transcript
    await supabase.from("transcripts").insert({
      user_id: userId,
      raw_text: input,
      extracted_tasks: extracted as unknown as Json,
    });

    // Insert all extracted tasks into Supabase scoped to user
    const { data: tasks, error } = await supabase
      .from("tasks")
      .insert(
        extracted.map((t) => ({
          user_id: userId,
          title: t.title,
          description: t.description ?? null,
          estimated_mins: t.estimated_mins ?? 30,
          type: t.type ?? "flexible",
          scheduled_time: t.scheduled_time ?? null,
          scheduled_date: todayStr,
          icon: t.icon ?? "task_alt",
          meta: t.meta ?? `${t.estimated_mins ?? 30} min`,
          ai_rationale: t.ai_rationale ?? null,
          priority: t.priority ?? 5,
          status: "pending",
        }))
      )
      .select();

    if (error) {
      console.error("[/api/ai/extract] Supabase insert error:", error);
      throw error;
    }

    return Response.json({ tasks, extracted }, { status: 201 });
  } catch (err) {
    // Raw Supabase/Gemini errors name columns, queries and models — log them,
    // don't ship them.
    console.error("[/api/ai/extract] Extraction failure:", err);
    return Response.json({ error: "AI extraction failed. Please try again." }, { status: 500 });
  }
}
