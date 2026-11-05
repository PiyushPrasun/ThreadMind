# CommentDigest: Zero-Budget MVP Plan

> Implementation note: this was the initial plan. The project now uses Vercel + Hono, Supabase Postgres, and OpenRouter. See the repository README and `supabase/schema.sql` for the current setup.

**One-liner:** Paste a Hacker News thread link, get a structured digest: positions, strongest objections, open questions, and a suggested takeaway, each linked to the exact comments.

**Constraints:** 0 budget (no paid tools), solo builder, Google Antigravity (AI coding agent) as the main coding tool.
**Target:** Working public MVP in about 14 days.

> Free-tier limits and terms change often. Verify each service's current limits before relying on them.

---

## 1. MVP scope

### In scope (must have)
1. Input box: paste an HN thread URL or ID
2. Fetch the thread and all comments
3. Generate a structured digest with an LLM
4. Every claim links back to source comment IDs
5. Shareable permanent page per thread (`/hn/<id>`) with a social preview card (Open Graph)
6. Cache results so each thread is only processed once
7. Basic rate limiting and a daily cost/quota guard

### Out of scope for MVP (do later)
- User accounts and login
- Payments
- GitHub issues, Reddit and other sources (add after HN works)
- Browser extension
- Auto-updating digests as threads grow
- Email digests

---

## 2. User flow

1. User lands on the homepage, sees example digests of famous threads, and a URL box.
2. User pastes `https://news.ycombinator.com/item?id=XXXX`.
3. App checks the cache. If there's a hit, it shows the page instantly.
4. If not, it fetches the thread, builds the digest (10-40 seconds), saves it, and shows it.
5. User clicks Share, which copies `/hn/XXXX`. The link renders a rich preview on X, LinkedIn, Slack and so on.

---

## 3. Digest output format

```json
{
  "thread_id": 123456,
  "title": "string",
  "tldr": "2-3 sentence neutral summary",
  "positions": [
    { "label": "short name", "summary": "string", "comment_ids": [1, 2, 3] }
  ],
  "strongest_objections": [
    { "objection": "string", "against": "position label", "comment_ids": [4] }
  ],
  "open_questions": [
    { "question": "string", "comment_ids": [5] }
  ],
  "consensus": "string or null",
  "suggested_takeaway": "string",
  "stats": { "comments_analyzed": 0, "comments_total": 0 }
}
```

**Rules to bake into the prompt:**
- Paraphrase; don't copy long comment text (short quotes only, under ~15 words).
- Every item must cite real comment IDs from the input. Reject output with unknown IDs.
- Stay neutral; report positions, don't pick a side.
- If the thread is too small or too off-topic, say so instead of inventing structure.

---

## 4. Free tech stack

| Layer | Choice | Why |
|---|---|---|
| Thread data | HN Algolia API (`/api/v1/items/<id>` returns the full nested tree) | Free, no key, one call per thread |
| LLM | Google Gemini API free tier (key from Google AI Studio) | Free, large context window, fits the Google toolchain |
| Backend | Cloudflare Workers with Hono | Free tier, no server to manage, fast |
| Database / cache | Cloudflare D1 (SQLite) | Free tier, stores digests and rate-limit counters |
| Frontend | Static HTML + small vanilla JS or Preact, served by the same Worker | No build complexity, fast, SEO friendly |
| Hosting / domain | `*.workers.dev` subdomain | Free |
| Code hosting | GitHub (free) | Version control, deploy hooks |
| Analytics | Cloudflare Web Analytics | Free, privacy friendly |
| Error alerts | Cloudflare logs (free) | Enough for MVP |

**Notes**
- On the Gemini free tier, prompts may be used by Google to improve products. That's fine for public HN data, but never send private data.
- Free-tier LLM rate limits are low. The cache and a daily cap are essential.
- Cloudflare's free plan allows commercial use. Some other free hosting tiers don't, so check terms before you add revenue.

---

## 5. Architecture

```
Browser
  |  GET /  ->  homepage (static)
  |  POST /api/digest {url}
  v
Cloudflare Worker (Hono)
  1. Parse + validate HN ID
  2. Rate limit (per IP, per day) + global daily cap
  3. D1 lookup -> cached digest? return it
  4. Fetch thread from Algolia API
  5. Flatten + trim comments (budget tokens)
  6. Call Gemini with JSON schema output
  7. Validate output (schema + comment IDs exist)
  8. Save to D1, return JSON
  |
  |  GET /hn/:id -> server-rendered HTML page with OG tags
```

### Handling long threads
- Flatten the tree into `[id] author | depth | text` lines.
- Strip HTML, drop deleted and dead comments, and truncate very long comments.
- Prioritize: top-level comments, then highly replied branches. Cap total at a fixed token budget.
- If the thread is still too big, do two passes: summarize branches, then merge. (Only build this if the one-pass version fails on real threads.)
- Always show `comments_analyzed / comments_total` for honesty.

