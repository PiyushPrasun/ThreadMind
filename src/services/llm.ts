import type { Digest, Env } from "../types.js";
import type { FlatComment } from "./flatten.js";
import { RESPONSE_SCHEMA, SYSTEM_PROMPT } from "../prompts/digest.v1.js";
import { validateDigest } from "./validate.js";

class OpenRouterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterError";
  }
}

function errorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

export async function generateDigest(env: Env, id: number, title: string, comments: FlatComment[], total: number): Promise<Digest> {
  if (!env.OPENROUTER_API_KEY) throw new Error("OpenRouter is not configured. Add OPENROUTER_API_KEY to .env.local or Vercel environment settings.");
  const model = env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free";
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
        const requestId = response.headers.get("x-request-id");
        const raw = await response.text();
        let detail: string | undefined;
        try { detail = errorMessage(JSON.parse(raw)); } catch { /* Keep the status if the response is not JSON. */ }
        const reason = detail || raw.slice(0, 240) || response.statusText || "No error details provided.";
        const id = requestId ? ` (request ID: ${requestId})` : "";
        if (response.status === 429) {
          throw new OpenRouterError(`OpenRouter rejected this request with HTTP 429: ${reason}${id} Check the OpenRouter API key and model limits.`);
        }
        throw new OpenRouterError(`OpenRouter rejected this request with HTTP ${response.status}: ${reason}${id}`);
      }
      const payload = await response.json() as any;
      const content = payload.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      return validateDigest(parsed, id, title, ids, comments.length, total);
    } catch (error) {
      // A provider rejection will not improve by immediately sending the same request again.
      if (error instanceof OpenRouterError) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not generate a valid digest.");
}
