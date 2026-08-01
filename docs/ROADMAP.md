# LFW Space Roadmap

Roadmap 描述方向，不承诺虚构的发布日期。只有 V1 在当前仓库实现，其余阶段均为架构规划。

## V1 · 静态数字花园（当前）

- Astro SSG、TypeScript、React Islands。
- Markdown / MDX、Content Collections、Zod。
- 首页、文章、分类、标签、归档、项目、时间线、关于与 404。
- Pagefind 全文搜索与命令面板。
- Light / Dark / System、View Transitions、阅读进度、TOC。
- Shiki、GFM、Mermaid、KaTeX、Callout、代码复制。
- Sitemap、RSS、robots、canonical、OpenGraph。
- Vercel 静态部署。

## V2 · 内容反馈

- 评论与审核策略。
- 点赞、浏览量与文章排行榜。
- 友链与更完整的 RSS 元数据。
- PWA 与离线阅读评估。

优先评估成熟托管方案，不急于自建后端；第三方脚本必须经过性能与隐私评审。

## V3 · Node.js Backend

当互动数据和业务规则足以证明后端必要时，新增独立 API 服务。NestJS、Fastify、Express 不提前锁定：模块复杂度高选 NestJS，轻量高性能选 Fastify，明确依赖 Express 中间件生态时再选 Express。

## V4 · MySQL

规划实体：

- `users`
- `posts`（只存动态映射或发布元数据，Markdown 仍是内容源）
- `comments`
- `likes`
- `views`

必须补齐迁移、备份、恢复演练和隐私数据生命周期。

## V5 · Redis

- 热门文章排行榜。
- 浏览量聚合与写回。
- Session。
- Rate Limit。
- 热点数据缓存。

Redis 仅作加速层；可恢复事实必须落到 MySQL 或日志。

## V6 · 登录

- GitHub OAuth。
- 邮箱登录。
- 账号绑定、注销与数据导出。
- CSRF、会话轮换、异常登录与速率限制。

## V7 · 管理后台

- 文章发布流程。
- 评论管理。
- 访问统计。
- 权限与审计日志。

后台与公开站点分离权限边界，不把管理代码打进访客页面。

## V8 · AI 能力

- 文章 AI 摘要。
- 相关文章语义推荐。
- 博客知识库与 RAG。
- AI Blog Assistant。

AI 输出必须可标识、可回退、可评估。密钥和提示词只在服务端处理，文章原文不能被无边界发送给第三方。

## 进入下一阶段前的检查

1. 是否有真实用户问题，而不是为了使用某项技术？
2. 静态或托管能力能否更低成本解决？
3. 新增的数据归谁所有，如何备份与删除？
4. 对性能、隐私、安全与长期维护有什么代价？
5. 是否能保持内容层与交互层的清晰边界？
