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
