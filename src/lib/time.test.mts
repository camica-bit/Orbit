import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clockToMinutes,
  daysBetweenKeys,
  formatDuration,
  isoWeekKeys,
  localDateKey,
  localMinutesOfDay,
  normalizeClockTime,
  resolveTimeZone,
  shiftDateKey,
  weekdayIndex,
  withDisplayableTime,
} from "./time.ts";

test("normalizeClockTime accepts the formats the AI and users produce", () => {
  assert.equal(normalizeClockTime("5pm"), "5:00 PM");
  assert.equal(normalizeClockTime("5:30 PM"), "5:30 PM");
  assert.equal(normalizeClockTime("5.30pm"), "5:30 PM");
  assert.equal(normalizeClockTime("10:00a.m."), "10:00 AM");
  assert.equal(normalizeClockTime("14:00"), "2:00 PM");
  assert.equal(normalizeClockTime("00:30"), "12:30 AM");
  assert.equal(normalizeClockTime("12:00"), "12:00 PM");
  assert.equal(normalizeClockTime("noon"), "12:00 PM");
  assert.equal(normalizeClockTime("midnight"), "12:00 AM");
});

test("normalizeClockTime rejects out-of-range and non-times", () => {
  // The pre-fix version returned "99:00 PM" for this.
  assert.equal(normalizeClockTime("99 PM"), null);
  assert.equal(normalizeClockTime("0 PM"), null);
  assert.equal(normalizeClockTime("13:70pm"), null);
  assert.equal(normalizeClockTime("after my nap"), null);
  assert.equal(normalizeClockTime("25:00"), null);
  assert.equal(normalizeClockTime(""), null);
  assert.equal(normalizeClockTime(null), null);
});

test("clockToMinutes orders times correctly across the meridiem", () => {
  assert.equal(clockToMinutes("12:00 AM"), 0);
  assert.equal(clockToMinutes("12:30 PM"), 750);
  assert.equal(clockToMinutes("11:59 PM"), 1439);
  // "5" alone is not a time — the old unanchored regex matched it anyway.
  assert.equal(clockToMinutes("meeting 5"), null);
  assert.ok(clockToMinutes("9:00 AM")! < clockToMinutes("9:00 PM")!);
});

test("localDateKey uses the given zone, not UTC", () => {
  // 03:30 UTC on the 23rd is still the 22nd in New York.
  const late = new Date("2026-08-23T03:30:00Z");
  assert.equal(localDateKey(late, "America/New_York"), "2026-08-22");
  assert.equal(localDateKey(late, "UTC"), "2026-08-23");
  assert.equal(localDateKey(late, "Asia/Tokyo"), "2026-08-23");
});

test("localMinutesOfDay reads the wall clock in the given zone", () => {
  const noonUtc = new Date("2026-08-22T12:00:00Z");
  assert.equal(localMinutesOfDay(noonUtc, "UTC"), 720);
  assert.equal(localMinutesOfDay(noonUtc, "America/New_York"), 480); // 08:00 EDT
});

test("isoWeekKeys returns Mon–Sun for the zone-local week", () => {
  // Saturday 2026-08-22 → week of Mon 2026-08-17.
  const keys = isoWeekKeys(new Date("2026-08-22T12:00:00Z"), "UTC");
  assert.deepEqual(keys, [
    "2026-08-17",
    "2026-08-18",
    "2026-08-19",
    "2026-08-20",
    "2026-08-21",
    "2026-08-22",
    "2026-08-23",
  ]);
  // Sunday must land at the end of the same week, not start a new one.
  assert.equal(isoWeekKeys(new Date("2026-08-23T12:00:00Z"), "UTC")[0], "2026-08-17");
  assert.equal(weekdayIndex("2026-08-17"), 0);
  assert.equal(weekdayIndex("2026-08-23"), 6);
});

test("resolveTimeZone drops values Intl would throw on", () => {
  assert.equal(resolveTimeZone("Europe/London"), "Europe/London");
  assert.equal(resolveTimeZone("../../etc/passwd"), undefined);
  assert.equal(resolveTimeZone(""), undefined);
  assert.equal(resolveTimeZone(null), undefined);
});

test("formatDuration never renders a negative clock", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(3600), "1:00:00");
  assert.equal(formatDuration(-5), "0:00");
});

test("isoWeekKeys pages whole weeks with weekOffset", () => {
  const sat = new Date("2026-08-22T12:00:00Z");
  assert.equal(isoWeekKeys(sat, "UTC", -1)[0], "2026-08-10");
  assert.equal(isoWeekKeys(sat, "UTC", 1)[0], "2026-08-24");
  assert.equal(isoWeekKeys(sat, "UTC", 0)[0], isoWeekKeys(sat, "UTC")[0]);
});

test("shiftDateKey crosses month, year and DST boundaries", () => {
  assert.equal(shiftDateKey("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDateKey("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDateKey("2026-12-31", 1), "2027-01-01");
  // US DST forward jump — day arithmetic must not lose or repeat a day.
  assert.equal(shiftDateKey("2026-03-08", -1), "2026-03-07");
  assert.equal(shiftDateKey("2026-03-08", 1), "2026-03-09");
  assert.equal(shiftDateKey("2026-08-22", 0), "2026-08-22");
});

test("daysBetweenKeys counts calendar days in both directions", () => {
  assert.equal(daysBetweenKeys("2026-08-22", "2026-08-25"), 3);
  assert.equal(daysBetweenKeys("2026-08-22", "2026-08-22"), 0);
  assert.equal(daysBetweenKeys("2026-08-22", "2026-08-20"), -2);
  // DST forward jump — a 23-hour day must still count as one day.
  assert.equal(daysBetweenKeys("2026-03-07", "2026-03-09"), 2);
  // Postgres may return a full timestamp for a date column.
  assert.equal(daysBetweenKeys("2026-08-22", "2026-09-01T00:00:00+00:00"), 10);
});

test("withDisplayableTime downgrades unparseable times without touching the rest", () => {
  const junk = { id: "a", scheduled_time: "after my nap", type: "fixed", title: "Nap" };
  assert.deepEqual(withDisplayableTime(junk), {
    id: "a",
    scheduled_time: null,
    type: "flexible",
    title: "Nap",
  });

  // A parseable time is returned untouched — same object, so no needless rerender.
  const good = { scheduled_time: "5:00 PM", type: "fixed" };
  assert.equal(withDisplayableTime(good), good);
  // An informational task with no time keeps its type; it isn't "flexible".
  const untimed = { scheduled_time: null, type: "informational" };
  assert.equal(withDisplayableTime(untimed), untimed);
  // Both routes previously used different predicates here; "14:00" is valid in
  // one form and must survive in both.
  const iso = { scheduled_time: "14:00", type: "fixed" };
  assert.equal(withDisplayableTime(iso), iso);
});

test("consecutive-day streak walk resets on a gap and ignores repeats", () => {
  // The shape /api/sessions uses: walk back while the day is present.
  const streak = (days: Set<string>, todayKey: string) => {
    let n = 0;
    for (let k = todayKey; days.has(k); k = shiftDateKey(k, -1)) n++;
    return n;
  };
  assert.equal(streak(new Set(["2026-08-22", "2026-08-21", "2026-08-20"]), "2026-08-22"), 3);
  // Two sessions on the same day are one day, not two.
  assert.equal(streak(new Set(["2026-08-22", "2026-08-20"]), "2026-08-22"), 1);
  // A skipped week resets rather than carrying the old count.
  assert.equal(streak(new Set(["2026-08-22", "2026-08-14"]), "2026-08-22"), 1);
});
