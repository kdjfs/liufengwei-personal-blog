# Contributing to LFW Space

LFW Space 是一个长期维护的个人技术博客、Digital Garden 与 Learning OS。公开文章以 Markdown / MDX + Git 为事实来源；静态阅读不依赖后端；个人学习数据默认保存在浏览器本地。

## 本地环境

- Node.js 22.12 或更高版本
- pnpm 10.x（仓库锁定为 pnpm 10.24.0）

```bash
pnpm install --frozen-lockfile
pnpm dev
```

常用开发入口：

- `pnpm dev`：准备并监听文章，启动 Astro；有有效 DeepSeek Key 时启动或复用本地 AI Gateway，没有 Key 时仍可正常开发静态站。
- `pnpm dev:ai`：严格的本地 AI 联调模式；缺少有效 Key 或 Gateway 启动失败时直接报错。
- `pnpm dev:fullstack`：启动 Docker 中的 MySQL / Redis、执行迁移，并同时运行 Fastify 与 Astro；仅用于可选全栈能力联调。
- `pnpm ai:doctor`：只读检查本地 AI 配置与 Gateway 状态，不打印 Secret；需要真实最小探测时追加 `--probe`。

## 贡献文章

将 `.md` 或 `.mdx` 文件放入 `src/content/blog/<分类>/`，保留稳定的 `slug`，并使用仓库 Content Collection 支持的 Frontmatter。提交前至少运行：

```bash
pnpm content:check
```

也可以使用 `pnpm content:new` 创建文章。草稿保持 `draft: true`，不应进入公开构建。

## 贡献代码

从最新目标分支创建短生命周期分支。分支使用 `feat/`、`fix/`、`refactor/`、`docs/` 或 `chore/` 等清晰前缀；Codex 生成的分支使用 `codex/` 前缀。一个 commit 只完成一个逻辑事项，提交信息采用 Conventional Commits，例如：

```text
feat(graph): add deterministic knowledge graph data
fix(article): preserve copy fallback
```

Pull Request 应说明动机、改动、验证结果、风险和生产影响；UI 改动附 Desktop / Mobile 截图。不要把未完成验证伪装成通过，使用 `UNVERIFIED` 明确记录即可。

## Quality commands

按改动范围选择最小相关检查，合并前再运行完整门禁：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm bundle:report
pnpm seo:check
pnpm release:check
```

## Secret 与架构边界

从 `.env.example` 创建未跟踪的 `.env.local`。任何 API Key、Token、Cookie、真实连接串或私密学习数据都不得提交到源码、文档、测试或 Git 历史。

贡献应继续遵守以下边界：公开阅读保持静态可用；Markdown / MDX + Git 是公开内容唯一事实来源；IndexedDB 学习数据保持 Local-first；可选 AI 与全栈服务不得成为文章浏览的必要依赖。
