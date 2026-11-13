# Troubleshooting

## Astro dev 中的 `Invalid hook call`

### 现象

`pnpm dev` 首次访问包含 React Island 的页面时，服务端终端可能打印一次 React `Invalid hook call`。页面仍返回 200，Island 也能正常 hydrate。

### 当前根因

截至 Astro 7.1.6、`@astrojs/react` 6.0.2、React 19.2.8，这条日志来自开发期 renderer probe，而不是项目组件在真实渲染期间违规调用 Hook。

`@astrojs/react/dist/server.js` 的组件识别 `check()` 会在正常 SSR 之前直接调用候选函数组件。Vite dev dependency optimization 可能让 probe 的 React dispatcher 与候选组件引用的 React runtime 不是同一个模块实例，因此 React 打印警告；随后 renderer 通过正常的 `React.createElement()` 路径完成 SSR。

本仓库的核验证据：

- `pnpm list` / `pnpm why` 只解析到一份 `react@19.2.8` 和 `react-dom@19.2.8`，版本匹配。
- Hook 调用位于 React 函数组件或自定义 Hook 中。
- `pnpm build` 正常生成全部静态路由，不出现该 Hook 警告。
- Playwright 的 Desktop / Mobile 关键流程覆盖 React Island hydration、搜索、AI、批注和 Learning OS，均正常通过。

### 处理原则

不要 monkey patch `console`、吞掉 stderr 或捕获所有 React 错误来隐藏日志。这些做法会掩盖未来真实的 Hook 问题。

升级 Astro、`@astrojs/react`、Vite 或 React 后重新验证；如果 production build 也出现警告，或浏览器控制台、hydration、交互测试出现错误，则应按真实 React runtime / Hook 问题重新调查，而不能沿用本结论。

## 站内 AI 突然不可用

### 现象

点击「问 AI」后提示「AI 服务尚未配置」「AI 服务认证配置无效」或「AI 服务暂时不可用」。

### 排查顺序

1. **先看本地还是线上。** 本地 `pnpm dev` 只有在仓库根目录存在 `.env.local` 且 `DEEPSEEK_API_KEY` 有效时，才会在 `127.0.0.1:8787` 启动 Local Gateway；缺 Key 时只启动站点，AI 按钮必然失败。
2. **本地自检。** `pnpm ai:doctor --probe` 输出 Node、`.env.local`、Key 状态、Gateway 状态与一次最小请求的结果，且不会打印 Key 本身。
3. **直连上游自检。** `pnpm ai:probe` 直接请求 DeepSeek，只读服务端环境变量里的 Key。返回 `HTTP Status: 200` 与 `Actual Model` 才说明 Key、模型与 Base URL 都正确。
4. **检查构建产物。** `pnpm ai:function:check` 校验提交的 `api/chat.mjs` 是否与 `api/*.ts` 一致；不一致时执行 `pnpm ai:function:build`，否则 Vercel 上跑的是旧代码。
5. **线上配置。** Vercel 项目的 Environment Variables 需要 `DEEPSEEK_API_KEY`；改完必须 **Redeploy** 才会生效（Vercel 不会热更新函数环境变量）。
6. **健康检查。** 部署后访问 `/api/ai-health`，返回 `configured: true` 才表示函数读到了 Key。

### 常见错误码

| 错误码                   | 含义                                   | 处理                                                      |
| ------------------------ | -------------------------------------- | --------------------------------------------------------- |
| `AI_NOT_CONFIGURED`      | 服务端没有有效 Key                     | 配置 `DEEPSEEK_API_KEY` 并重新部署                        |
| `AI_AUTH_ERROR`          | Key 被上游拒绝（失效、欠费、按错环境） | 重新签发 Key，检查 Vercel 环境变量作用域                  |
| `AI_ENDPOINT_ERROR`      | Base URL 或路径不对                    | 保持 `https://api.deepseek.com/anthropic`                 |
| `AI_BUSY` / `429`        | 上游限流或余额不足                     | 稍后重试，或启用 `DEEPSEEK_FALLBACK_MODEL=deepseek-flash` |
| `AI_TIMEOUT`             | 上游 55s 内未返回                      | 检查网络出口，Deep 模式可先切回 Fast                      |
| `AI_CONFIGURATION_ERROR` | Key 含非法字符（复制时带了换行/中文）  | 重新复制纯 ASCII Key                                      |

### 降级策略

设置 `DEEPSEEK_FALLBACK_MODEL=deepseek-flash` 后，主模型遇到 `429` / `5xx` / 网络异常会自动用备用模型重试一次；成功时响应头 `x-lfw-ai-model` 标出实际使用的模型。留空即关闭降级，保持行为可预期。

### Key 安全

`DEEPSEEK_API_KEY` 只允许存在于 `.env.local`（已 gitignore）和部署平台的 Secret 中。不要把 Key 写进任何会被提交的文件、`PUBLIC_*` 变量或前端代码；`pnpm secret:scan` 会在 CI 中阻断这类提交。

### 在 Vercel 上配置 Key

Web 控制台：Project → Settings → Environment Variables → 新增 `DEEPSEEK_API_KEY`（Production / Preview 均勾选），保存后 **Redeploy**。

CLI：

```bash
vercel login
vercel link
vercel env add DEEPSEEK_API_KEY production   # 粘贴 Key，回车
vercel env add DEEPSEEK_FALLBACK_MODEL production   # 输入 deepseek-flash
vercel --prod
```

部署完成后访问 `https://<你的域名>/api/ai-health`，返回 `"configured": true` 即表示配置生效。
