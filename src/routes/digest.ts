import { Hono } from "hono";
import { env as runtimeEnv } from "hono/adapter";
import type { Env } from "../types.js";
import { parseHnId, fetchThread } from "../services/hn.js";
import { flattenThread } from "../services/flatten.js";
import { generateDigest } from "../services/llm.js";
import { getCached, saveCached } from "../services/cache.js";
import { reserveGeneration } from "../services/limits.js";

export const digestRoute = new Hono<{ Bindings: Env }>();
digestRoute.post("/api/digest", async c => {
  let body: { url?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: "Send a JSON body with a Hacker News URL or ID." }, 400); }
  if (typeof body.url !== "string" || body.url.length > 500) return c.json({ error: "Enter a Hacker News URL or item ID." }, 400);
  const id = parseHnId(body.url);
  if (!id) return c.json({ error: "Enter a valid news.ycombinator.com thread URL or numeric story ID." }, 400);
  try {
    const config = runtimeEnv<Env>(c);
    const cached = await getCached(config, id);
    if (cached) return c.json({ ...cached, cached: true });
    const thread = await fetchThread(id);
    const { comments, total } = flattenThread(thread);
    if (!comments.length) return c.json({ error: "This thread has no readable comments to digest yet." }, 422);
    const ip = c.req.header("x-real-ip") || c.req.header("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
    const quota = await reserveGeneration(config, ip);
    if (quota === "global") return c.json({ error: "Today's free digest limit has been reached. Please come back tomorrow, or browse an example from the homepage." }, 429);
    if (quota === "ip") return c.json({ error: "You've reached today's limit for new digests. Please try again tomorrow." }, 429);
    const result = await generateDigest(config, id, thread.title || "Untitled Hacker News thread", comments, total);
    await saveCached(config, result, config.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free");
    return c.json({ ...result, cached: false });
  } catch (error) {
    console.error("Digest generation failed", error instanceof Error ? error.message : "unknown error");
    const message = error instanceof Error ? error.message : "Digest generation failed. Please try again.";
    const status = /not found/i.test(message) ? 404 : /not a Hacker News story/i.test(message) ? 400 : /not configured/i.test(message) ? 503 : 502;
    return c.json({ error: message }, status);
  }
});
