# CommentDigest

Paste a Hacker News story URL or ID to get a neutral digest of its main positions, strongest objections, open questions, and suggested takeaway. Digest claims link to their supporting comment IDs.

## Stack

Hono on Vercel, Supabase Postgres for digest caching and daily quotas, the Hacker News Algolia API for thread data, and OpenRouter for model inference. The default OpenRouter model is a configurable `:free` model.

## Local setup

1. Create a Supabase project. In its SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
2. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `OPENROUTER_API_KEY`.
3. Keep `.env.local` private; it is ignored by Git. Use a Supabase secret key starting with `sb_secret_`; it must never be placed in browser code.
4. Install dependencies with `npm install`.
5. Start the local Vercel environment with `npm run dev` and open the URL it prints (usually `http://localhost:3000`).

If you already created the Supabase tables and functions, rerun `supabase/schema.sql` in the SQL Editor after pulling updates; the setup statements are safe to rerun.

## GitHub and Vercel deployment

1. Create a **private** GitHub repository.
2. Commit and push this project. Do not commit `.env.local`, API keys, or database passwords.
3. In Vercel, choose **Add New → Project**, import the GitHub repository, and deploy with the detected Hono settings. No build command or output directory override is needed.
4. In the Vercel project, open **Settings → Environment Variables** and add `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `OPENROUTER_API_KEY` for Production. Add `OPENROUTER_MODEL`, `DAILY_GLOBAL_LIMIT`, and `DAILY_IP_LIMIT` if you want to override the defaults.
5. Redeploy after adding the variables. Open the deployment URL and try a Hacker News thread.

Vercel detects the Hono application from `src/index.ts` and serves files in `public/` through its CDN. The function duration is set to 60 seconds for digest generation; the maximum available duration depends on your Vercel plan.

## OpenRouter

The default model is `google/gemma-4-26b-a4b-it:free`, a free Google Gemma model with structured-output support. Gemini Omni 1.2 Flash is a paid video-generation model, so it does not fit this text-digest API. Set `OPENROUTER_MODEL` to another currently available free chat model if needed. Optional `OPENROUTER_SITE_URL` and `OPENROUTER_APP_NAME` set OpenRouter attribution headers. Free-model availability, context limits, and quotas can change; check the current [OpenRouter free models](https://openrouter.ai/collections/free-models).

## Quotas and storage

The default application cap is 40 new digests globally per UTC day and 5 per IP per UTC day. Cached requests do not consume generation quota. This aims to leave room under common OpenRouter free-model limits; check current provider limits before launch.

Supabase stores public thread digests and hashed IP quota keys. The server uses the Supabase Data API and the SQL function in `supabase/schema.sql` to reserve quotas atomically. Keep `SUPABASE_SECRET_KEY` only in `.env.local` and Vercel's server-side environment settings.

## Routes

- `GET /` — homepage
- `POST /api/digest` — JSON body `{ "url": "..." }`
- `GET /hn/:id` — shareable digest page with Open Graph tags
- `GET /api/health` — health check
