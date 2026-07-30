import { resolveDataUrl } from "./data-url";
import type { BookDetail, BookStat, Manifest, Quality, Verse } from "./types";

const cache = new Map<string, unknown>();

async function loadJson<T>(relativePath: string): Promise<T> {
  const normalizedPath = relativePath.replace(/^\/+/, "");
  if (cache.has(normalizedPath)) return cache.get(normalizedPath) as T;

  const response = await fetch(resolveDataUrl(normalizedPath));
  if (!response.ok) {
    throw new Error(`Data request failed (${response.status}) for ${response.url}`);
  }
  const value = await response.json() as T;
  cache.set(normalizedPath, value);
  return value;
}

export const loadCore = () => Promise.all([
  loadJson<Manifest>("manifest.json"),
  loadJson<Verse[]>("rankings.json"),
  loadJson<BookStat[]>("book-stats.json"),
  loadJson<Quality>("data-quality.json"),
]);

export const loadBook = (slug: string) =>
  loadJson<BookDetail>(`books/${slug}.json`);
