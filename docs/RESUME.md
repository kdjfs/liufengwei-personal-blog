# LFW Space — Resume & Interview Package

以下内容只使用 v1.0.0 代码和 2026-08-09 Release Snapshot 的可验证数据，不代表真实用户量、线上 QPS 或长期 RUM。

## Project name

**LFW Space — AI Native Personal Digital Garden**

技术栈：Astro 7 / TypeScript / React 19 Islands / Markdown & MDX / Pagefind / IndexedDB / Vercel Functions / DeepSeek V4 Pro / SSE / Playwright / GitHub Actions。

Release Snapshot：52 篇公开文章、118 个静态页面、116 个 Pagefind 索引页、95 项逻辑测试；Home / Article / Learning Mobile Lighthouse Performance 为 98 / 98 / 99，桌面均为 100（本地生产构建、Lighthouse 模拟环境）。

## Version A — Frontend internship / engineering

- 以 Astro Islands + SSG 重构个人数字花园的运行时边界，将文章正文、分类与项目保持为静态 HTML，仅为搜索、AI 与学习状态局部 hydration；拆分文章专属 KaTeX、Mermaid、目录、灯箱和选区逻辑，使首页初始 JS + CSS gzip 控制在 26.8 KiB。
- 设计零摩擦 Markdown 内容流水线，使用 Content Collections + Zod 做构建期约束，自动补齐 Frontmatter 并保持稳定 slug，同时生成 118 个页面、RSS、sitemap、Pagefind 索引和 AI knowledge 派生产物。
- 针对首页、长文章和学习面板建立 Lighthouse 基线与路由 Bundle budget，通过延迟 AI/Search、响应式图片和稳定 SSR 骨架，将 Home Mobile LCP 从 3.23 s 降至 2.30 s、Learning Mobile CLS 从 0.228 降至 0。
- 构建本地优先 Personal Learning OS，使用 IndexedDB 保存阅读/听读时长、已读状态与锚定批注，提供校验后的 JSON 导入导出；结合 Web Speech API 完成分段听读，同时保持批注默认不离开浏览器。
- 建立 Node 22 + pnpm frozen lockfile 的 CI release gate，覆盖 95 项逻辑测试、mocked SSE AI 关键流程、7 个视口 × 9 个页面的控制台/破图/溢出回归以及 SEO、Bundle、类型、lint 与格式检查。

## Version B — AI full-stack potential

- 通过 Vercel Serverless Proxy 接入 DeepSeek V4 Pro SSE Streaming，将 API Key、固定模型、Base URL 和 System Prompt 限定在服务端，并实现同源、64 KiB payload、Zod schema、速率/并发、超时与安全日志边界。
- 抽象 Unicode-safe 共享 Chat Contract，统一 React Client、Retrieval Context 与 Vercel Function 的消息/页面/划线限制，覆盖中文、英文、中英混合、emoji 和边界长度回归，解决 Selection Ask 的契约漂移与懒加载事件竞争。
- 设计无需向量数据库的 Retrieval 2.0：Metadata Query 确定性回答分类/标签/系列事实，Heading Chunk Retrieval 结合中文 bigram、英文归一化与同义词完成混合检索，并保留真实站内来源；未来可在不改上层 contract 的情况下加入 hybrid vector rerank。
- 将 AI 与学习系统解耦：AI 只接收用户主动构建的当前文章/划线上下文，阅读与批注存储在 IndexedDB；听读稿按内容指纹与 prompt 版本本地缓存，减少重复模型调用且不批量上传学习记录。
- 把静态站、Serverless AI 与未来后端边界写入架构：公开内容继续 Git + SSG，Node/MySQL/Redis 只在账号同步、评论或全局限流出现时引入，避免为尚不存在的业务复杂度预付运维成本。

## 30-second introduction

LFW Space 是我用 Astro 构建的 AI 原生个人数字花园。公开内容通过 Markdown 和 Content Collections 静态生成，搜索由 Pagefind 提供，所以阅读路径不依赖后端；AI 通过 Vercel Function 安全代理 DeepSeek V4 Pro，并用 Metadata Query 与 Heading Chunk Retrieval 回答站内问题和划线问题。浏览器侧还有一个 IndexedDB 本地学习系统，记录阅读、听读和批注。v1.0 用 Lighthouse、Bundle budget、94 项测试、Playwright 响应式回归和 GitHub Actions 做发布门禁。

