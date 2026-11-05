# Decisions

- Use the OpenRouter OpenAI-compatible chat completions endpoint. This makes the provider/model configurable and avoids coupling the app to one vendor SDK.
- Use Supabase Postgres via its REST API and an atomic SQL RPC for cached digests and quota reservations; the SQL setup lives in `supabase/schema.sql`.
- Keep `OPENROUTER_API_KEY` in Vercel environment settings or local `.env.local`; never in source control.
- Cache generated digests in Supabase Postgres so a thread only consumes model quota on its first successful generation.
- Reserve generation quotas through an atomic Supabase RPC only after checking cache; limits default to 5 new digests per IP per day and 40 global per day.
- All cited IDs must be among comments supplied to the model. Unsupported list items are rejected rather than stored.
