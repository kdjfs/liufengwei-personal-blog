# LFW Space V2 Production Blog Specification (SUPERSEDED)

> **Superseded on 2026-08-10.** This early static-only proposal conflicts with the
> approved LFW Space v2.0 Full-Stack AI Learning Cloud direction because it lists
> Node.js, MySQL, Redis, and authentication as non-goals. It is retained as a
> historical record only. The active specification is
> [FULLSTACK-ARCHITECTURE.md](./FULLSTACK-ARCHITECTURE.md).

> Status: Proposed
>
> Date: 2026-08-01
>
> Scope: V1 audit and V2 engineering specification
>
> Implementation status: Not started

## 1. Purpose

LFW Space V2 turns the existing V1 into a production-ready static technical blog that can support hundreds of real articles, public deployment, long-term maintenance, and portfolio review.

This specification preserves the current Astro application, its LFW SPACE typographic hero, and its original visual language. V2 is an incremental evolution, not a template replacement or framework migration.

### Goals

- Make article URLs stable even when source files move.
- Provide safe and repeatable authoring, validation, statistics, and bulk-import tooling.
- Make browsing, search, taxonomy, archive, and article reading work at hundreds-of-articles scale.
- Establish measurable quality gates for accessibility, performance, security, CI, and deployment.
- Preserve static output and keep client JavaScript proportional to actual interaction needs.
- Keep all biography, project, and achievement data factual; unknown data remains `TODO`.

### Non-goals

- Node.js backend, MySQL, Redis, authentication, admin dashboard, or user accounts.
- A server-backed comment system or semantic recommendation service.
- Migration to Next.js, Nuxt, Vue SPA, or another Astro starter.
- Copying code, components, assets, or visual compositions from YukiBloom or astro-koharu.
- Adding abstractions for hypothetical V3 backend requirements.

## 2. Audit Method

The V1 audit covered Git state, project configuration, content schema, scripts, pages, layouts, components, styles, utilities, plugins, documentation, production build output, and browser behavior.

Commands executed:

```bash
git status
git log --oneline -10
git branch
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Browser checks covered 1920 px, 1440 px, 768 px, and 390 px viewports, including the home page, mobile navigation, command palette, article page, Mermaid rendering, theme persistence, and 404 page.

The requested Chrome DevTools MCP server was not available in this Codex environment. The audit therefore used the installed in-app browser controller for DOM, interaction, console, and responsive checks. Lighthouse and Chrome network/performance traces were not measured in this phase and must not be reported as completed.

Git was initially clean except for the user's untracked `src/content/blog/vue3-diff.md`. That file is excluded from all V2 changes. Work continues on local branch `feat/v2-production-blog`; no push or merge is permitted without user approval.

## 3. V1 Current Architecture

### Runtime and rendering

- Astro 7 static output with TypeScript.
- Astro pages and components render the document and article content at build time.
- React is limited to interactive islands: the command palette and Hero WebGL experience.
- Astro Client Router provides view transitions and client-side navigation.
- Native WebGL powers the Hero; it is loaded with `client:idle` and disabled for reduced motion, narrow screens, and lower-memory devices.

### Content and Markdown

- A `blog` Content Collection loads Markdown and MDX through Astro's `glob()` loader.
- Zod validates title, description, dates, category, tags, cover, draft, and featured fields.
- GFM, KaTeX, Shiki, heading anchors, custom callouts, and Mermaid fences are integrated into the Markdown pipeline.
- Article URLs currently derive from the content entry ID/file path.
- Related articles use deterministic category/tag overlap scoring.

### Search and navigation

- Pagefind indexes `dist` after `astro build`.
- The React command palette lazy-loads `/pagefind/pagefind.js` and exposes `Ctrl/Cmd + K`.
- Category, tag, archive, RSS, project, timeline, about, and 404 pages already exist.

### Styling

- `src/styles/global.css` contains design tokens, light/dark themes, layout, components, page styles, and responsive behavior.
- The site already has a recognizable monochrome/green LFW visual system and a strong typographic Hero.
- Focus styles and `prefers-reduced-motion` handling exist.

### Deployment assumptions

- Build output is `dist` and Pagefind is generated post-build.
- The repository targets Vercel static deployment without an adapter.
- Site URL is currently duplicated and hard-coded in Astro config, site config, and `robots.txt`.

## 4. V1 Strengths

- **Appropriate architecture:** static Astro output is a good fit for a content-first portfolio and avoids unnecessary runtime infrastructure.
- **Clear island boundaries:** most of the page remains static HTML; WebGL and search are isolated enhancements.
- **Recognizable design:** the LFW SPACE Hero, grid, typography, restrained motion, and editorial cards form an original foundation worth preserving.
- **Progressive enhancement:** core reading and navigation work without waiting for a client application to hydrate.
- **Good Markdown baseline:** code highlighting, math, diagrams, callouts, anchors, tables, and related posts already work.
- **Responsible data:** project and biography placeholders are explicitly marked instead of inventing achievements.
- **Responsive baseline:** no horizontal overflow was observed at the audited viewports; the 390 px home page remains readable and visually coherent.
- **Build health:** `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass on the audited branch.

