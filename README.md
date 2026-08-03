# LFW Space

> 刘凤伟的数字花园 —— 记录技术、项目、思考与成长。
> 在线浏览：https://liufengwei-personal-blog.vercel.app/
> LFW Space 是一个内容优先的个人博客、项目作品集与数字花园。它不是套用现成主题的换皮项目：视觉语言、组件边界、内容模型与交互均围绕长期维护重新设计。

> 首页预览截图占位：项目稳定部署后，将真实桌面端与移动端截图放入 `docs/` 并在这里展示。

## 技术栈

- Astro 7 + TypeScript，SSG 静态输出。
- React 19 Islands，用于命令面板、Hero WebGL 生命周期与 LFW AI。
- Tailwind CSS 4 + CSS Variables 设计令牌。
- Markdown / MDX + Content Collections + Zod。
- Shiki、GFM、KaTeX、Mermaid、Callout。
- Pagefind 无后端全文搜索。
- Astro Client Router、原生 WebGL 渐进增强。
- Biome、Prettier、pnpm。

## 已实现

- 原创深色 / 浅色视觉系统，System 模式与无闪烁初始化。
- 首页 Hero、精选与最近文章、主题、项目、时间线、关于预览。
- 文章列表、详情、分类、标签、归档、项目、时间线、关于、404。
- 文章目录、阅读进度、字数与阅读时间、代码复制、上一篇 / 下一篇、相关文章。
- `Ctrl/Cmd + K` 命令面板和 Pagefind 全文搜索。
- RSS、sitemap、robots、canonical、OpenGraph、Twitter Card、favicon。
- `prefers-reduced-motion`、移动端与低性能设备 WebGL 降级。
- DeepSeek V4 Pro 流式对话、文章感知、静态知识检索与真实站内来源。
- AI Retrieval 2.0：结构化 Metadata 查询、按 Heading 的内容分块与中英混合词法检索；不使用向量数据库。

## 项目结构

```text
src/
├─ components/       静态组件与局部交互 Islands
├─ config/           站点级单一配置入口
├─ content/blog/     Markdown / MDX 文章
├─ data/             项目、主题与时间线数据
├─ layouts/          SEO、导航、主题和页面增强脚本
├─ pages/            Astro 文件路由
├─ plugins/          Callout 与 Mermaid 的 Markdown 插件
├─ styles/           Design System 与全局排版
└─ utils/            文章排序、阅读时间、相关推荐
scripts/             新文章 CLI
api/                 Vercel Functions（服务端 AI 代理）
docs/                架构、Roadmap 与旧站审计
public/              favicon、robots 等静态资源
```

## 本地启动

需要 Node.js 22.12+ 与 pnpm 10+。

```bash
pnpm install
pnpm dev
```

开发服务器默认地址为 `http://localhost:4321`。

### AI 完整联调

普通内容开发继续使用 `pnpm dev`。完整 AI 联调直接运行：

```bash
pnpm dev:ai
```

该命令不需要 Vercel CLI 或登录，会同时启动 `http://localhost:4321` 的 Astro Dev 和
`http://127.0.0.1:8787/api/chat` 的原生 Node Local AI Gateway。Gateway 直接复用
`api/_chat-handler.ts` 的共享 Handler，不会维护第二份 DeepSeek 请求实现。生产部署由构建脚本
从同一源码生成自包含的 `api/chat.mjs`，避免 Vercel Node Runtime 的多文件 TypeScript 装载差异。

在项目根目录创建不会被 Git 跟踪的 `.env.local`，从 `.env.example` 复制配置，并把
`DEEPSEEK_API_KEY=replace_me` 中的 `replace_me` 替换为你在 DeepSeek 控制台新建的 Key。
不要把 Key 写进源码、README、测试或提交记录。`pnpm dev:ai` 会在启动前拒绝缺失、占位符
或包含非 ASCII Header 字符的 Key。共享 Handler 在非 Vercel 环境保留
`ANTHROPIC_AUTH_TOKEN` fallback；Local Gateway 和 Vercel 生产环境都要求
`DEEPSEEK_API_KEY`。

连接问题可先运行 `pnpm ai:probe` 直接验证 DeepSeek，再用生产域名运行
`pnpm ai:probe:prod` 验证已部署的 Streaming Function。两个探针都不会输出 API Key。

在 Vercel 项目的 **Settings → Environment Variables** 中添加相同变量后重新部署。
快速模式使用 `deepseek-v4-pro` 并关闭 thinking；深度思考模式仍使用 Pro，开启 thinking
且设置最大 effort。浏览器只能选择这两个服务端模式，不能传入模型名、Base URL 或 System Prompt。

## 最快发布文章

1. 把 Markdown 放进 `src/content/blog/<分类>/`，例如 `src/content/blog/面经/腾讯前端一面.md`。
2. 运行 `pnpm dev`；项目会自动补齐 Frontmatter，并在开发中继续监听新文件。
3. 确认页面后提交并推送到 Git，已绑定的部署平台会按仓库配置发布。

