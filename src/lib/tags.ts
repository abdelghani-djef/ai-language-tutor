// Tag cleaning, kept apart from the store so the data move from version 1
// (migrate.ts) can use it without importing the store.

export const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

/** Trims tags, drops "#", empties and case-insensitive duplicates. */
export function cleanTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#+/, "").trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out.slice(0, MAX_TAGS);
}