## 5. V1 Technical Debt

### High priority

1. **URLs depend on file paths.** `getPostSlug()` derives the public URL from `post.id`. Renaming or reorganizing content can break every inbound link, canonical URL, RSS item, and search result for that article.
2. **Content tooling is not production-capable.** `scripts/new-post.mjs` only creates one file, has limited validation, and falls back to timestamp slugs for Chinese titles. There is no list, check, import, statistics, or migration report workflow.
3. **Site URL has multiple sources.** `astro.config.mjs`, `src/config/site.ts`, and `robots.txt` can drift. The configured domain is not yet confirmed, so canonical output can become misleading.
4. **Scale behavior is undefined.** `/blog` renders the full collection; archive and taxonomy pages have no explicit strategy for hundreds of entries.
5. **No automated release gate.** CI, E2E, accessibility smoke tests, content checks, and deployment documentation are absent.

### Medium priority

- `global.css` is about 1,800 lines and mixes tokens, global primitives, components, and page-specific rules.
- Layout and header scripts attach listeners on `astro:page-load`; cleanup is incomplete and repeated view transitions can accumulate handlers.
- Search UI advertises Arrow Up/Down and Enter behavior that is not implemented. It also lacks a complete focus trap, focus restoration, and scroll lock.
- Mobile navigation does not update its accessible label after opening and lacks Escape/focus management.
- KaTeX CSS is imported globally even when a page contains no math.
- Mermaid is dynamically loaded only when needed, but its generated JavaScript is large and needs a documented performance budget.
- Some page-level inline styles bypass the design system.
- Documentation claims capabilities more broadly than the current implementation proves.

### Low priority

- The 404 page is coherent but not yet a distinctive LFW Space experience.
- External links use `noreferrer`; V2 should standardize `noopener noreferrer` for explicit intent.
- Current abstract covers do not exercise a real image pipeline, responsive sources, placeholders, or lightbox behavior.

## 6. V1 UX Problems

- `/blog` provides taxonomy links but not an integrated search/filter/sort workflow.
- There is no series navigation or series landing page.
- Archive grouping stops at year level and will become dense with hundreds of articles.
- Desktop TOC is static; it does not indicate the current section.
- Mobile articles lack a compact current-section/read-progress header and expandable TOC.
- Article cards and detail pages do not yet use shared title/cover/meta transitions.
- Code blocks have copy actions but no filename presentation contract or line-highlight presentation standard.
- Images have no production cover/body-image contract, placeholder, lightbox, or keyboard interaction.
- Command palette search is available only after a production index exists. Development behavior is explained generically instead of clearly distinguishing the missing dev index.
- The current GitHub links point to `https://github.com/kdjfs/` rather than the owner's profile.

## 7. V1 Content System Problems

- No explicit, immutable frontmatter slug.
- No duplicate slug/title detection across the collection.
- No series model or ordering contract.
- `cover` is an unvalidated string rather than an Astro image-aware field.
- No canonical override or alias/redirect migration mechanism.
- No static validation for missing images, empty alt text, broken local links, invalid internal article links, or orphaned assets.
- No safe bulk import path for `.md`, `.mdx`, and `.txt` sources.
- No content inventory, draft filters, word totals, or update statistics.
- Drafts are filtered for display, but there is no editorial readiness report.
- MDX and embedded HTML are trusted at build time; importing unknown MDX without review could execute build-time code.

## 8. V1 Performance Risks

Measured build evidence, not Lighthouse scores:

- Vite reports at least one JavaScript chunk above its 500 kB warning threshold.
- The largest emitted raw JS chunk is approximately 662 kB; Mermaid-related chunks include approximately 435 kB and 259 kB files.
- The main layout CSS is approximately 63 kB raw, excluding font files.
- Pagefind indexed 8 pages and 907 words in the tracked production build.
- Astro discovered the untracked user article during the local build, so the generated `dist` is a working-tree baseline rather than a repository-reproducible baseline. The article remains untouched and untracked.

Risks:

