/**
 * Shared time helpers.
 *
 * Canonical clock strings are 12-hour with no leading zero: "5:00 PM".
 * Canonical date keys are "YYYY-MM-DD" in the *user's* time zone — never
 * `toISOString().slice(0,10)`, which is UTC and files evening tasks under
 * tomorrow for anyone west of Greenwich.
 */

// "5pm", "5:30 PM", "5.30pm", "530pm", "10:00a.m."
const CLOCK_12 = /^(\d{1,2})[:.]?(\d{2})?\s*(a\.?m\.?|p\.?m\.?)$/i;
// "14:00", "08:30"
const CLOCK_24 = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Parse a clock time into canonical 12-hour form, or null if it isn't one. */
export function normalizeClockTime(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "noon" || lower === "midday") return "12:00 PM";
  if (lower === "midnight") return "12:00 AM";

  const m12 = trimmed.match(CLOCK_12);
  if (m12) {
    const h = parseInt(m12[1], 10);
    const m = m12[2] ? parseInt(m12[2], 10) : 0;
    if (h < 1 || h > 12 || m > 59) return null;
    const mer = m12[3][0].toUpperCase() === "A" ? "AM" : "PM";
    return `${h}:${String(m).padStart(2, "0")} ${mer}`;
  }

  const m24 = trimmed.match(CLOCK_24);
  if (m24) {
    const h24 = parseInt(m24[1], 10);
    const mer = h24 >= 12 ? "PM" : "AM";
    return `${h24 % 12 === 0 ? 12 : h24 % 12}:${m24[2]} ${mer}`;
  }

  return null;
}

/** Minutes since midnight for a clock string, or null if unparseable. */
export function clockToMinutes(timeStr: string | null | undefined): number | null {
  const norm = normalizeClockTime(timeStr);
  if (!norm) return null;
  const [hm, mer] = norm.split(" ");
  const [h, m] = hm.split(":").map(Number);
  const h24 = mer === "PM" ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h;
  return h24 * 60 + m;
}

/**
 * A row written before `scheduled_time` was validated can hold a phrase like
 * "after my nap". Show it as flexible rather than handing the UI a time it
 * can't render.
 *
 * This rule was written out twice — once in `/api/tasks` GET and once in
 * `/api/ai/whats-next` — with two different predicates (`normalizeClockTime`
 * vs `clockToMinutes`), so the two routes could disagree about whether the
 * same row had a usable time. Repair is in-memory *only*: persisting it from a
 * read path once erased whatever the user had actually typed.
 */
export function withDisplayableTime<
  T extends { scheduled_time: string | null; type: string | null },
>(task: T): T {
  if (!task.scheduled_time || normalizeClockTime(task.scheduled_time)) return task;
  return { ...task, scheduled_time: null, type: "flexible" };
}

/**
 * Accept an IANA time zone only if the platform knows it — the value arrives
 * from a query param, so it is untrusted and `Intl` throws on garbage.
 */
export function resolveTimeZone(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return value;
  } catch {
    return undefined;
  }
}

/** "YYYY-MM-DD" for `date` in `timeZone` (defaults to the runtime's zone). */
export function localDateKey(date: Date = new Date(), timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Minutes since midnight for `date` in `timeZone`. */
export function localMinutesOfDay(date: Date = new Date(), timeZone?: string): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .split(":")
    .map(Number);
  return (h % 24) * 60 + m;
}

// Day arithmetic runs on UTC-midnight Dates so DST can never shift a calendar
// day; the zone has already been applied by localDateKey.
const keyToDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/**
 * The seven Mon–Sun date keys of the ISO week containing `date`.
 * `weekOffset` shifts whole weeks: -1 = last week, +1 = next week.
 */
export function isoWeekKeys(
  date: Date = new Date(),
  timeZone?: string,
  weekOffset = 0
): string[] {
  const today = keyToDate(localDateKey(date, timeZone));
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Monday-first weekday index (Mon = 0 … Sun = 6) for a date key. */
export function weekdayIndex(key: string): number {
  return (keyToDate(key).getUTCDay() + 6) % 7;
}

/** A date key `days` away from `key` (negative goes backwards). */
export function shiftDateKey(key: string, days: number): string {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Whole days from date key `from` to date key `to`; negative if `to` is past.
 * Both sides are UTC midnight, so no DST-shortened day can round the result.
 * Accepts full timestamps too, since Postgres may hand back "…T00:00:00+00".
 */
export function daysBetweenKeys(from: string, to: string): number {
  const ms = keyToDate(to.slice(0, 10)).getTime() - keyToDate(from.slice(0, 10)).getTime();
  return Math.round(ms / 86_400_000);
}

/** Seconds as "M:SS" / "H:MM:SS" for the focus timer readouts. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  if (mm < 60) return `${mm}:${ss}`;
  return `${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, "0")}:${ss}`;
}

/** The browser's IANA zone, for sending to date-sensitive API routes. */
export function clientTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