## 2-minute introduction

这个项目解决三个问题。第一，个人博客长期增长后，内容需要稳定 URL、分类检索、搜索、SEO 和低维护成本，所以我选择 Astro SSG：Markdown 是事实来源，构建期生成 118 个静态页面、RSS、sitemap、Pagefind 和响应式图片。普通阅读不需要 React hydration。

第二，我希望 AI 真正理解站内内容，而不是只做聊天窗口。构建时会生成文章 metadata 和 heading chunks；分类数量、列表走确定性的 Metadata Query，技术问题走中英混合词法检索。浏览器把召回上下文按共享 Unicode contract 裁剪后交给 Vercel Function，Function 再用服务端 Key 调 DeepSeek V4 Pro 并把 SSE 原样流回。划线问 AI、快速/深度模式与来源展示复用同一条链路。

第三，阅读结果要能沉淀。文章页把有效阅读/听读时间、进度、已读状态和批注保存在 IndexedDB，学习面板提供统计和备份恢复。数据默认 Local Only，只有用户主动提问时才发送明确上下文。

工程上，我把全局和文章专属脚本拆开，延迟 AI/Search，引入路由 Bundle budget、SEO 检查、95 项逻辑测试和 Playwright 7×9 页面矩阵。当前本地生产快照的移动 Lighthouse 为 98/98/99，所有目标 LCP ≤ 2.5 s、CLS ≤ 0.1、TBT ≤ 200 ms。

## Five hardest problems

### 1. Static-first 与丰富交互的边界

- 问题：AI、学习、目录和 Mermaid 很容易让所有页面承担 hydration 与大包成本。
- 难点：不能为了 Lighthouse 删除真正功能，也不能让文章专属逻辑污染首页。
- 方案：Astro 静态 HTML 为基线；Search/AI 延迟首次交互；Learning 可见时 hydration；文章增强独立入口，Mermaid 动态 import。
- Trade-off：首次打开 AI 或 Mermaid 会产生一次延迟，但普通阅读显著更轻。
- 结果：Home 初始 JS + CSS gzip 26.8 KiB，Home Mobile LCP 2.30 s。

### 2. 划线问 AI 的双端契约漂移

- 问题：客户端与 Function 对长度/字段的理解不一致会返回 `VALIDATION_ERROR`，emoji 还可能被 UTF-16 截断破坏。
- 难点：请求包含消息、页面、检索 chunk、selection 和 annotation，多处各自裁剪会持续漂移。
- 方案：把 limits、schema type、code-point 计数/截断和 payload fitting 集中到共享 contract；构建检查生成 Function 漂移；初始 selection 直接传入延迟 Island。
- Trade-off：共享模块必须保持 edge/server/browser 可用，不能依赖环境专属 API。
- 结果：50 项 AI 测试覆盖中文、英文、混合、emoji、边界与批注；mocked SSE Selection E2E 在桌面/移动通过。

### 3. 不使用向量数据库的站内 Retrieval

- 问题：模型不能猜分类数量，也不能把整站内容塞进 prompt。
- 难点：中文没有空格，查询可能中英混合；统计事实和语义问题需要不同策略。
- 方案：Metadata Query 直接生成权威 facts；正文按 heading 分块，用 Segmenter/bigram/英文归一化/同义词打分；只发送前几项并保留 URL。
- Trade-off：词法召回对隐含语义弱于 embedding，但 52 篇规模下更简单、可解释、无外部存储。
- 结果：构建产物可通过 `ai:inspect` 复核，未来可替换 scoring 层而不改 request contract。

### 4. 学习计时、批注与隐私

- 问题：`setInterval` 会把后台挂机算成学习，纯 DOM offset 又会在文章变化后失效。
- 难点：状态要跨页面保存、可备份，但默认不能上传。
- 方案：只在可见/聚焦/有效会话中累积，按文章记录进度；批注保存选文、上下文与锚点用于恢复；IndexedDB 分版本存储并校验导入。
- Trade-off：无账号意味着跨设备必须手工导出导入，内容大改后锚点可能需要恢复策略。
- 结果：Learning tests 和 E2E 验证已读与批注能进入 dashboard；本地数据不进入 CI/AI 请求。

### 5. 可重复的发布质量

