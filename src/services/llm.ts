import type { Digest, Env } from "../types.js";
import type { FlatComment } from "./flatten.js";
import { RESPONSE_SCHEMA, SYSTEM_PROMPT } from "../prompts/digest.v1.js";
import { validateDigest } from "./validate.js";

export async function generateDigest(env: Env, id: number, title: string, comments: FlatComment[], total: number): Promise<Digest> {
  if (!env.OPENROUTER_API_KEY) throw new Error("OpenRouter is not configured. Add OPENROUTER_API_KEY to .env.local or Vercel environment settings.");
  const model = env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  const ids = new Set(comments.map(c => c.id));
  const body = {
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Thread title: ${title}\nThread ID: ${id}\nComments analyzed: ${comments.length} of ${total}\n\nComments:\n${comments.map(c => `[${c.id}] ${c.author} | depth ${c.depth} | ${c.text}`).join("\n")}` },
    ],
    response_format: { type: "json_schema", json_schema: { name: "comment_digest", strict: true, schema: RESPONSE_SCHEMA } },
  };
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST", headers: { "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": env.OPENROUTER_SITE_URL || "https://commentdigest.workers.dev", "X-Title": env.OPENROUTER_APP_NAME || "CommentDigest" }, body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = await response.text();
        if (response.status === 429) throw new Error("OpenRouter rate limit reached. Please try again later.");
        throw new Error(`OpenRouter request failed (${response.status}): ${detail.slice(0, 240)}`);
      }
      const payload = await response.json() as any;
      const content = payload.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      return validateDigest(parsed, id, title, ids, comments.length, total);
    } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not generate a valid digest.");
}