- Global KaTeX CSS/font loading can add work to non-math pages.
- Mermaid remains expensive even when correctly deferred.
- Hundreds of eagerly rendered Markdown entries may increase content sync/build memory. Astro 7's `deferRender` option is a future lever if measurements show pressure, not a default change.
- Rendering hundreds of cards on one page would increase HTML, style, image, and interaction cost.
- Real cover images could regress LCP and CLS unless dimensions, responsive sources, and loading priorities are controlled.
- WebGL is already reasonably guarded; adding Three.js would increase cost without a demonstrated need.

## 9. V2 Information Architecture

```text
/
├── /blog?page=n
├── /blog/[slug]
├── /categories
├── /categories/[category]
├── /tags
├── /tags/[tag]
├── /series
├── /series/[series]
├── /archive
├── /projects
├── /projects/[slug]        (only when real project detail data exists)
├── /timeline
├── /about
├── /rss.xml
└── /404
```

### Home page

Keep the existing LFW SPACE typographic Hero. Refine it into this hierarchy:

1. Hero
2. Featured Writing
3. Latest Writing
4. Topic / Knowledge Map
5. Featured Projects
6. Timeline
7. About
8. Footer

The design remains content-first. Static composition must look complete without animation; motion only communicates hover depth, section entrance, or navigation continuity.

### Blog index

- Server-rendered initial list and SSG pagination.
- Default sort: newest published date, with explicit updated/relevance alternatives where appropriate.
- Search through Pagefind; category, tag, and series filters use indexed metadata.
- Target page size: 12 articles, configurable after testing with real content.
- URLs remain linkable and crawlable; query state must not require a full SPA.
- Featured state, publish/update date, reading time, and taxonomy are visible without excessive card density.

### Article page

Desktop:

- Constrained reading column plus sticky TOC.
- Active heading state driven by IntersectionObserver.
- Reading progress, word count, reading time, category, tags, series, dates, previous/next, and related posts.

Mobile:

- Compact sticky reading header with current section and progress.
- Expandable TOC with focus management and Escape handling.

Shared requirements:

- Stable heading anchors.
- Code copy, optional filename, and Shiki line highlighting.
- Accessible callouts, tables, blockquotes, Mermaid, and KaTeX.
- Keyboard-accessible image lightbox with focus trap, Escape close, focus return, and body scroll lock.
- Related posts use series first, then category/tags; no semantic model in V2.
- Shared view transitions for article title, cover, and metadata, disabled or simplified for `prefers-reduced-motion`.

### Taxonomy and archive

- Category is the primary broad classification; each article has one category.
- Tags are many-to-many topical connections and must be normalized for duplicate casing/spacing.
- Series is optional and ordered; series pages show sequence and current position.
- Archive groups by year, then month, with a compact timeline that remains readable at several hundred entries.
- Empty taxonomy values are not generated as routes.

## 10. V2 Design System

The V2 visual system extends, rather than replaces, the current tokens.

### Principles

- Original LFW typography, green signal color, black/white contrast, and grid language remain the identity.
- Neutral surfaces carry most content; accent color marks state and focus instead of filling every component.
- Cards are editorial units, not nested decoration.
- Motion follows hierarchy: section entrance, card depth, image reveal, and route continuity.
- Every animated feature has a reduced-motion equivalent.
- Light and dark themes share semantic tokens and contrast targets.

### Token layers

```text
foundation: color, type scale, spacing, radii, borders, shadows, motion
semantic: canvas, surface, elevated, text, muted, accent, danger, focus
component: header, card, prose, code, toc, command, timeline
```

### CSS organization

Refactor incrementally:

```text
src/styles/
├── tokens.css
├── base.css
├── utilities.css
├── prose.css
├── components.css
└── global.css             # import boundary, not another style dump
```

Page-specific styles may remain colocated in `.astro` components when they are genuinely local. Avoid both one giant stylesheet and one-file-per-selector fragmentation.

### Interaction contract

- Hover effects never shift layout.
- Focus-visible state is at least as clear as hover state.
- Card spotlight/depth uses pointer media queries and is disabled on coarse pointers.
- Entrance transitions are staggered by section, not applied globally to every node.
- WebGL remains an enhancement and preserves the current low-power/reduced-motion fallbacks.

## 11. V2 Content Model and URL Strategy

### Proposed resolved article model

```ts
interface BlogData {
  slug: string;
  title: string;
  description: string;
  publishDate: Date;
  updatedDate?: Date;
  category: string;
  tags: string[];
  series?: string;
  seriesOrder?: number;
  cover?: ImageMetadata;
  draft: boolean;
  featured: boolean;
  toc: boolean;
  canonical?: string;
  aliases?: string[]; // previous blog slugs
}
```

