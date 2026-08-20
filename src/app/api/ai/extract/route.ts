import { getAuthUser } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const EXTRACT_PROMPT = `You are Orbit, an AI-powered personal operating environment and planner.
Extract tasks and events from the user's natural language input.

Return ONLY a valid JSON array of task objects matching this schema:
[
  {
    "title": "Short action-oriented title",
    "description": "Optional detail or null",
    "estimated_mins": 30, // integer minutes
    "type": "flexible", // MUST be strictly one of: "flexible", "fixed", "informational"
    "scheduled_time": "8:00 PM", // e.g. "8:00 PM" or "Morning" or null if flexible
    "icon": "task_alt", // Material symbol name (e.g. code, fitness_center, book, school, sports_motorsports, task_alt, work, restaurant, local_cafe)
    "meta": "30 min", // Short duration or location tag
    "ai_rationale": "One concise sentence on why Orbit recommends this",
    "priority": 7 // integer 1-10 (10 = highest)
  }
]

User input: `;

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

function sanitizeTask(raw: any, fallbackText: string): ExtractedTask {
  const validTypes = ["fixed", "flexible", "informational"];
  let type: "fixed" | "flexible" | "informational" = "flexible";
  if (raw.type && validTypes.includes(String(raw.type).toLowerCase())) {
    type = String(raw.type).toLowerCase() as any;
  } else if (raw.scheduled_time) {
    type = "fixed";
  }

  let priority = 5;
  if (typeof raw.priority === "number" && !isNaN(raw.priority)) {
    priority = Math.max(1, Math.min(10, Math.round(raw.priority)));
  } else if (typeof raw.priority === "string") {
    const pLower = raw.priority.toLowerCase();
    if (pLower.includes("high") || pLower.includes("urgent")) priority = 9;
    else if (pLower.includes("low")) priority = 3;
  }

  let mins = 30;
  if (typeof raw.estimated_mins === "number" && raw.estimated_mins > 0) {
    mins = Math.round(raw.estimated_mins);
  }

  return {
    title: raw.title ? String(raw.title).trim() : fallbackText.slice(0, 60),
    description: raw.description ? String(raw.description).trim() : null,
    estimated_mins: mins,
    type,
    scheduled_time: raw.scheduled_time ? String(raw.scheduled_time).trim() : null,
    icon: raw.icon ? String(raw.icon).trim() : "task_alt",
    meta: raw.meta ? (typeof raw.meta === "object" ? `${mins} min` : String(raw.meta).trim()) : `${mins} min`,
    ai_rationale: raw.ai_rationale ? String(raw.ai_rationale).trim() : "Added via Orbit AI directive.",
    priority,
  };
}

function localFallback(text: string): ExtractedTask[] {
  const timeMatch = text.match(/(?:at|by|for)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))/);
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
        type: timeMatch ? "fixed" : "flexible",
        scheduled_time: timeMatch ? timeMatch[1] : null,
        icon: "task_alt",
        meta: `${mins} min`,
        ai_rationale: "Parsed from your natural language input directive.",
        priority: timeMatch ? 8 : 6,
      },
      text
    ),
  ];
}

async function queryModel(model: string, text: string): Promise<ExtractedTask[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: EXTRACT_PROMPT + text }] }],
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
  return items.map((item) => sanitizeTask(item, text));
}

async function callGemini(text: string): Promise<ExtractedTask[]> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
    return localFallback(text);
  }

  const models = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];

  for (const model of models) {
    try {
      const results = await queryModel(model, text);
      if (results && results.length > 0) {
        return results;
      }
    } catch (err: any) {
      console.warn(`[Orbit AI] Model ${model} failed, attempting next model...`, err.message);
    }
  }

  // If all API calls fail, gracefully fallback to local parser
  console.warn("[Orbit AI] All Gemini models unavailable, using local intelligent fallback.");
  return localFallback(text);
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
    const extracted = await callGemini(text.trim());
    const todayStr = new Date().toISOString().slice(0, 10);
    const userId = user?.id ?? null;

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
