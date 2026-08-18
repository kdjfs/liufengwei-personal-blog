# LFW Space Roadmap

Roadmap 记录已完成能力、当前维护基线与候选方向，不把“仓库已实现”写成“生产已启用”。详细边界见 [FULLSTACK-ARCHITECTURE.md](./FULLSTACK-ARCHITECTURE.md)。

## Historical delivery（已完成）

- Phase 0：学习完成状态持久化竞态、Markdown 高亮兼容与 release gate blocker 已修复。
- Phase 1：pnpm workspace、共享契约、Fastify API、MySQL migrations、Better Auth GitHub OAuth、Local-first 云同步、Redis 分布式 AI 控制、Node AI Gateway 和延迟加载的 Web 集成均已进入仓库。
- Web 默认行为保持兼容：不配置云端 URL 时继续使用静态阅读、IndexedDB 和 Vercel `/api/chat`。
- 单元、API、MySQL/Redis 集成、Docker、浏览器与发布检查均有仓库命令和 CI 门禁；CI 不使用真实 GitHub OAuth 或 DeepSeek Secret。

## Current maintenance baseline

| 能力                                           | 仓库已实现 | CI/本地门禁           | 可选运行 | 当前生产已确认   |
| ---------------------------------------------- | ---------- | --------------------- | -------- | ---------------- |
| Astro 静态内容、Pagefind、SEO、Learning OS     | 是         | 是                    | 否       | 是，生产默认     |
| Vercel `/api/chat` 与 `/api/ai-health`         | 是         | 是                    | 否       | 是，生产默认     |
| Fastify `/api/v1`、MySQL、Redis、Docker        | 是         | 是                    | 是       | 未由仓库证据确认 |
| GitHub OAuth、会话、跨设备同步                 | 是         | 是（外部服务 mocked） | 是       | 未由仓库证据确认 |
| Node `/api/v1/ai/chat`、私有上下文、会话持久化 | 是         | 是（Provider mocked） | 是       | 未由仓库证据确认 |

维护工作限定为文章、Bug 修复、依赖与安全升级、性能/可访问性回归、CI 与生产运维。任何生产路由切换都需要独立部署、数据迁移、监控、回滚和 smoke 证据，不能仅凭合并代码宣布完成。

## Future candidates（按证据触发）

- 在有明确生产需求和基础设施后部署可选 Node 栈，并灰度切换云同步或 AI 路由。
- 在语料规模和召回评测证明现有词法检索不足后，再评估 embedding / hybrid rerank。
- 在真实运维需求出现后补充集中式可观测性，而不是为展示扩大系统。

## Explicit non-goals

- 不将 Astro 根目录搬入 `apps/web`，不把 Markdown 正文迁入数据库。
- 不增加公开社交排行、复杂管理后台、邮箱密码登录或新的 AI Provider。
- 不自动 merge `main`、打 tag，或让生产默认依赖未经部署验证的后端。