---

## 6. Database schema (D1)

```sql
CREATE TABLE digests (
  thread_id    INTEGER PRIMARY KEY,
  title        TEXT NOT NULL,
  digest_json  TEXT NOT NULL,
  comment_count INTEGER,
  model        TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE usage (
  day          TEXT NOT NULL,        -- YYYY-MM-DD
  key          TEXT NOT NULL,        -- 'global' or hashed IP
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, key)
);
```

---

## 7. API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Homepage with input and examples |
| POST | `/api/digest` | Body `{ "url": "..." }`, returns digest JSON (cached or new) |
| GET | `/hn/:id` | Shareable page, server-rendered with OG meta tags |
| GET | `/api/health` | Simple status check |

---

## 8. Folder structure

```
commentdigest/
├── AGENTS.md                  # Rules for Antigravity (see section 10)
├── README.md
├── .gitignore
├── .dev.vars                  # Local secrets (NEVER commit)
├── package.json
├── wrangler.toml              # Cloudflare config (D1 binding, vars)
├── tsconfig.json
│
├── docs/
│   ├── PLAN.md                # This file
│   ├── PROMPT_DESIGN.md       # Prompt versions + what changed
│   └── DECISIONS.md           # Short log of choices and why
│
├── migrations/
│   └── 0001_init.sql
│
├── src/
│   ├── index.ts               # Hono app, route wiring
│   ├── routes/
│   │   ├── digest.ts          # POST /api/digest
│   │   ├── page.ts            # GET /hn/:id (HTML + OG tags)
│   │   └── health.ts
│   ├── services/
│   │   ├── hn.ts              # Fetch + parse HN thread (Algolia)
│   │   ├── flatten.ts         # Tree -> trimmed text for the LLM
│   │   ├── llm.ts             # Gemini call, retries, JSON output
│   │   ├── validate.ts        # Schema + comment-ID checks
│   │   ├── cache.ts           # D1 read/write
│   │   └── limits.ts          # Rate limit + daily cap
│   ├── prompts/
│   │   └── digest.v1.ts       # System prompt + output schema
│   ├── templates/
│   │   ├── layout.ts          # HTML shell
│   │   ├── home.ts
│   │   └── digest.ts          # Digest page renderer
│   └── types.ts
│
├── public/
│   ├── styles.css
│   ├── app.js                 # Form handling, loading state, copy link
│   └── og-default.png
│
├── tests/
│   ├── flatten.test.ts
│   ├── validate.test.ts
│   └── fixtures/
│       ├── small-thread.json
│       └── large-thread.json
│
└── scripts/
    ├── seed-examples.ts       # Pre-generate digests for homepage examples
    └── eval-prompts.ts        # Run prompt on 10 fixture threads, print results
```

---

## 9. Prerequisites checklist

### Accounts (all free)
- [ ] GitHub account
- [ ] Cloudflare account (Workers + D1)
- [ ] Google account with Google AI Studio access (Gemini API key)
- [ ] X / LinkedIn / Hacker News accounts for launch

### Installed on your machine
- [ ] Google Antigravity
- [ ] Node.js (current LTS)
- [ ] Git
- [ ] Wrangler (Cloudflare CLI): `npm i -g wrangler`, then `wrangler login`

### Setup steps (day 1)
1. Create the GitHub repo `commentdigest`.
2. Get a Gemini API key from Google AI Studio and put it in `.dev.vars` as `GEMINI_API_KEY=...`.
3. Run `wrangler d1 create commentdigest-db` and paste the binding into `wrangler.toml`.
4. Add the key to production with `wrangler secret put GEMINI_API_KEY`.
5. Add `.dev.vars` to `.gitignore` before the first commit.

### Skills worth a quick read (1-2 hours total)
- How Hono routes work
- How D1 queries work
- Gemini structured JSON output
- Open Graph meta tags

---

## 10. Working with Antigravity

### AGENTS.md (put in the repo root; check Antigravity docs for the exact rules filename it reads)
Suggested contents:
```
Project: CommentDigest. HN thread -> structured digest.
Stack: Cloudflare Workers, Hono, D1, TypeScript, Gemini API.
Rules:
- Zero paid services. Do not add dependencies that need payment.
- Never hardcode or log secrets. Read from env bindings.
- Keep files small; follow the folder structure in docs/PLAN.md.
- Every LLM output must be schema-validated before saving.
- Add or update a test for any logic change in services/.
- Ask before adding a new dependency.
```

### Tips
- Give the agent **one milestone at a time**, not the whole app.
- Always say "show me the plan before editing."
- Review diffs; run `wrangler dev` yourself after each milestone.
- Commit after every working milestone so you can roll back.