Authors write dates, canonical URLs, and cover paths as frontmatter strings. Zod coerces dates, validates canonical URLs, and resolves a local cover path through Astro's `image()` helper into `ImageMetadata` before page code consumes this model.

Decisions:

- `slug` is required, lowercase, URL-safe, unique case-insensitively, and independent from file location.
- `description` remains required. Import tooling may infer a candidate, but the report must mark it as inferred for human confirmation.
- `updatedDate` is optional and cannot precede `publishDate`.
- `seriesOrder` is valid only when `series` exists; duplicate order values in one series are errors.
- `cover` uses Astro's image schema helper so local metadata and dimensions are available.
- `toc` defaults to `true` and permits article-level opt-out.
- `canonical` is only for a verified original/external publication URL. It is not populated with an invented domain.
- `aliases` is optional and exists only for deliberate migrations, not routine authoring.

### URL migration

1. Add explicit slugs to every tracked V1 article using its current public filename-derived slug.
2. Change route generation and all internal helpers to use `data.slug`.
3. Run a migration check comparing old and new route manifests; the initial migration must produce zero changed URLs.
4. When an intentional slug change occurs, require the old path in `aliases` and generate a static redirect/redirect rule.
5. Reject duplicate canonical slugs and aliases during `content:check`.
6. File rename or movement after migration must not change a public URL.

This approach uses frontmatter as the stable public identity while leaving Astro's collection entry ID free to represent the source file. Astro's loader supports custom IDs, but a frontmatter route key is clearer for editors and migration review.

## 12. V2 Content Pipeline

### Command surface

```bash
pnpm content:new
pnpm content:list [filters]
pnpm content:check
pnpm content:import "<source-directory>" --dry-run
pnpm content:stats
pnpm new:post                    # compatibility alias for content:new
```

Use one CLI entry point with focused internal modules for parsing, slugging, validation, reporting, and file operations. Do not create a separate framework or duplicate Astro's schema.

### `content:new`

Interactive fields:

- title, description, category, tags, publish date
- draft, featured
- optional series, slug, cover

Slug algorithm:

