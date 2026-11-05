# CommentDigest agent rules

- Keep the project on Vercel, Hono, Supabase Postgres, and TypeScript.
- LLM provider is OpenRouter using `OPENROUTER_API_KEY`; never hardcode or log secrets.
- Keep the model configurable with `OPENROUTER_MODEL`; use free models only by default.
- Validate all model output and cited IDs before saving a digest.
- Do not add paid services or dependencies without asking first.
