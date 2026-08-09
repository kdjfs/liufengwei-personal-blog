# LFW Space Roadmap

Roadmap 描述可验证的交付顺序，不承诺虚构日期，也不把 Production-ready 写成已上线。

## Phase 0 · Release blocker（完成）

- 修复学习完成状态的 IndexedDB 持久化竞态。
- 统一 Redis Markdown fence 的 Shiki alias。
- 本地 `pnpm release:check` 通过。
- PR #3 对应 GitHub Actions Linux CI 已于 2026-08-10 Green。

Phase 0 已闭环；其测试与断言不得在后续阶段被弱化。

## Phase 1 · Full-Stack foundation（当前）

### 1A · Architecture and workspace

- 完整审计当前 Web、Learning、AI、API、测试、CI 与部署边界。
- 保持 Astro 项目位于仓库根目录；新增 `server/` 与 `packages/contracts/`。
- 建立 pnpm workspace、环境契约和可独立测试的 Fastify app factory。

### 1B · MySQL and migrations

- Drizzle + mysql2，代码优先生成并提交 SQL migration。
- Better Auth 所需表与动态用户数据表进入 MySQL；Markdown 继续以 Git 为真相源。
- Fresh DB 与 existing DB migration 都必须通过集成测试。

### 1C · GitHub OAuth and sessions

- 使用成熟认证库，不手写 OAuth、密码或 JWT 刷新体系。
- MySQL-backed、HttpOnly cookie session；严格 Origin/CORS/CSRF 边界。
- 测试认证适配器只能在 `NODE_ENV=test` 启用。

### 1D · Local-first cloud sync

- IndexedDB versioned migration，不删除任何现有学习数据。
- device identity、offline mutation queue、operation idempotency。
- per-device progress、annotation tombstone/conflict、favorites 与 cloud aggregate。

### 1E · Distributed AI controls

- 现有 Retrieval 2.0、Fast/Deep、Selection、Listening 与 SSE contract 保持兼容。
- Redis 承担跨实例 AI rate limit、并发协调和短 TTL cache，不作为数据真相源。
- 旧 Vercel `/api/chat` 保留，Node gateway 通过 strangler migration 逐步接管。

### 1F · Web integration

- 只增加 account、sync status 与 AI private-context consent 所需 islands。
- 未配置 `PUBLIC_CLOUD_API_URL` 时保持当前 local-only 行为。
- 公开文章初始 bundle 继续以 45 KiB gzip 为硬预算。

### 1G · Full-stack release gate

- Web Quality、API Quality、MySQL/Redis integration、security、Playwright E2E。
- Docker health、migration、audit、secret scan 与浏览器矩阵全部通过。
- 后端没有真实云凭据时只声明 Production-ready，不声明已上线。

## 暂不进入本轮

- 将 Astro 根目录搬入 `apps/web`。
- Markdown 正文迁入 MySQL。
- 公开社交/点赞排行榜、复杂管理后台、邮箱密码登录。
- Vector DB、Embedding 服务、完整 PWA/Service Worker。
- 为展示而接入整套 Prometheus/Grafana/OpenTelemetry/Sentry。
- 自动 merge `main`、打 `v2.0.0` tag 或让生产站默认依赖未部署后端。

详细架构、数据与故障策略见
[FULLSTACK-ARCHITECTURE.md](./FULLSTACK-ARCHITECTURE.md)。