1. Normalize Unicode and trim whitespace.
2. Preserve lowercase ASCII words and digits.
3. Convert Chinese characters to toneless pinyin with word boundaries.
4. Normalize separators to one hyphen and strip unsafe characters.
5. Validate against `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
6. Check canonical slugs and aliases case-insensitively.
7. Stop on conflict; never overwrite and never silently append a random suffix.

Example: `Vue3 Diff 算法详解` becomes `vue3-diff-suan-fa-xiang-jie`.

The generated file uses exclusive creation and a complete schema-valid frontmatter block. Filename may mirror the slug for discoverability, but URL stability does not depend on it.

### `content:list`

Columns:

- title, slug, category, publish date, draft, featured, series

Filters:

```text
--draft
--published
--category <name>
--search <text>
```

Output must remain readable in a terminal and offer a machine-readable `--json` mode for future automation.

### `content:check`

Errors fail with a non-zero exit code; warnings are summarized separately.

Required checks:

- Frontmatter/schema validity and illegal dates.
- Duplicate slug, alias, and title detection.
- Draft inventory and publication readiness.
- Missing cover/body images and unsafe paths.
- Markdown images with missing or empty alt text.
- Broken relative links and local asset references.
- Invalid internal article links, including links to draft-only targets from published pages.
- Orphaned assets inside managed article asset directories.
- Series/order consistency.
- Stale generated LQIP manifest.

Reasonable limitations:

- Remote URL availability is not a default build-blocking check because it is slow and nondeterministic. An opt-in network check may report it separately.
- Dynamic MDX expressions, computed links, raw HTML generated at runtime, and links inside custom components cannot always be proven statically. They are reported for manual review.
- Duplicate title detection is an error by default but can later support an explicit, documented exception if real editorial needs appear.

### `content:stats`

Report:

- total, published, and draft article counts
- category, tag, and series counts
- total CJK/word count
- estimated total reading time using the same shared algorithm as article pages
- latest content update timestamp

The command must not count frontmatter, code punctuation, or generated HTML as prose.

### `content:import`

Safety contract:

- Recursively scan `.md`, `.mdx`, and `.txt`; report all other formats without modifying them.
- Never write to, rename, or delete anything in the source directory.
- Default to dry-run when neither `--dry-run` nor the explicit write flag is provided.
- Never overwrite an existing article or asset.
- Reject source/destination path traversal and symlink escapes.
- Apply configurable scan limits with conservative defaults: 10,000 files, 10 MB per text file, and 1 GB total referenced assets. Exceeding a limit stops before writing and requires an explicit reviewed override.
- Validate imported image extension, size, and magic bytes before copying it into a managed asset directory.
- Write complete files atomically only after the report has no blocking conflicts.

Analysis pipeline:

1. Detect encoding and supported extension.
2. Parse existing frontmatter when present.
3. Infer title from frontmatter, then the first H1, then filename.
4. Infer a description only from the first safe prose paragraph and mark it for review.
5. Generate or validate the stable slug.
6. Inventory local image references and alt text.
7. Resolve relative/internal links and build a proposed slug mapping.
8. Detect destination, slug, title, asset, and series conflicts.
9. Classify each entry as create, skip, conflict, or needs-review.
10. Generate a Markdown and JSON migration report.

`.mdx` receives stricter handling: imports, exports, JSX, raw scripts, and unknown components are flagged for manual review before the file can enter the build. A source directory is data, not trusted executable code.

Dry-run report fields:

- source and proposed destination
- detected/inferred fields with confidence/source
- proposed slug and route
- asset copy plan
- rewritten internal-link plan
- warnings, conflicts, and required human decisions

Real import requires an explicit write flag and a previously reviewed report. The report hash must still match the source inventory, preventing a changed directory from being imported under an old approval.

## 13. Article Image System

### Storage strategy

- Keep author-owned article images in `src/assets/blog/<article-key>/` or alongside an article bundle under `src/content/blog/<article-key>/`.
- Keep only pass-through assets such as favicon, robots, and deliberately unprocessed downloads in `public`.
- Resolve cover images with Astro's content `image()` helper.
- Use standard relative Markdown image syntax for body images so Astro can infer dimensions and optimize local files.

### Rendering contract

- Width and height are always present to prevent CLS.
- Responsive `srcset`/`sizes` use constrained or full-width layouts appropriate to the prose container.
- Below-the-fold images use `loading="lazy"` and `decoding="async"`.
- Only the actual LCP image may be eager/high-priority, and only after measurement.
- Alt text is required for informative images; decorative images use explicit empty alt and are distinguishable by an intentional marker in tooling.
- Remote images require an allowlist before optimization.

### LQIP

- Generate a tiny blurred placeholder and dominant fallback color at authoring/check time, not on every render.
- Cache by source-content hash in a deterministic generated manifest.
- `content:check` fails when the manifest is stale; CI never rewrites it.
- Cap embedded placeholder size to avoid moving image bytes from network files into oversized HTML.
- If placeholder generation fails, render the measured aspect-ratio box and theme surface color, never collapse layout.

The implementation may use a direct development-only `sharp` dependency if profiling proves Astro's existing image API cannot provide the required cached placeholder artifact. No browser bundle may include the generator.

### Lightbox

- Progressive enhancement: the source image remains a normal link/image without JavaScript.
- Dialog semantics, labelled close action, focus trap/return, Escape close, and scroll lock are mandatory.
- Respect reduced motion and avoid downloading a separate full-size image until requested.

## 14. Search and Command Palette

Continue using Pagefind after the static build. Pagefind's documented model generates a static `/pagefind` bundle from built HTML, which explains why full search is a production-build feature rather than an Astro dev-server feature.

V2 requirements:

- `Ctrl/Cmd + K` opens the palette; Escape closes it.
- Arrow keys update an active option using `aria-activedescendant` or roving focus.
- Enter activates the selected result.
- Focus is trapped while open and restored to the opener when closed.
- Body scrolling is locked while the modal is active.
- Results cover articles, categories, tags, series, projects, and static pages.
- Pagefind metadata supplies result type, description, taxonomy, date, and image.
- Search/filter metadata is emitted only from intentional content regions; navigation/footer noise is excluded.
- Development mode clearly states that full search requires `pnpm build` plus a static preview, while quick page actions remain available.

## 15. SEO and Structured Data

- Use one verified site URL supplied through deployment configuration; do not hard-code an unconfirmed domain.
- `astro.config.mjs` owns the resolved `site` value. Layouts, RSS, sitemap, robots, and structured data consume `Astro.site` or the same resolved configuration.
- Set GitHub profile to `https://github.com/kdjfs/kdjfs`.
- Emit canonical links only when a valid site URL exists; per-article `canonical` overrides only for verified syndication.
- Preserve RSS and sitemap and generate `robots.txt` from the same URL source.
- Add article-specific Open Graph and Twitter metadata.
- Add Article, Person, and Breadcrumb JSON-LD with factual data only.
- Add taxonomy landing metadata and sensible titles/descriptions.
- Validate that drafts are absent from pages, feeds, sitemap, Pagefind, and structured data.
- A generated LFW Space OG image is optional for V2 only if it is deterministic, local, cached, and does not delay the core delivery sequence.

## 16. Deployment Architecture

