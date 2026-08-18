# Security Policy

## 报告安全问题

请不要在公开 Issue、Discussion、Pull Request、截图或日志中粘贴 API Key、Token、Cookie、Session、真实连接串或其他敏感数据。

如果仓库的 **Security → Report a vulnerability** 可用，请通过 GitHub 私密安全报告提交可被利用的安全问题。若该入口不可用，请先通过维护者 GitHub 主页中公开的联系方式请求一个私密沟通渠道，不要公开漏洞细节。

这是个人维护项目，不承诺固定响应时限或 SLA。报告应尽量包含受影响版本或 commit、复现步骤、影响范围与建议修复方向，但不要附带真实凭据。

## Secret 泄漏处理

一旦 Secret 进入终端输出、截图、构建日志、提交或远端历史，应立即在对应 Provider 处撤销并轮换。仅从 Git 历史删除文本不能使已泄漏的凭据重新安全。

Secret 只能存放在未跟踪的 `.env.local`、部署平台环境变量或专用 Secret 管理设施中。仓库内的 `.env.example` 只允许使用明显的占位值。

## 支持范围

安全修复优先针对当前 `main` 及生产部署。历史 commit、个人分支和未启用的可选服务可能不会单独回补；报告中请明确指出实际可达的部署路径。