需要精细控制时仍可使用 `pnpm content:new`、`pnpm content:import` 和 `pnpm content:check`。

## 创建文章

```bash
pnpm new:post
```

按提示输入标题、分类、标签与摘要。脚本会在 `src/content/blog/` 创建合法 Markdown 文件，并默认设置 `draft: true`。写完后改成 `draft: false` 即可进入生产构建。

也可以在自动化场景中传参：

```bash
pnpm new:post -- --title "文章标题" --category "前端" --tags "Astro,TypeScript" --description "至少十个字符的文章摘要" --slug "custom-slug"
```

## 常用命令

```bash
pnpm dev           # 开发
pnpm dev:ai        # Astro + Local AI Gateway，无需 Vercel 登录
pnpm ai:probe      # 安全直连 DeepSeek 探针
pnpm ai:probe:prod # 生产 /api/chat Streaming 探针
pnpm typecheck     # Astro + TypeScript 检查
pnpm lint          # Biome 检查
pnpm format:check  # 格式检查
pnpm build         # 静态构建并生成 Pagefind 索引
pnpm preview       # 预览生产构建
pnpm content:prepare # 补齐原始 Markdown 的 Frontmatter
```

## 常用修改入口

- 站点名称、作者、正式域名、GitHub：`src/config/site.ts`
- 项目列表：`src/data/projects.ts`
- 时间线：`src/data/timeline.ts`
- 首页主题：`src/data/topics.ts`
- 主题色与布局令牌：`src/styles/global.css` 顶部的 CSS Variables
- Hero 背景：静态层在 `src/styles/global.css`，WebGL 层在 `src/components/interactive/HeroVisual.tsx`
- 头像：当前是 `.avatar-frame` CSS 占位；替换方式见“个性化清单”
- AI 宠物：将合法拥有使用权的宠物图片替换为 `public/mascot/ali.webp`（建议透明 WebP）

## Personal Learning OS

文章页会在当前浏览器的 IndexedDB `lfw-learning-db` 中保存阅读/听读时长、阅读位置、
锚定批注、AI 听读稿缓存和语音设置；这些数据默认只在本地使用，不会自动发送给 AI 或
Analytics。`/learning` 提供统计、分组清除、JSON 导出/校验/合并导入和主动申请浏览器
持久存储。清除站点数据、隐私模式回收、浏览器卸载或更换设备仍可能让数据丢失，因此重要
记录应定期导出 `lfw-learning-backup-YYYY-MM-DD.json`。

“原文朗读”和“AI 精华听读”都使用浏览器 Web Speech API。系统提供哪些中文 Voice、切到
后台或锁屏后是否继续播放，由设备和浏览器决定。V5 不生成 MP3：`speechSynthesis` 不提供
稳定、可下载的音频 Blob，录屏或 MediaRecorder 也不能可靠替代真正的 TTS Provider；AI
听读稿可下载为 `.txt`，以后可交给外部 TTS。AI 听读稿按文章内容指纹和 Prompt 版本缓存在
IndexedDB，只有用户点击生成或明确重新生成时才调用现有 DeepSeek 服务。

## 个性化清单

1. 把 `src/config/site.ts` 的 GitHub 与正式 URL 改成真实值。
2. 用真实项目替换 `src/data/projects.ts` 的 TODO 项。
3. 用真实节点替换 `src/data/timeline.ts` 的 TODO 项。
4. 在 `public/` 放入头像（例如 `avatar.webp`），把 `.avatar-frame` 的占位元素换成声明宽高的 `<Image />` 或 `<img>`。
5. 补充 `about.astro` 的真实介绍，避免夸大或伪造经历。
6. 部署后截取真实预览图，替换 README 的截图占位。

## 架构特点

文章主体完全不使用 React hydration。搜索从生产构建生成的静态索引按需读取；Hero 的轻量 WebGL 模块只在桌面、允许动画且设备条件合适时动态下载。完整设计理由见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

旧 Gemini 博客的审计与迁移决定见 [docs/legacy-audit.md](docs/legacy-audit.md)。后续版本边界见 [docs/ROADMAP.md](docs/ROADMAP.md)。

## 部署到 Vercel

将 Git 仓库导入 Vercel，使用 `pnpm install --frozen-lockfile` 安装、`pnpm build` 构建，输出目录为 `dist`。发布前务必把 `astro.config.mjs`、`src/config/site.ts` 和 `public/robots.txt` 中的占位域名统一替换为正式域名。

站点仍保持 Astro SSG；仅 `/api/chat` 和无模型调用的 `/api/ai-health` 由 root Vercel
Function 处理，不需要数据库、Redis 或独立 Node 服务。
部署时在 Vercel 环境变量中配置 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、
`DEEPSEEK_MODEL` 与 `SITE_URL`。当前代码级限流是无外部存储的 serverless 实例内限流；
若将来需要严格的全局配额，应在 Vercel Firewall 中增加项目级 Rate Limit 规则。