```text
GitHub branch / pull request
        ↓
Vercel Preview build
        ↓
pnpm install --frozen-lockfile
        ↓
Astro static build → dist HTML/assets
        ↓
Pagefind indexes dist → dist/pagefind
        ↓
Preview verification
        ↓
main → Production deployment
```

Decisions:

- Keep `output: "static"`.
- Do not install `@astrojs/vercel` while the project does not use on-demand rendering or Vercel runtime features. Astro documents zero-configuration static deployment to Vercel.
- Vercel Preview is created from non-production branches/PRs; `main` is Production.
- Configure the real production URL only after Vercel allocates it and it is confirmed by the owner.
- Custom domain migration updates the one site URL source and validates redirects/canonical output before promotion.
- Rollback points the production domain to a previously verified deployment; content can also be reverted with a normal Git revert and redeployment.

## 17. Testing Strategy

### Content/CLI tests

Use temporary fixture directories and the native Node test runner unless implementation needs prove a dedicated runner worthwhile.

Cover:

- mixed Chinese/English slug generation
- slug collision and no-overwrite behavior
- schema/date/series validation
- link and image resolution
- missing/empty alt detection
- import dry-run classifications
- source immutability
- path traversal and symlink escape rejection
- atomic write failure behavior
- stable statistics and reading-time calculation

### Playwright E2E

Desktop Chromium and a 390 px mobile viewport:

- home and primary navigation
- dark/light/system theme and transition persistence
- blog pagination/filter entry points
- article render, progress, TOC, code copy, Mermaid, and KaTeX
- command palette keyboard flow and Pagefind results
- mobile menu and mobile TOC
- image lightbox keyboard behavior
- 404 and internal navigation
- no horizontal overflow and no uncaught console errors on core routes

Add a 320 px narrow-screen layout smoke test in addition to the user acceptance viewports. Every filtered/listing interface must also exercise loading, empty, no-results, and recoverable error states where those states can occur.

Use a production static preview because Pagefind is generated after build. Tests must run against tracked fixtures only, not personal untracked drafts.

### Accessibility

- Automated smoke checks for landmarks, names, focus order, dialogs, color contrast, and common violations.
- Manual keyboard pass for header, command palette, mobile menu, TOC, code copy, lightbox, and pagination.
- Screen-reader-oriented DOM snapshots for article and search flows.
- Target Lighthouse Accessibility >= 95, measured on the production build; do not substitute a target for an actual result.

## 18. Performance Strategy

### Budgets

- Lighthouse production targets: Performance >= 90, Accessibility >= 95, Best Practices >= 95, SEO >= 95.
- CLS target <= 0.1; LCP target <= 2.5 s; INP target <= 200 ms at the 75th percentile where field data is available.
- Provisional transfer budgets on core routes: initial JavaScript <= 200 kB gzip, initial CSS <= 50 kB gzip, above-the-fold raster image <= 200 kB each, and route-required fonts <= 150 kB compressed. Measure the existing baseline first; a temporary exception needs evidence, an owner, and a removal plan.
- No unexpected client JavaScript on static taxonomy/archive pages.
- Every client island and large dynamic import must have a documented interaction owner and loading trigger.

### Planned work

- Measure production pages before and after each performance-sensitive feature.
- Keep native WebGL and its existing device/reduced-motion guards; do not add Three.js.
- Load Mermaid only when a page contains Mermaid and preserve a readable source/fallback on failure.
- Scope KaTeX styles/assets to pages that contain math if Astro's build pipeline supports this without duplicated CSS.
- Paginate article listings and avoid hydrating their cards.
- Use optimized, dimensioned, responsive images and cached placeholders.
- Inspect font files, `font-display`, and preload only the font actually needed for above-the-fold text.
- Add a build artifact report; introduce hard bundle thresholds only after a measured baseline avoids false failures.

No Lighthouse score is recorded in this specification because the required measurement tooling was unavailable during the audit.

## 19. Security Model

Threat model: content committed by the owner is trusted, but bulk-import source directories and external links are untrusted input.

- Never execute imported MDX before manual review.
- Reject path traversal, absolute destination writes, unsafe symlink targets, and overwrite attempts in content tooling.
- Parse frontmatter and Markdown with structured parsers; do not use regex as the primary parser.
- Sanitize or reject unsupported raw HTML during import. Keep a documented allowlist for intentional authored HTML.
- Standardize external `target="_blank"` links with `rel="noopener noreferrer"`.
- Keep secrets out of content, generated reports, browser bundles, and GitHub Actions logs.
- GitHub Actions uses least privilege: `permissions: contents: read` unless a job proves it needs more.
- CI never modifies files or creates commits.
- Run dependency audit as a reporting/security-review step, with actionable severity policy rather than blind automatic upgrades.
- Treat `packageManager`, `pnpm-lock.yaml`, and CI as one installation boundary. Pin Node/pnpm, review install scripts and lockfile changes, and never run forced audit remediation automatically.
- Before release, run the native pnpm audit/signature checks available for the pinned toolchain and document reachability plus review dates for any deferred finding.
- Evaluate CSP in Report-Only mode first because inline theme bootstrapping, Astro transitions, Pagefind, and WebGL must be accounted for. Do not ship a CSP that breaks the site.
- Do not expose source paths or imported absolute paths in public migration reports.

