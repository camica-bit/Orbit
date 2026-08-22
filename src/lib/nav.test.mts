import assert from "node:assert/strict";
import { test } from "node:test";
import { isActiveHref, NAV_ITEMS } from "../components/shell/navItems.ts";
import { safeNextPath } from "./nav.ts";

test("safeNextPath keeps same-origin paths", () => {
  assert.equal(safeNextPath("/week"), "/week");
  assert.equal(safeNextPath("/focus?taskId=abc"), "/focus?taskId=abc");
  assert.equal(safeNextPath("/"), "/");
});

test("safeNextPath rejects off-site redirect targets", () => {
  assert.equal(safeNextPath("//evil.example"), "/");
  assert.equal(safeNextPath("/\\evil.example"), "/");
  assert.equal(safeNextPath("https://evil.example"), "/");
  assert.equal(safeNextPath("javascript:alert(1)"), "/");
  assert.equal(safeNextPath("week"), "/");
  assert.equal(safeNextPath(null), "/");
  assert.equal(safeNextPath(undefined, "/login"), "/login");
});

// Note the argument order: `(pathname, href)`. The duplicate that used to sit in
// `nav.ts` took them the other way round, which is half of why it was deleted.
test("isActiveHref only matches the root exactly", () => {
  assert.equal(isActiveHref("/", "/"), true);
  assert.equal(isActiveHref("/week", "/"), false);
  assert.equal(isActiveHref("/week", "/week"), true);
  assert.equal(isActiveHref("/weekly-report", "/week"), true); // prefix match, by design
  assert.equal(isActiveHref("/", "/orbit"), false);
});

test("NAV_ITEMS hrefs and ids are unique", () => {
  assert.equal(new Set(NAV_ITEMS.map((i) => i.href)).size, NAV_ITEMS.length);
  assert.equal(new Set(NAV_ITEMS.map((i) => i.id)).size, NAV_ITEMS.length);
});

// Every nav destination must be a real route. `/calendar` was listed here while
// being an unbuilt placeholder, so a broken promise looked like a feature.
test("NAV_ITEMS points only at built routes", () => {
  assert.deepEqual(
    NAV_ITEMS.map((i) => i.href),
    ["/", "/week", "/orbit"],
  );
});
