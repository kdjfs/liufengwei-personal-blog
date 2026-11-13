# Changelog

All notable changes to LFW Space are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- 首页首屏改版：新增身份标识、职位线、入口按钮、内容统计与滚动提示，并叠加缓慢漂移的极光层与滚动视差。
- 文章页新增顶部渐变细线、目录竖向轨道与当前章节圆点高亮。
- 主题切换新增基于 View Transitions 的圆形扩散过渡，站内路由切换统一为短距离淡入。
- AI 新增 `DEEPSEEK_FALLBACK_MODEL` 降级模型：主模型遇到 429/5xx 或网络异常时自动重试一次，并在 `x-lfw-ai-model` 响应头标出实际模型。
- AI 健康检查返回实际模型与降级模型，便于部署后核对配置。

### Changed

- 设计令牌集中到 `theme.css`：重排配色、阴影层级与动效曲线，暗色模式同步调优。
- 导航滚动后收成浮动胶囊，导航项由下划线改为胶囊高亮；移动端隐藏重复的 GitHub 入口。
- 文章卡片入口文案由 `more...` 改为「阅读全文」，列表页统一为胶囊按钮。
- 经历条目补充业务标签；「关于」页展示每段经历的摘要。

### Fixed

- 提交的 `api/chat.mjs` 与 `api/*.ts` 不同步的问题，重新生成函数产物。
- 博客列表等非首页缺少 `.post-meta-details` 样式，导致日期、字数、时长粘连。
- `projects` 数据中生猪健康管理项目的 GitHub 链接拼写错误。

### Data

- 实习经历更新为：智跃深空（2026.10 - 至今）、NemoVideo（2026.07 - 2026.09）、用友网络（2026.03 - 2026.07）、软子数字（2025.11 - 2026.03）、东华同创（2025.06 - 2025.10）。
- 时间线与个人简介同步到当前就职状态。

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
