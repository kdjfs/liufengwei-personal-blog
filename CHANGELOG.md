# Changelog

All notable changes to LFW Space are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-08-09

### Added

- AI-native personal digital garden with DeepSeek V4 Pro SSE streaming, article-aware context, selection Ask AI and fast/deep modes.
- Retrieval 2.0 metadata queries, heading chunk retrieval, mixed Chinese/English lexical search and real site sources.
- Local-first Learning OS with IndexedDB reading/listening records, completion state, anchored annotations, import/export and Web Speech playback.
- Production SEO layer with absolute canonical/social metadata, 1200×630 images, WebSite, Person, BlogPosting and category BreadcrumbList JSON-LD.
- GitHub Actions release gate, deterministic bundle/SEO checks and mocked-AI Playwright critical-flow plus responsive matrix tests.
- Production screenshots, architecture/performance/release documentation and resume/interview package.

### Changed

- Split article-only runtime behavior from the global layout; KaTeX is article-only and Mermaid loads dynamically.
- Deferred complete search and AI interfaces to first interaction, and non-critical learning widgets to visibility.
- Added a two-layer floating homepage cover wave with reduced-motion support.
- Updated package version, README, deployment workflow and release commands for the first production release.

### Fixed

- Unified client/server AI request limits in a Unicode-safe shared contract, including Chinese, English, mixed text and emoji boundaries.
- Passed initial selection directly into the deferred AI island to remove a lazy-load event race.
- Stabilized Learning dashboard server markup to remove mobile layout shift.
- Corrected contrast, responsive image loading, article author metadata and Home → Category → Article breadcrumbs.

### Security

- Kept the DeepSeek key, model, endpoint and system prompt server-only; added origin, MIME, payload, schema, rate, concurrency and timeout checks.
- Added HSTS, CSP, `nosniff`, frame, referrer, permissions, COOP and immutable asset headers for Vercel.
- CI uses least-privilege repository permissions, a frozen lockfile and mocked AI without production secrets.

[1.0.0]: https://github.com/kdjfs/liufengwei-personal-blog/releases/tag/v1.0.0
