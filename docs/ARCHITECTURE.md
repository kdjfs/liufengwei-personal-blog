# LFW Space 架构说明

这份文档解释 V1 为什么这样设计，以及未来增加动态能力时哪些边界需要继续保持。目标不是罗列名词，而是让项目作者能够在面试或维护时讲清楚每个决定。

## 为什么选择 Astro

LFW Space 的主要访问场景是“读内容”，而不是“操作一个需要长期保持客户端状态的应用”。Astro 默认输出 HTML，只对标记了客户端指令的组件发送运行时代码，很适合内容站。

如果使用传统 SPA，文章正文也会跟随应用一起水合，浏览器需要下载、解析和执行框架代码才能完成一个本质上静态的任务。Astro 让博客先是一组可靠文档，再按需增加交互。

## SSG 的工作方式

生产构建时，Astro 会读取 `src/content/blog/`，校验 frontmatter，为动态路由计算所有 slug，然后把首页、列表、文章、分类、标签和归档生成静态 HTML。

```text
Markdown / MDX
      ↓  Content Collection + Zod
Astro 构建期渲染
      ├─ dist/blog/xxx/index.html
      ├─ dist/categories/...
      ├─ sitemap / RSS
      └─ Pagefind 搜索索引
```

部署到 Vercel 后，请求直接命中静态文件与 CDN，不需要 Node 进程为每次访问重新拼页面。它降低了运行成本，也减少了故障面。

## Islands Architecture

Astro 组件默认只在服务端或构建期运行。项目只有两个 React Island：

- `SearchCommand.tsx` 使用 `client:load`，因为它必须从页面加载起监听 `Ctrl/Cmd + K`。
- `HeroVisual.tsx` 使用 `client:idle`，因为它只是增强视觉，优先级低于文字和按钮。

主题切换、移动导航、阅读进度、代码复制使用很小的原生脚本。文章卡片、目录、项目列表都不需要客户端状态，因此不使用 React。

### React Island 的边界

适合 React Island 的情况：复杂焦点管理、频繁状态更新、可复用交互 Widget、WebGL 生命周期管理。

不适合的情况：文章正文、静态卡片、普通链接、页脚、构建期可以完成的筛选与统计。判断标准不是“React 能不能做”，而是“读者是否需要为这段功能下载 React”。

## 为什么文章主体不使用 React

正文由 Markdown AST 在构建期转换为 HTML，浏览器无需 hydration。收益包括：

1. 首屏可直接阅读；
2. 搜索引擎和 Pagefind 能获得完整正文；
3. Markdown 插件可以在统一构建管线中处理；
4. 文章不会因客户端脚本错误而消失；
5. 后续迁移框架时，内容源仍然独立。

## Content Collections 与 Zod Schema

`src/content.config.ts` 定义博客集合，使用 `glob` loader 读取 Markdown 和 MDX。Zod 对以下字段做构建期校验：标题、摘要、发布日期、更新日期、分类、标签、封面标识、草稿状态和精选状态。

Schema 是“内容 API”。页面只能消费通过校验的条目；字段变化应该先修改 Schema，再修改 CLI 与展示组件，避免各处悄悄形成不同约定。

## Markdown 管线

- Shiki：构建期代码高亮，按 Light / Dark 主题输出 CSS Variables。
- remark-gfm：表格、删除线、任务列表等 GFM 语法。
- remark-math + rehype-katex：数学公式。
- 自定义 `remark-callouts`：识别 `[!NOTE]` 等块引用。
- 自定义 `remark-mermaid`：把 Mermaid 代码块变为安全占位节点。
- rehype-slug + rehype-autolink-headings：稳定标题锚点与 TOC。

Mermaid 本体不会进入普通页面的首屏包。文章包含图表节点时，布局脚本才执行 `import('mermaid')` 并渲染。

## Pagefind 搜索

`pnpm build` 先让 Astro 输出 `dist`，再由 Pagefind 扫描最终 HTML 并生成静态索引。索引可以搜索标题、摘要、正文、分类和标签，不需要数据库或搜索服务。

命令面板先动态导入 `/pagefind/pagefind.js`，再按输入加载索引块。开发环境没有生产索引时，页面快捷导航和主题切换仍然可用，并给出清楚提示。

