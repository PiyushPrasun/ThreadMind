import type { HNItem } from "../types";

export function parseHnId(value: string): number | null {
  const input = value.trim();
  if (/^\d{1,12}$/.test(input)) return Number(input);
  try {
    const url = new URL(input);
    if (!/(^|\.)news\.ycombinator\.com$/i.test(url.hostname)) return null;
    const id = url.searchParams.get("id");
    return id && /^\d{1,12}$/.test(id) ? Number(id) : null;
  } catch { return null; }
}

export async function fetchThread(id: number): Promise<HNItem> {
  const response = await fetch(`https://hn.algolia.com/api/v1/items/${id}`, {
    headers: { "Accept": "application/json", "User-Agent": "CommentDigest/0.1" },
  });
  if (!response.ok) throw new Error(response.status === 404 ? "Thread not found." : "Hacker News is temporarily unavailable.");
  const item = await response.json() as HNItem;
  if (!item || item.id !== id || item.type !== "story") throw new Error("That link is not a Hacker News story.");
  return item;
}
