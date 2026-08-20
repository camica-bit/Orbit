import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton for client-side usage
let browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

// Server-side (API routes) — fresh instance each call is fine since Next.js
// route handlers don't share module-level state across requests in prod.
export function getSupabaseServer() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
