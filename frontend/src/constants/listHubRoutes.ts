/** GRS list hubs that use full viewport width (see `#root.grs-list-hub-root`). */
export const LIST_HUB_PATHS = new Set([
  "/students",
  "/kutirs",
  "/admissions",
  "/progress",
]);

/** Strip trailing slash so `/progress/` matches `/progress`. */
export function normalizeListHubPathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isListHubPath(pathname: string): boolean {
  return LIST_HUB_PATHS.has(normalizeListHubPathname(pathname));
}