## 20. CI/CD

Proposed `.github/workflows/ci.yml` triggers on pull requests and pushes to protected branches.

```text
checkout
setup pnpm and supported Node version
pnpm install --frozen-lockfile
pnpm content:check
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
Playwright production smoke tests
```

Rules:

- Pin action major versions and review update changes.
- Set job timeouts and cancel superseded runs for the same branch.
- Upload Playwright reports only on failure or with short retention.
- Never auto-format, auto-commit, auto-merge, or deploy through an unreviewed privileged workflow.
- Vercel Git integration owns Preview/Production deployment; GitHub Actions is an independent quality gate.

## 21. Dependency Gate

No dependencies are added during the specification phase.

Candidates for implementation must pass this review:

| Candidate                            | Purpose                               | Native alternative                                                         | Runtime impact                | Decision gate                                                                           |
| ------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| `pinyin-pro`                         | Stable Chinese pinyin slug generation | Hand-written mappings are incomplete and high-risk                         | CLI only; zero browser bundle | Verify maintenance, license, lockfile size; add as dev dependency                       |
| Frontmatter/Remark parser packages   | Structured import/check analysis      | Regex cannot safely parse nested YAML/Markdown                             | CLI only                      | Prefer already-direct Unified ecosystem packages; declare any imported package directly |
| `@playwright/test`                   | Production browser smoke tests        | Manual checks are not repeatable in CI                                     | Dev/test only                 | Add when E2E phase starts; install Chromium only in CI                                  |
| `sharp` (possible)                   | Deterministic cached LQIP generation  | Astro image APIs may cover core optimization but not reusable placeholders | Build/CLI only                | Add only after a spike proves it necessary; never ship to browser                       |
| Accessibility test helper (optional) | Automated common-rule smoke test      | Playwright assertions cover only selected rules                            | Dev/test only                 | Add only if it finds useful issues without unstable noise                               |

Animation libraries are not planned. CSS, Web Animations, IntersectionObserver, and Astro View Transitions cover the specified motion.

## 22. Documentation Plan

Implementation updates:

- `README.md`: setup, commands, authoring, validation, preview, and release workflow.
- `docs/ARCHITECTURE.md`: static architecture, island boundaries, content/query flow, and generated artifacts.
- `docs/ROADMAP.md`: replace the conflicting old V2 outline with the approved delivery sequence.
- `docs/CONTENT.md`: schema, editorial conventions, images, links, drafts, series, and publishing.
- `docs/content-import.md`: dry-run, migration report, conflict handling, apply, and rollback.
- `docs/DEPLOYMENT.md`: GitHub → Vercel → Astro → Pagefind → `dist`, previews, production, domains, rollback.
- `docs/PERFORMANCE.md`: reproducible measurement environment, baselines, budgets, and results.

Proposed ADRs:

- `ADR-001-content-url-strategy.md`
- `ADR-002-image-pipeline.md`
- `ADR-003-search-pagefind.md`
- `ADR-004-static-deployment.md`

ADRs record durable decisions and alternatives; they do not duplicate command tutorials.

## 23. Incremental Delivery Plan

### Phase A: content foundation

- Stable schema and URL migration with zero changed existing routes.
- Production content CLI and tests.
- Import migration report and content documentation.
- GitHub profile/site URL source correction without inventing a domain.

### Phase B: reading and images

- Cover/body image pipeline, cached LQIP, and image checks.
- Article layout, active/mobile TOC, code enhancements, lightbox, series, previous/next, related posts.
- Shared article transitions with reduced-motion fallback.

### Phase C: discovery and visual refinement

- Paginated/filterable blog index.
- Category, tag, series, and archive redesign.
- Command palette keyboard/accessibility completion and Pagefind metadata.
- Incremental home, project, about, and 404 refinement within the LFW visual system.

### Phase D: production gate

- SEO/structured data.
- CI, Playwright, accessibility smoke tests.
- Performance profiling and regressions fixes.
- Security review, deployment docs, and launch checklist.

