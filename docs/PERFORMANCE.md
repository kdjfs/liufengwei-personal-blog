# Performance Report — LFW Space v1.0.0

## Measurement context

- Date: 2026-08-09 (Asia/Shanghai)
- Measurement commit: `150ad88` plus documentation-neutral acceptance assertions
- Build: `pnpm build` / Astro static preview on `127.0.0.1`
- Runtime: Windows 11, Node.js 22.13.0, pnpm 10.24.0, Lighthouse 13.3.0, Chrome 151
- Mobile: Lighthouse mobile profile; Desktop: Lighthouse desktop profile
- Network: Lighthouse simulated throttling; each value below comes from the stored JSON report, not an estimate
- Note: Lighthouse 13.3 reports that Node 22.19+ is preferred; the audits completed successfully on Node 22.13.0. CI and production use the supported Node 22 major, and a future local rerun should use the newest Node 22 patch.

Transferred, JS, CSS and Images are compressed network transfer sizes reported by Lighthouse resource summary. Local variance is expected, so the checked-in budget uses deterministic built asset sizes separately.

## Final results

| Page / profile   | Perf | A11y | Best | SEO |    FCP |    LCP |   CLS |  TBT | Transferred |       JS |      CSS |    Images |
| ---------------- | ---: | ---: | ---: | --: | -----: | -----: | ----: | ---: | ----------: | -------: | -------: | --------: |
| Home mobile      |   98 |  100 |  100 | 100 | 1.38 s | 2.30 s | 0.000 | 0 ms |   262.6 KiB |  9.9 KiB | 20.7 KiB | 215.5 KiB |
| Article mobile   |   98 |  100 |  100 | 100 | 1.30 s | 2.37 s | 0.050 | 0 ms |   225.2 KiB | 93.5 KiB | 26.8 KiB |  92.0 KiB |
| Learning mobile  |   99 |  100 |  100 | 100 | 1.29 s | 2.05 s | 0.000 | 0 ms |   159.0 KiB | 94.6 KiB | 18.7 KiB |  38.5 KiB |
| Home desktop     |  100 |  100 |  100 | 100 | 0.37 s | 0.58 s | 0.000 | 0 ms |   320.4 KiB |  9.9 KiB | 20.7 KiB | 273.2 KiB |
| Article desktop  |  100 |  100 |  100 | 100 | 0.32 s | 0.64 s | 0.039 | 0 ms |   288.7 KiB | 93.5 KiB | 26.8 KiB | 155.4 KiB |
| Learning desktop |  100 |  100 |  100 | 100 | 0.29 s | 0.35 s | 0.000 | 0 ms |   159.0 KiB | 94.6 KiB | 18.7 KiB |  38.5 KiB |

All release targets pass: mobile Performance ≥ 90; Accessibility, Best Practices and SEO ≥ 95; LCP ≤ 2.5 s; CLS ≤ 0.1; TBT ≤ 200 ms.

## Before / after

Baseline was taken before route-specific enhancement splitting and deferred islands. Final used the same routes and Lighthouse profiles.

| Page / profile  | Metric        |  Baseline |     Final | Observed change |
| --------------- | ------------- | --------: | --------: | --------------: |
| Home mobile     | Performance   |        92 |        98 |       +6 points |
| Home mobile     | LCP           |    3.23 s |    2.30 s |         -0.93 s |
| Home mobile     | Transferred   | 505.6 KiB | 262.6 KiB |      -243.0 KiB |
| Home mobile     | JS            | 134.5 KiB |   9.9 KiB |      -124.6 KiB |
| Article mobile  | Performance   |        96 |        98 |       +2 points |
| Article mobile  | LCP           |    2.46 s |    2.37 s |         -0.09 s |
| Article mobile  | TBT           |     93 ms |      0 ms |          -93 ms |
| Article mobile  | JS            | 145.4 KiB |  93.5 KiB |       -51.9 KiB |
| Learning mobile | Performance   |        86 |        99 |      +13 points |
| Learning mobile | CLS           |     0.228 |     0.000 |          -0.228 |
| Learning mobile | Transferred   | 229.1 KiB | 159.0 KiB |       -70.1 KiB |
| Home desktop    | Accessibility |        91 |       100 |       +9 points |
| Home desktop    | Transferred   | 616.8 KiB | 320.4 KiB |      -296.4 KiB |

These are local release measurements, not real-user monitoring or a promise about every device/network.

## Initial route bundle budget

`pnpm analyze` reads current production assets and follows only each route's initial module/CSS graph.

| Route    |  JS raw / gzip |   CSS raw / gzip | Total gzip | Budget | Result |
| -------- | -------------: | ---------------: | ---------: | -----: | ------ |
| Home     | 18.6 / 6.7 KiB |  93.5 / 20.1 KiB |   26.8 KiB | 35 KiB | Pass   |
| Article  | 24.9 / 9.2 KiB | 114.7 / 25.9 KiB |   35.1 KiB | 45 KiB | Pass   |
| Learning | 18.6 / 6.7 KiB |  85.7 / 18.1 KiB |   24.8 KiB | 35 KiB | Pass   |

Largest generated dynamic assets include Mermaid support (~646.6 KiB raw / 138.9 KiB gzip), Cytoscape (~424.6 / 133.6 KiB), KaTeX JS (~252.6 / 74.9 KiB) and the complete AI Assistant (~186.4 / 56.4 KiB). They are not all initial dependencies: Mermaid/Cytoscape loads only for Mermaid content, KaTeX is article-only, and the AI Assistant loads after explicit interaction.

## Changes that produced the result

- Moved reading progress, TOC, code toolbar, lightbox, Mermaid, selection and speech into an article-only enhancement entry.
- Removed unused `HeroVisual.tsx` and `hero-webgl.ts` after zero-reference verification.
- Deferred full search and AI UI until first interaction while preserving accessible lightweight triggers.
- Hydrated Continue Learning only when visible and gave the Learning dashboard a stable SSR skeleton.
- Kept KaTeX out of non-article routes; dynamically imported Mermaid.
- Used responsive Astro images, explicit dimensions, eager first-image loading and lazy below-fold images.
- Fixed contrast issues found by the baseline accessibility audit.

## Reproduction

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm analyze
pnpm preview
```

Run Lighthouse against `/`, `/blog/3-yue-20-san-wei-jia/` and `/learning/` with mobile and desktop profiles. Browser-level functional and overflow checks are covered by `pnpm test:e2e`.
