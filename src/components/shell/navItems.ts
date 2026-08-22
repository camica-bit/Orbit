/**
 * One source of truth for the four shell destinations. SideNav and BottomNav
 * used to keep separate lists that disagreed on both label and icon for every
 * route (`hub` vs `psychology_alt`, "Personal Orbit" vs "Context"), so the same
 * destination looked like two different places on desktop and mobile.
 *
 * `short` exists only because the bottom tab bar has ~70px per tab.
 */
export const NAV_ITEMS = [
  { id: "today",    label: "Today's Focus",  short: "Today",    icon: "auto_awesome",   href: "/" },
  { id: "week",     label: "Weekly Flow",    short: "Week",     icon: "insights",       href: "/week" },
  { id: "orbit",    label: "Personal Orbit", short: "Orbit",    icon: "hub",            href: "/orbit" },
  // `/calendar` is deliberately absent: nothing is wired to a calendar
  // provider yet, and listing it here advertised an unbuilt integration as a
  // real destination. The route still exists and says so honestly; put it back
  // the moment OAuth actually works.
] as const;

/** `/` would otherwise prefix-match every route. */
export function isActiveHref(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
