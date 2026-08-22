/**
 * Supabase connection settings, resolved once.
 *
 * No placeholder fallbacks: a missing env var used to produce
 * "https://placeholder-url.supabase.co" and surface as an opaque auth failure
 * at runtime. Throwing here fails the first request with the actual cause.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and set your Supabase project values.`
    );
  }
  return value;
}

export const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
export const supabaseAnonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
