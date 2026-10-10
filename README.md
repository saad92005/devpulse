# ⚡ DevPulse

**AI pull-request reviews that don't spam you.** DevPulse is a GitHub App that reviews every PR with a two-pass pipeline: a reviewer model proposes issues, deterministic guard rails and a skeptical verifier model throw out the noise, and only verified findings are posted inline on the PR.

## How it works

1. **Reviewer:** reads the diff with explicit new-file line numbers and proposes findings (severity, category, confidence, suggested fix).
2. **Guard rails:** reject findings on lines the PR didn't add, below the strictness confidence floor, outside the repo's focus, duplicates, or over the comment cap.
3. **Verifier:** a second prompt re-reads each surviving claim against its code excerpt and rejects speculation. It can only downgrade severity.
4. **Post:** one GitHub review with inline comments, a summary and a 0–100 health score. Every rejected finding and its reason are kept in the dashboard.

## Features

- GitHub App webhook (`pull_request`, `issue_comment`) with HMAC verification; reviews run in `after()` so GitHub gets a fast 202
- `@devpulse review` ChatOps command, plus re-run from the dashboard
- Per-repo `.devpulse.yml` (strictness, focus, ignore globs, comment cap, language, team instructions), read from the **base** branch
- Dashboard: stats, 30-day activity chart, issues by category, per-repo health, review detail with verified/filtered tabs, live progress
- Public playground: review any pasted diff, with rate limiting
- Benchmark script with seeded-bug diffs that measures recall, noise filtered and false positives

**Stack:** Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Motion, Lenis, Neon Postgres, Octokit, Groq (any OpenAI-compatible LLM).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in values; see /setup in the app
npm run db:migrate
npm run dev
```

Webhooks need a public URL; for local testing use a tunnel such as `smee.io` or `cloudflared`.

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Unit tests: diff parser, config, signature check, pipeline guard rails with a mocked LLM |
| `npm run benchmark [runs]` | Runs the real pipeline on seeded-bug samples and writes `BENCHMARK.md` |
| `npm run db:migrate` | Applies `db/schema.sql` |

## Privacy

Diffs are fetched, sent to the model and discarded. Only findings and review metadata are stored.
