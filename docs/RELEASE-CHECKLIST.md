# LFW Space release checklist

Run from a clean release branch. Check the production-only items after main deployment and before creating the tag.

## Local gates

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm content:prepare` leaves `git diff` unchanged
- [ ] `pnpm content:check`
- [ ] `pnpm test` (content, AI, learning, home, SEO, release configuration)
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm ai:function:check`
- [ ] `pnpm build` leaves `git diff` unchanged
- [ ] `pnpm analyze` passes route budgets
- [ ] `pnpm seo:check` validates metadata, JSON-LD, 1200×630 images, RSS, sitemap and robots
- [ ] `pnpm test:e2e` passes mocked Selection Ask, Learning and 7 viewport × 9 route audit
- [ ] Lighthouse targets in `docs/PERFORMANCE.md` pass
- [ ] Broken images, horizontal overflow, console errors, uncaught errors and asset 404s are zero
- [ ] `pnpm audit` has no unresolved high/critical production vulnerability
- [ ] Secret scan finds no committed key/token; `.env.example` keeps only `replace_me`

`pnpm release:check` runs the sequential automated subset above.

## GitHub and Vercel

- [ ] Fetch `origin`; confirm `origin/main` has not advanced unexpectedly
- [ ] Push release branch without force
- [ ] Pull Request targets `main`; GitHub Actions is green
- [ ] Merge safely; main commit is the reviewed release commit
- [ ] Vercel production deployment succeeds for that main SHA
- [ ] Production security headers and immutable asset cache are present

## Production smoke and AI

- [ ] Home, Blog, long Article, Category, Tag, Projects, Learning, About and 404 open correctly
- [ ] Search, theme, responsive navigation, article TOC and learning persistence work
- [ ] `/api/ai-health` reports configured without exposing a key
- [ ] Normal AI conversation returns HTTP 200 and streamed SSE
- [ ] Metadata query returns a content-grounded result
- [ ] Selection Ask succeeds for Chinese, English and mixed text without `VALIDATION_ERROR`
- [ ] Deep mode streams a complete answer
- [ ] Malformed and oversized requests fail with the intended 4xx response

## Publish

- [ ] Working tree is clean and main CI remains green
- [ ] Create annotated `v1.0.0` tag only after production and real AI pass
- [ ] Push tag and create “LFW Space v1.0.0 — AI Native Digital Garden” GitHub Release
- [ ] Release notes match `CHANGELOG.md`; final production URL and main SHA are recorded
