import type { Digest } from "../types.js";

export function validateDigest(value: unknown, threadId: number, title: string, allowedIds: Set<number>, analyzed: number, total: number): Digest {
  if (!value || typeof value !== "object") throw new Error("Model response was not an object.");
  const v = value as Record<string, unknown>;
  const str = (x: unknown) => typeof x === "string";
  if (!str(v.tldr) || !Array.isArray(v.positions) || !Array.isArray(v.strongest_objections) || !Array.isArray(v.open_questions) || !(v.consensus === null || str(v.consensus)) || !str(v.suggested_takeaway)) throw new Error("Model response did not match the digest format.");
  const idsOk = (x: unknown): x is number[] => Array.isArray(x) && x.length > 0 && x.every(id => Number.isInteger(id) && allowedIds.has(id as number));
  const optionalIdsOk = (x: unknown): x is number[] => Array.isArray(x) && x.every(id => Number.isInteger(id) && allowedIds.has(id as number));
  if (!idsOk(v.tldr_comment_ids) || !idsOk(v.takeaway_comment_ids) || !optionalIdsOk(v.consensus_comment_ids) || (v.consensus === null ? (v.consensus_comment_ids as number[]).length !== 0 : !idsOk(v.consensus_comment_ids))) throw new Error("Invalid summary citations.");
  for (const p of v.positions) if (!p || typeof p !== "object" || !str((p as any).label) || !str((p as any).summary) || !idsOk((p as any).comment_ids)) throw new Error("Invalid position citations.");
  for (const o of v.strongest_objections) if (!o || typeof o !== "object" || !str((o as any).objection) || !str((o as any).against) || !idsOk((o as any).comment_ids)) throw new Error("Invalid objection citations.");
  for (const q of v.open_questions) if (!q || typeof q !== "object" || !str((q as any).question) || !idsOk((q as any).comment_ids)) throw new Error("Invalid question citations.");
  return { thread_id: threadId, title, tldr: v.tldr as string, tldr_comment_ids: v.tldr_comment_ids as number[], positions: v.positions as Digest["positions"], strongest_objections: v.strongest_objections as Digest["strongest_objections"], open_questions: v.open_questions as Digest["open_questions"], consensus: v.consensus as string | null, consensus_comment_ids: v.consensus_comment_ids as number[], suggested_takeaway: v.suggested_takeaway as string, takeaway_comment_ids: v.takeaway_comment_ids as number[], stats: { comments_analyzed: analyzed, comments_total: total } };
}