## View Transitions

`BaseLayout.astro` 放置 Astro `ClientRouter`，让站内导航保留原生链接语义，同时得到短促的页面过渡。没有 JavaScript或浏览器不支持时，链接退化为普通导航。

所有动效都受 `prefers-reduced-motion` 约束。用户要求减少动态效果时，过渡时长会被压缩，WebGL 会直接跳过。

## WebGL 动态加载与降级

Hero 的文字、背景网格和 CTA 都是静态 HTML / CSS。`HeroVisual` 在浏览器空闲时才挂载，然后检查：

- 是否开启 `prefers-reduced-motion`；
- 是否是窄屏移动设备；
- `deviceMemory` 是否显示为低内存设备；
- 浏览器是否能正常创建 WebGL renderer。

通过检查后才动态下载本站约 3 KB 的原生 WebGL 渲染模块。画布只绘制少量点，限制 DPR，并在组件卸载时释放 shader、buffer、program 和事件监听器。V1 没有为了简单点阵引入完整 Three.js；未来 Hero 若确实需要 3D 场景，再在相同边界内替换渲染模块。

## Theme

主题有 Light、Dark、System 三态。用户选择保存在 `localStorage`，它只属于设备本地偏好，不需要后端。

`BaseLayout` 在 `<head>` 内用一小段同步脚本在 CSS 绘制前设置 class，避免深色用户先看到白色闪屏。System 模式会监听系统变化。

## SEO

统一布局负责 title template、description、canonical、OpenGraph 和 Twitter Card。文章页补充发布时间与更新时间。`@astrojs/sitemap` 生成 sitemap，`@astrojs/rss` 生成 RSS，`robots.txt` 指向 sitemap。

当前没有伪造社交分享图。未来可新增独立的 OG Image 生成模块，输入仍来自 Content Collection Schema。

## 性能策略

- 文章和列表构建期输出，避免整页 hydration。
- React 只用于两个交互岛；WebGL 渲染模块与 Mermaid 动态加载。
- 使用系统字体，避免额外字体请求。
- 抽象封面由 CSS 生成，无外部图片请求和 CLS。
- 后续加入真实图片时统一经过 `astro:assets`，声明宽高、生成响应式尺寸并默认懒加载。
- 动画主要使用 transform / opacity，并提供 reduced-motion 分支。
- Pagefind 索引按需加载，不进入初始 JS。

Lighthouse 的 90+ 是发布前目标，不是一次构建后的永久保证。每次加入图片、第三方脚本或统计服务都应重新测试。

## 可访问性

使用语义化 header、nav、main、article、aside、footer；提供跳转主要内容链接、清晰的 `focus-visible`、ARIA 标签和键盘快捷键。移动导航与命令面板使用真实按钮。颜色由设计令牌统一管理，Light 与 Dark 都保持正文对比度。

## Vercel 部署流程

1. 把仓库导入 Vercel。
2. Framework Preset 选择 Astro（通常会自动识别）。
3. Install Command 使用 `pnpm install --frozen-lockfile`。
4. Build Command 使用 `pnpm build`。
5. Output Directory 使用 `dist`。
6. 将 `src/config/site.ts` 和 `astro.config.mjs` 的站点 URL 改为正式域名后重新部署。

V1 没有运行时环境变量，也没有 Serverless Function。

## 未来演进到 Node + MySQL + Redis

动态能力不应直接塞进当前静态页面。建议演进为：

```text
Astro Web（内容与展示）
        │ HTTPS API
Node API（鉴权、评论、统计、业务规则）
        ├─ MySQL：用户、评论、点赞、浏览事实
        └─ Redis：热点缓存、排行榜、限流、Session
```

Node 框架到 V3 再根据约束选择：复杂模块与团队协作偏 NestJS；追求轻量和吞吐可选 Fastify；已有 Express 生态依赖时再选 Express。MySQL 是事实来源，Redis 不能成为唯一存储。

文章仍保留在 Git + Content Collections。即使未来管理后台写文章，也应该通过明确的内容发布流程生成或同步 Markdown，而不是让公开页面完全依赖数据库。
