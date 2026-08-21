import { getAuthUser } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function buildPrompt(contextSummary?: string, existingTasksSummary?: string): string {
  const nowStr = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
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

export type ExtractedTask = {
  title: string;
  description?: string | null;
  estimated_mins?: number;
  type?: "fixed" | "flexible" | "informational";
  scheduled_time?: string | null;
  icon?: string;
  meta?: string | null;
  ai_rationale?: string | null;
  priority?: number;
};

export function normalizeClockTime(timeStr: string): string | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  // 12-hour format e.g. 10:00 AM, 10 AM, 10:00am, 5pm
  const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12) {
    const h = parseInt(match12[1], 10);
    const m = match12[2] ?? "00";
    const mer = match12[3].toUpperCase();
    return `${h}:${m} ${mer}`;
  }
  // 24-hour format e.g. 14:00, 08:30, 17:00
  const match24 = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    const m = match24[2];
    const mer = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${mer}`;
  }
  return null;
}

export function resolveTimeToClock(
  rawTimeOrText: string | null | undefined,
  contextDirectives: string[] = [],
  existingTasks: { title: string; scheduled_time?: string | null }[] = []
): { time: string | null; rationale?: string } {
  if (!rawTimeOrText) return { time: null };

  // Direct valid clock time
  const directNorm = normalizeClockTime(rawTimeOrText);
  if (directNorm) return { time: directNorm };

  return { time: null };
}

function sanitizeTask(
  raw: any,
  fallbackText: string,
  _contextDirectives: string[] = [],
  _existingTasks: { title: string; scheduled_time?: string | null }[] = []
): ExtractedTask {
  const directTime = raw.scheduled_time ? normalizeClockTime(String(raw.scheduled_time)) : null;

  const validTypes = ["fixed", "flexible", "informational"];
  let type: "fixed" | "flexible" | "informational" = "flexible";
  if (directTime) {
    type = "fixed";
  } else if (raw.type && validTypes.includes(String(raw.type).toLowerCase())) {
    type = String(raw.type).toLowerCase() as any;
  }

  let priority = 5;
  if (typeof raw.priority === "number" && !isNaN(raw.priority)) {
    priority = Math.max(1, Math.min(10, Math.round(raw.priority)));
  } else if (typeof raw.priority === "string") {
    const pLower = raw.priority.toLowerCase();
    if (pLower.includes("high") || pLower.includes("urgent")) priority = 9;
    else if (pLower.includes("low")) priority = 3;
  }
  if (directTime && priority < 7) priority = 8;

  let mins = 30;
  if (typeof raw.estimated_mins === "number" && raw.estimated_mins > 0) {
    mins = Math.round(raw.estimated_mins);
  }

  const rationale = raw.ai_rationale
    ? String(raw.ai_rationale).trim()
    : directTime
    ? `Scheduled for ${directTime} based on your Orbit schedule.`
    : "Added to your Orbit workflow.";

  return {
    title: raw.title ? String(raw.title).trim() : fallbackText.slice(0, 60),
    description: raw.description ? String(raw.description).trim() : null,
    estimated_mins: mins,
    type,
    scheduled_time: directTime,
    icon: raw.icon ? String(raw.icon).trim() : "task_alt",
    meta: raw.meta ? (typeof raw.meta === "object" ? `${mins} min` : String(raw.meta).trim()) : `${mins} min`,
    ai_rationale: rationale,
    priority,
  };
}

function localFallback(
  text: string,
  contextDirectives: string[] = [],
  existingTasks: { title: string; scheduled_time?: string | null }[] = []
): ExtractedTask[] {
  const durMatch = text.match(/(\d+)\s*(?:hours?|hrs?|mins?|minutes?)/i);
  let mins = 30;
  if (durMatch) {
    const val = parseInt(durMatch[1], 10);
    if (/hours?|hrs?/i.test(durMatch[0])) mins = val * 60;
    else mins = val;
  }

  return [
    sanitizeTask(
      {
        title: text.length > 60 ? text.slice(0, 60) + "…" : text,
        description: text,
        estimated_mins: mins,
        icon: "task_alt",
        meta: `${mins} min`,
      },
      text,
      contextDirectives,
      existingTasks
    ),
  ];
}

async function queryModel(
  model: string,
  text: string,
  contextSummary?: string,
  existingTasksSummary?: string,
  contextDirectives: string[] = [],
  existingTasks: { title: string; scheduled_time?: string | null }[] = []
): Promise<ExtractedTask[]> {
  const prompt = buildPrompt(contextSummary, existingTasksSummary);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt + text }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini ${model} returned ${res.status}: ${errBody}`);
  }

  const json = await res.json();
  const raw: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.map((item) => sanitizeTask(item, text, contextDirectives, existingTasks));
}

