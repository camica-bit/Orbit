/**
 * `NAV_ITEMS` and `isActiveNav` used to live here as well as in
 * `src/components/shell/navItems.ts` — with different icons in each copy, which
 * is the same desktop/mobile drift the shared list was created to end. The
 * shell module is the single source of truth; this file keeps only the redirect
 * guard, which has nothing to do with the nav list.
 */

/**
 * Constrain a `?next=` redirect target to this origin.
 *
 * `${origin}${next}` with an attacker-supplied `next` of `//evil.example`
 * produces a protocol-relative URL and sends the freshly-authenticated user
 * off-site, so anything that isn't a single-slash absolute path is discarded.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/")) return fallback;
  // "//host" is protocol-relative; browsers also normalise "\" to "/", so
  // "/\host" collapses to the same thing.
  if (next[1] === "/" || next[1] === "\\") return fallback;
  return next;
}