- 问题：单次“本机能跑”无法保证 SEO、生成 bundle、响应式和部署一致。
- 难点：构建会生成多类派生产物，E2E 又必须避免真实 AI 花费和不稳定性。
- 方案：release gate 顺序执行内容准备/diff、95 tests、type/lint/format、依赖审计、AI bundle drift、build/diff、bundle、SEO 和 mocked Playwright；CI 固定 Node/pnpm 并安装 Chromium。
- Trade-off：完整门禁约需数分钟，响应式 63 页面组合使用单 worker 换稳定性。
- 结果：PR 和 main 可使用同一命令验收，真实 AI 独立留在发布后人工 smoke。

## Interview questions and answer cues

### 为什么用 Astro，不用 Next.js？

核心业务是公开内容阅读，绝大多数页面不需要服务器渲染或 React 状态。Astro 默认输出静态 HTML，并允许用 React Island 局部增强，能直接表达当前运行时边界。若未来账号和强动态页面成为主需求，再评估 Next.js/独立前端，而不是提前迁移。

### 为什么用 SSG？

文章发布频率低于读取频率，内容在 Git 中有版本历史。构建时付一次成本，CDN 提供页面，后端/AI 故障不影响阅读；代价是更新需要重新部署，符合个人博客场景。

### 为什么 AI Key 不放前端？

浏览器代码和网络请求对用户可见，无法保密。Function 读取 Vercel Secret，固定 provider/model/prompt，并在调用前做来源、schema、大小和限流校验。

### SSE Streaming 怎么实现？

DeepSeek 返回 Anthropic-compatible `text/event-stream`。Function 验证上游状态/Content-Type 后以 ReadableStream 转发 chunk，设置 `X-Accel-Buffering: no` 和 no-store；客户端解析 event/data 并增量渲染。

### 为什么当前不用 Vector Database？

公开内容只有 52 篇，metadata 事实需要确定性而非相似度；heading chunk 的中英词法召回已经可检查且无额外服务。未来内容扩大或语义召回指标证明不足时，再加入可再生 embedding 索引。

### Retrieval 2.0 怎么做？

构建期生成文章文档与 heading chunks；query-intent 识别 metadata count/list，其他问题由混合 tokenizer 和 scoring 排名。上下文包含结构化 facts、片段和 URL，并受共享 contract 限制。

### 为什么 Metadata Query 不直接让 LLM 回答？

数量和列表可以从构建事实精确计算，让 LLM 猜会出现遗漏和幻觉。模型的价值放在解释，而不是重新推导确定性数据。

### IndexedDB 为什么适合批注？

比 localStorage 支持更大结构、事务、索引和版本升级，且不阻塞主线程同步 API；适合按文章查询记录与批注。缺点是浏览器本地、可能被清理，所以提供备份。

### 阅读时间怎么避免把挂机算学习？

只在 document visible、窗口 focus 和有效阅读/听读会话中累计，定期持久化并限制异常间隔。它是学习行为近似，不宣称等于真实专注时间。

### 为什么 Markdown 不放 MySQL？

内容是版本化源码，Git 提供 review、diff、回滚与部署触发；MySQL 会增加编辑后台、备份和查询层。未来用户状态进数据库，公开文章仍可保持 Markdown。

### Mermaid 500 KiB warning 为什么可接受，如何继续优化？

警告对应动态 chunk，不是首页初始依赖；Bundle report 验证初始预算。继续优化可按图类型拆 renderer、预渲染静态 SVG、或只为含 Mermaid 的文章生成入口，而不是隐藏 warning。

### Lighthouse 做了哪些优化？

分离文章增强、延迟 AI/Search、响应式图片、首图优先级、下方 lazy、Learning SSR 骨架和对比度修复；保留功能并用前后同 profile 报告验证。

### SEO 做了什么？

绝对 canonical、title/description、OG/Twitter、真实 1200×630、WebSite/Person、BlogPosting/BreadcrumbList、404 noindex、RSS/robots/sitemap；构建脚本逐页校验。

### 如何演进 Node/MySQL/Redis？

账号/跨设备同步出现后，Node 承担认证和同步 API，SQL 保存用户与学习业务状态，Redis 做全局限流/队列/短期缓存；静态内容与可再生检索索引保持独立，让公开阅读不依赖该后端。