async function callGemini(
  text: string,
  contextSummary?: string,
  existingTasksSummary?: string,
  contextDirectives: string[] = [],
  existingTasks: { title: string; scheduled_time?: string | null }[] = []
): Promise<ExtractedTask[]> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
    return localFallback(text, contextDirectives, existingTasks);
  }

  const models = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest", "gemini-pro-latest"];

  for (const model of models) {
    try {
      const results = await queryModel(
        model,
        text,
        contextSummary,
        existingTasksSummary,
        contextDirectives,
        existingTasks
      );
      if (results && results.length > 0) {
        return results;
      }
    } catch (err: any) {
      console.warn(`[Orbit AI] Model ${model} failed, attempting next model...`, err.message);
    }
  }

  // If all API calls fail, gracefully fallback to local parser
  console.warn("[Orbit AI] All Gemini models unavailable, using local intelligent fallback.");
  return localFallback(text, contextDirectives, existingTasks);
}

/**
 * POST /api/ai/extract
 * Body: { text: string }
 * Calls Gemini AI to extract structured tasks, saves them to Supabase for the current user.
 */
export async function POST(request: NextRequest) {
  const { text } = await request.json();
  if (!text?.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const { supabase, user } = await getAuthUser();
    const userId = user?.id ?? null;
    const todayStr = new Date().toISOString().slice(0, 10);

    // Fetch user's active personal context from Supabase
    let contextDirectives: string[] = [];
    if (userId) {
      const { data: ctxData } = await supabase
        .from("context_items")
        .select("category, content, is_major_event, event_date")
        .eq("user_id", userId);

      if (ctxData && ctxData.length > 0) {
        contextDirectives = ctxData.map(
          (c) => `[${c.category}] ${c.content}${c.event_date ? ` (Date: ${c.event_date})` : ""}`
        );
      }
    }

    // Fetch user's existing tasks for today
    let existingTasks: { title: string; scheduled_time: string | null; type: string | null }[] = [];
    if (userId) {
      const { data: taskData } = await supabase
        .from("tasks")
        .select("title, scheduled_time, type")
        .eq("user_id", userId)
        .in("status", ["pending", "active"])
        .eq("scheduled_date", todayStr);

      if (taskData) {
        existingTasks = taskData;
      }
    }

    const contextSummary = contextDirectives.length > 0 ? contextDirectives.join("\n") : undefined;
    const existingTasksSummary = existingTasks.length > 0
      ? existingTasks.map((t) => `- ${t.title}${t.scheduled_time ? ` (Scheduled: ${t.scheduled_time})` : " (Flexible)"}`).join("\n")
      : undefined;

    const extracted = await callGemini(
      text.trim(),
      contextSummary,
      existingTasksSummary,
      contextDirectives,
      existingTasks
    );

    // Save raw transcript
    await supabase
      .from("transcripts")
      .insert({
        user_id: userId,
        raw_text: text.trim(),
        extracted_tasks: extracted as any,
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
  } catch (err: any) {
    console.error("[/api/ai/extract] Extraction failure:", err);
    return Response.json({ error: err.message ?? "AI extraction failed" }, { status: 500 });
  }
}
