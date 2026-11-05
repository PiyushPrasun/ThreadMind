import { Hono } from "hono";
import { env as runtimeEnv } from "hono/adapter";
import type { Env } from "../types.js";
import { getCached } from "../services/cache.js";
import { digestHtml } from "../templates/digest.js";

export const pageRoute = new Hono<{ Bindings: Env }>();
pageRoute.get("/hn/:id", async c => {
  const id = Number(c.req.param("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return c.text("Not found", 404);
  try {
    const digest = await getCached(runtimeEnv<Env>(c), id);
    if (!digest) return c.html(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Digest not found — CommentDigest</title><link rel="stylesheet" href="/styles.css"></head><body><header class="site-header"><a class="brand" href="/">Comment<span>Digest</span></a></header><main class="container"><h1>Digest not found</h1><p>This thread has not been digested yet. Generate it from the homepage.</p><a class="button" href="/">Make a digest</a></main></body></html>`, 404);
    return c.html(digestHtml(digest, new URL(c.req.url).origin));
  } catch { return c.text("Digest storage is unavailable. Check the Supabase configuration and schema, then try again.", 503); }
});
