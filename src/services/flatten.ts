import type { HNItem } from "../types";

export interface FlatComment { id: number; author: string; depth: number; text: string; replies: number; }

function cleanHtml(value: string): string {
  return value.replace(/<p>/gi, "\n").replace(/<\/p>/gi, "\n")
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]*>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

export function flattenThread(root: HNItem, maxChars = 42_000): { comments: FlatComment[]; total: number } {
  const all: FlatComment[] = [];
  function visit(nodes: HNItem[] = [], depth = 0): void {
    for (const node of nodes) {
      if (node.type === "comment") {
        if (!node.deleted && !node.dead && node.text?.trim()) all.push({ id: node.id, author: node.author || "unknown", depth, text: cleanHtml(node.text).slice(0, 1500), replies: node.children?.length || 0 });
        visit(node.children || [], depth + 1);
      }
    }
  }
  visit(root.children || []);
  // Keep roots first, then active branches; maintain original order for readability.
  const ranked = [...all].sort((a, b) => (a.depth === 0 ? -1 : 0) - (b.depth === 0 ? -1 : 0) || b.replies - a.replies);
  const selected: FlatComment[] = []; let used = 0;
  for (const c of ranked) {
    const line = `[${c.id}] ${c.author} | depth ${c.depth} | ${c.text}`;
    if (used + line.length > maxChars) continue;
    selected.push(c); used += line.length;
  }
  return { comments: selected, total: all.length };
}

export function formatComments(comments: FlatComment[]): string {
  return comments.map(c => `[${c.id}] ${c.author} | depth ${c.depth} | ${c.text}`).join("\n");
}
