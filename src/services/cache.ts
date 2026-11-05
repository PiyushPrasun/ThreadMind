import type { Digest, Env } from "../types.js";

export async function getCached(env: Env, id: number): Promise<Digest | null> {
  const url = new URL("/rest/v1/digests", env.SUPABASE_URL);
  url.searchParams.set("thread_id", `eq.${id}`);
  url.searchParams.set("select", "digest_json");
  const response = await fetch(url, { headers: supabaseHeaders(env) });
  if (!response.ok) throw new Error("Supabase cache lookup failed.");
  const rows = await response.json() as { digest_json: Digest }[];
  return rows[0]?.digest_json || null;
}

export async function saveCached(env: Env, digest: Digest, model: string): Promise<void> {
  const url = new URL("/rest/v1/digests", env.SUPABASE_URL);
  const response = await fetch(url, {
    method: "POST",
    headers: { ...supabaseHeaders(env), "Content-Type": "application/json", "Prefer": "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ thread_id: digest.thread_id, title: digest.title, digest_json: digest, comment_count: digest.stats.comments_total, model }),
  });
  if (!response.ok) throw new Error("Supabase could not save the digest.");
}

export function supabaseHeaders(env: Env): HeadersInit {
  return { "apikey": env.SUPABASE_SECRET_KEY };
}
