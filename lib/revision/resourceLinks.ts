/**
 * A revision or focus session may step out to exactly one place: the
 * resource-library page for the session's chapter. These build that URL and
 * recognise it, for the links that open it and for the guards that ask
 * "leave the session?" before any other navigation.
 */
export const CHAPTER_RESOURCES_PATH = "/home/resource-library/chapter";

/** Which part of the chapter page a Reference Review card opens onto. */
export type ReferenceSection = "NOTE" | "YOUTUBE" | "PYQ";

/** Without a section, the chapter page opens in its default order. */
export function chapterResourcesHref(subjectName: string, chapterName: string, section?: ReferenceSection): string {
  const query = new URLSearchParams({ subject: subjectName, chapter: chapterName });
  // The chapter page leads with the `focus` section; PYQs live in the
  // practice-question section behind its "PYQs only" toggle.
  if (section) query.set("focus", section === "PYQ" ? "PRACTICE_QUESTION" : section);
  if (section === "PYQ") query.set("pyq", "1");
  return `${CHAPTER_RESOURCES_PATH}?${query.toString()}`;
}

/** True for the session's own chapter page (any section of it). */
export function isSessionChapterHref(href: string, subjectName: string, chapterName: string): boolean {
  if (!subjectName || !chapterName) return false;
  const url = new URL(href, window.location.origin);
  return (
    url.origin === window.location.origin &&
    url.pathname === CHAPTER_RESOURCES_PATH &&
    url.searchParams.get("subject") === subjectName &&
    url.searchParams.get("chapter") === chapterName
  );
}