### Starter prompts (one per milestone)

**M1 Scaffold**
> Set up a Cloudflare Workers + Hono + TypeScript project per docs/PLAN.md folder structure. Add a `/api/health` route and a static homepage. Configure wrangler.toml with a D1 binding. Don't implement anything else yet.

**M2 HN fetch + flatten**
> Implement services/hn.ts to fetch a thread from the Algolia HN items API given an ID or URL, and services/flatten.ts to turn the nested tree into trimmed text lines `[id] author | depth | text` under a configurable token budget. Add tests using fixtures.

**M3 LLM digest**
> Implement services/llm.ts calling Gemini with structured JSON output using the schema in docs/PLAN.md section 3, and prompts/digest.v1.ts. Add services/validate.ts that rejects output citing comment IDs not in the input. Retry once on invalid output.

**M4 Cache + limits + API**
> Implement D1 cache, per-IP daily limit, and a global daily cap, then wire POST /api/digest. Return cached results when available. Add migration 0001_init.sql.

**M5 Pages + share**
> Implement GET /hn/:id server-rendered page with clean layout, clickable comment links to HN, and Open Graph/Twitter meta tags using the TL;DR as description. Add a Copy Link button.

**M6 Polish + examples**
> Add loading and error states, mobile-friendly CSS, and scripts/seed-examples.ts to pre-generate digests for 5 popular threads shown on the homepage.

---

## 11. 14-day timeline

| Days | Milestone | Done when |
|---|---|---|
| 1 | Accounts, setup, repo, M1 scaffold | `wrangler dev` shows homepage |
| 2-3 | M2 HN fetch + flatten | Test passes on a real thread |
| 4-6 | M3 LLM digest + prompt tuning | 10 test threads give sensible, correctly cited digests |
| 7 | M4 Cache, limits, API | Same thread twice returns instantly the second time |
| 8-9 | M5 Digest page + share cards | Link preview looks good on X/Slack |
| 10-11 | M6 Polish, examples, mobile | Looks good on a phone |
| 12 | Deploy to production, test with friends | 5 people use it without help |
| 13 | Write launch posts, record a 20-second demo GIF | Assets ready |
| 14 | Launch | Posted; monitoring errors and quota |

---

## 12. Quality checks before launch

- [ ] Test on 10+ real threads (small, huge, controversial, technical, nearly empty)
- [ ] Spot-check that 20 random cited comment IDs actually support the claim
- [ ] No claim without a source link
- [ ] Deleted/dead comments handled
- [ ] Very large thread doesn't crash or time out
- [ ] Rate limit and daily cap work (test by exceeding them)
- [ ] Friendly message when the daily cap is hit ("Come back tomorrow" plus an example digest)
- [ ] Secrets not in the repo (search history before making it public)
- [ ] Mobile layout checked

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Free LLM quota runs out during a viral spike | Cache everything, pre-seed popular threads, global daily cap, friendly waitlist message |
| Hallucinated or miscited points | ID validation, "analyzed X of Y comments" label, easy "report a problem" link |
| Bias or unfair summaries of heated threads | Neutral prompt, show multiple positions with source links |
| Quoting too much copyrighted/user text | Paraphrase-only prompt, short quotes only, link out to HN |
| HN or Algolia API changes or limits | Keep fetch code isolated in `hn.ts`; cache thread data |
| Abuse (bots hammering the endpoint) | Per-IP limits, URL validation (HN only), no arbitrary URL fetching |
| Looks like a toy | Pre-seeded polished examples, clean design, clear "how it works" note |

---

## 14. Launch plan (free)

1. **Show HN post:** "Show HN: Paste an HN thread, get the positions, objections and open questions" with a link and a short honest description of limitations.
2. **Demo:** a 20-second GIF of a 500-comment thread becoming a one-screen digest.
3. **Seed content:** publish digests of 5 well-known threads, and share them on X and LinkedIn.
4. **Built-in loop:** every digest page has "Make a digest of your own thread" and the share card carries the site name.
5. **Reply value:** when relevant threads trend, post the digest link as a helpful reply (not spam, and follow each community's rules).
6. **Ask for feedback** in the post: which source should be added next (GitHub issues, Reddit, etc.)?

---

## 15. Success metrics (first 30 days)

- Digests generated: 500+
- Share rate (digest pages opened from shared links vs created): track
- Return users: 15%+
- Citation accuracy in manual spot checks: 90%+
- Free quota exhausted on how many days: aim for fewer than 3
- Clear signal for next step: top-requested source and whether people ask for a paid plan

---

## 16. After the MVP (only if it gets traction)

1. GitHub issues and discussions support
2. Browser extension ("Digest this page" button)
3. Auto-refresh for growing threads
4. Paid plan: private threads, team Slack bot, higher limits
5. Public leaderboard of "most contested threads this week"