Each phase should end with focused tests, a review, updated documentation, and one or more atomic conventional commits. Critical and high review findings block the next phase.

## 24. Acceptance Criteria

### Content and URLs

- Existing tracked article URLs remain unchanged after explicit-slug migration.
- Moving an article source file does not change its URL.
- All five content commands work and are documented.
- `content:check` fails on duplicate slug, invalid schema/date, missing local image, broken local/internal link, and missing required alt.
- Import dry-run modifies no source or destination file and produces a complete migration report.
- Apply mode never overwrites and can be reverted with a documented file/Git procedure.

### UX and accessibility

- Home preserves the LFW SPACE identity and has no horizontal overflow at 1920, 1440, 768, 390, and 320 px.
- Blog, taxonomy, series, and archive remain usable at a fixture size representative of hundreds of articles.
- Article desktop/mobile TOC, progress, code copy, diagrams, math, images, and navigation work with keyboard access.
- Command palette Arrow Up/Down, Enter, Escape, focus trap, focus return, and Pagefind results pass E2E tests.
- Lightbox and mobile menu meet the same dialog/focus standards.
- Reduced-motion mode removes nonessential motion without hiding content.

### Engineering

- `pnpm content:check`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and Playwright pass on tracked files.
- Pagefind is generated inside `dist` and works in the production static preview.
- No draft appears in generated public discovery surfaces.
- Core routes have no uncaught console errors or broken local images.
- GitHub Actions uses read-only permissions and does not modify the repository.
- No server adapter/backend is added.

### Performance and launch

- Lighthouse scores are measured from a production build and meet the stated targets, or any exception is recorded with evidence and owner approval.
- Image dimensions prevent visible CLS in audited article fixtures.
- Mermaid, KaTeX, Pagefind, and WebGL are loaded only where/when justified.
- Deployment, Preview, Production, custom-domain update, and rollback steps are reproducible from documentation.

## 25. Reference Boundaries

### Ideas studied from YukiBloom / astro-koharu

- A mature blog needs visible article count/metadata, featured writing, pagination, taxonomy, archives, and series rather than only a chronological feed.
- Mobile article reading benefits from a compact current-section/progress header and expandable TOC.
- Pagefind can support a complete static search experience when metadata and keyboard interaction are intentionally designed.
- LQIP, reading progress, reading time, article relationships, and content tooling improve the product's completeness.
- A large real archive needs deliberate content density and navigation instead of rendering everything at once.

### Why LFW Space uses a different implementation

- LFW Space keeps its own monochrome/green, typographic, grid-based visual identity rather than Koharu's pink/blue ACG theme or YukiBloom's composition.
- It keeps the existing native WebGL Hero and its device fallbacks rather than adopting another theme's visual effects.
- Taxonomy remains intentionally shallow: one category, multiple tags, optional series. V2 does not inherit multi-level theme complexity without real content evidence.
- Content tooling is designed around LFW Space's stable-slug and migration-report requirements.
- The implementation stays inside the existing repository and component system.

astro-koharu is AGPL-3.0. During this audit, only its public site information architecture, public README/feature descriptions, and license declaration were reviewed. No repository source component, CSS implementation, asset, or code was copied. Future implementation must be written from this specification and Astro/Pagefind platform documentation, with code review explicitly checking for accidental visual or structural imitation.

## 26. Open Questions Before Production Configuration

These do not block content-pipeline implementation:

- Confirm the real Vercel Production Domain before enabling canonical/sitemap production URLs.
- Confirm the author's final biography, avatar, contact links, resume facts, and project case-study data.
- Confirm whether intentional decorative article images need an explicit frontmatter/Markdown convention for empty alt.
- Validate the first real bulk source directory during dry-run before finalizing import heuristics.
- Decide whether automatic OG images justify their build cost after the core image pipeline is measured.

## 27. Sources

Primary implementation references:

- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/)
- [Astro image guide](https://docs.astro.build/en/guides/images/)
- [Astro view transitions](https://docs.astro.build/en/guides/view-transitions/)
- [Astro static deployment to Vercel](https://docs.astro.build/en/guides/deploy/vercel/)
- [Pagefind build/index workflow](https://pagefind.app/docs/running-pagefind/)
- [Pagefind metadata](https://pagefind.app/docs/metadata/)
- [Pagefind filtering](https://pagefind.app/docs/filtering/)
- [Vercel environments](https://vercel.com/docs/deployments/environments)
- [Vercel rollback](https://vercel.com/docs/instant-rollback)

Product-completeness references only:

- [YukiBloom public site](https://yuki-bloom.vercel.app/)
- [astro-koharu public repository README and license](https://github.com/kdjfs/cosZone/astro-koharu)
