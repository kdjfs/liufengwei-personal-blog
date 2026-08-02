---
title: 第十一章：XSS、CSRF、CSP、Cookie、JWT 与前端安全
slug: di-shi-yi-zhang-xss-csrf-csp-cookie-jwt-yu-qian-duan-an-quan
description: >-
  | 进度 | 章节 | | ------ | -------------------------------------- | | 已完成 | 第1～10章
  | | 本章 | 第11章：前端安全 | | 剩余 | 第12章：工程化、项目拷打与综合模拟面试 |
publishDate: '2026-08-02'
category: 前端
tags:
  - React
  - Vue
  - JavaScript
  - TypeScript
  - CSS
  - 浏览器
  - 算法
  - AI
cover: auto
draft: false
featured: false
toc: true
---
这是 12 章体系的倒数第二章。

| 进度   | 章节                                   |
| ------ | -------------------------------------- |
| 已完成 | 第1～10章                              |
| 本章   | 第11章：前端安全                       |
| 剩余   | 第12章：工程化、项目拷打与综合模拟面试 |

完成本章后，**只剩最后一章**。

你的项目涉及流式 Markdown、`DOMPurify`、JWT 注入、Token 无感刷新、多角色权限和文件上传，这些内容都很容易被面试官从“实现功能”追问到“安全边界”。

------

# 一、先建立前端安全的总模型

前端安全可以先记住四句话：

```text
所有外部输入都不可信
输出到不同位置要做不同处理
身份认证不等于权限控制
前端控制永远不能替代后端校验
```

攻击者输入可能来自：

- 输入框
- URL 参数
- URL Hash
- 接口响应
- 富文本内容
- WebSocket 消息
- `postMessage`
- localStorage
- 文件名称
- 第三方脚本
- Markdown 内容

真正危险的往往不是“数据被输入”，而是：

> 不可信数据被送进了可以执行代码或改变页面结构的危险位置。

------

# 二、XSS 是什么

XSS 全称：

> Cross-Site Scripting，跨站脚本攻击。

它的核心不是“跨站”，而是：

> 攻击者将恶意内容注入页面，使浏览器把攻击者提供的数据当成代码执行。

攻击成功后，恶意脚本与当前网站正常代码运行在同一个页面环境中，可能：

- 读取可访问的 Token
- 读取用户页面数据
- 以用户身份调用接口
- 修改页面内容
- 监听键盘输入
- 劫持点击操作
- 伪造登录页面
- 向攻击者服务器发送数据

------

# 三、XSS 的三种主要类型

## 1. 存储型 XSS

攻击内容被保存到服务器。

例如攻击者发表评论：

```html
<script>
  stealUserData();
</script>
```

服务器没有处理，其他用户打开评论页面时，恶意代码被返回并执行。

流程：

```text
攻击者提交恶意内容
→ 内容写入数据库
→ 其他用户请求页面
→ 服务端返回恶意内容
→ 浏览器执行攻击代码
```

常见于：

- 评论
- 论坛
- 用户昵称
- 文章内容
- 富文本
- 聊天消息
- 后台备注

特点：

> 影响范围大、持续时间长，每个查看该内容的用户都可能受到影响。

------

## 2. 反射型 XSS

攻击内容通常来自当前请求参数，服务器直接将其反射到响应页面。

例如：

```text
/search?keyword=<script>恶意代码</script>
```

服务端直接生成：

```html
<h1>搜索内容：用户输入</h1>
```

如果没有转义，用户点击恶意链接后，脚本可能执行。

特点：

- 通常不写入数据库
- 经常需要诱导用户点击链接
- 恶意内容在请求和响应中立即反射

------

## 3. DOM 型 XSS

漏洞主要出现在前端 JavaScript 中。

```js
const content = location.hash.slice(1); // 从 URL Hash 中读取不可信内容

document.querySelector('#result').innerHTML = content; // 危险：把不可信内容直接写入 innerHTML
```

攻击者构造恶意 Hash 后，服务端甚至可能完全没有参与，前端代码自己完成了注入。

## 🔴 三者区别

> 存储型和反射型通常与服务端返回内容有关；DOM 型主要由前端将不可信数据写入危险 DOM API 导致。三者最终目标都是让攻击内容进入可执行上下文。

------

# 四、理解 XSS 的 Source 和 Sink

分析 DOM XSS 时，可以使用：

```text
Source
→ 数据传播
→ Sink
```

## Source：不可信数据来源

常见 Source：

```js
location.search; // URL 查询参数可能由攻击者控制

location.hash; // URL Hash 可能由攻击者控制

document.referrer; // 来源地址不能直接信任

localStorage.getItem('content'); // 本地存储内容也可能已被污染

window.addEventListener('message', handler); // postMessage 内容来自其他窗口

await response.json(); // 接口返回值也不能天然视为安全
```

## Sink：危险使用位置

常见危险 Sink：

```js
element.innerHTML = content; // 将字符串解析成 HTML

element.outerHTML = content; // 替换元素并解析 HTML

element.insertAdjacentHTML('beforeend', content); // 插入并解析 HTML

document.write(content); // 向文档中写入 HTML

eval(content); // 将字符串作为 JavaScript 执行

new Function(content); // 动态创建并执行函数

setTimeout(content, 1000); // 传字符串时可能作为代码执行
```

## 🔴 高分表达

> XSS 排查不能只搜索 script 标签，而应追踪不可信数据是否流向危险 Sink。攻击载荷也不一定是 script 标签，还可能通过事件属性、SVG、URL 协议或危险 DOM API 触发。

------

# 五、为什么不能靠正则删除 script 标签

错误思路：

```js
function removeScript(content) { // 定义错误的 XSS 过滤函数
  return content.replace(/<script.*?>.*?<\/script>/gi, ''); // 只尝试删除 script 标签
} // 过滤函数结束
```

问题在于攻击形式非常多，例如：

```html
<img src="invalid" onerror="恶意代码">

<svg onload="恶意代码"></svg>

<a href="javascript:恶意代码">点击</a>
```

HTML 解析规则复杂，仅靠正则难以正确处理：

- 标签大小写
- 编码变形
- 嵌套标签
- 不完整标签
- SVG、MathML
- 属性事件
- URL 协议
- 浏览器容错解析

## 🔴 必背

> 不应该自己用简单正则实现通用 HTML 安全过滤。富文本应使用经过验证的 HTML Sanitizer，并配合严格的允许列表。

------

# 六、转义和过滤不是一回事

## 1. 转义 Escaping

将特殊字符转换成普通文本。

例如：

```text
<
→
&lt;
```

最终页面显示：

```text
<script>
```

而不是执行脚本。

适用于：

> 原本只应该展示纯文本的内容。

------

## 2. 过滤 Sanitization

富文本确实需要保留部分 HTML：

```html
<p>文字</p>
<strong>加粗</strong>
<ul>列表</ul>
```

这时不能把全部标签都转义，而应：

- 允许安全标签
- 允许安全属性
- 删除事件属性
- 删除危险 URL
- 删除危险节点

适用于：

> 需要展示受控 HTML 或富文本。

------

## 3. 上下文相关编码

不同输出位置需要不同处理：

- HTML 文本上下文
- HTML 属性上下文
- URL 上下文
- JavaScript 字符串上下文
- CSS 上下文

不能拿一个所谓的“万能转义函数”处理所有位置。

## 🔴 加分回答

> 安全编码必须与输出上下文匹配。HTML 文本转义不能自动解决 JavaScript、CSS 和 URL 上下文的问题，因此最好的方式是避免拼接代码上下文，优先使用安全 DOM API 和框架的数据绑定。

------

# 七、React 和 Vue 是否天然防 XSS

## 1. 普通文本插值通常会转义

React：

```jsx
function UserName({ name }) { // 定义用户名称组件
  return ( // 返回展示内容
    <div> {/* 创建普通 div */}
      {name} {/* React 默认将字符串作为文本处理 */}
    </div>
  ); // JSX 返回结束
} // 组件定义结束
```

Vue：

```html
<!-- Vue 插值通常将内容作为文本输出 -->
<div>{{ userName }}</div>
```

如果 `name` 是：

```html
<img src=x onerror=攻击代码>
```

普通插值通常只会显示字符串，不会直接解析为 HTML。

------

## 2. 绕过默认转义就可能危险

React：

```jsx
function RichText({ html }) { // 定义富文本组件
  return ( // 返回富文本容器
    <div // 创建容器元素
      dangerouslySetInnerHTML={{ // 明确要求 React 插入原始 HTML
        __html: html, // 危险：html 必须先经过安全过滤
      }} // 原始 HTML 配置结束
    />
  ); // JSX 返回结束
} // 组件定义结束
```

Vue：

```html
<!-- 危险：v-html 会把字符串作为 HTML 解析 -->
<div v-html="htmlContent"></div>
```

## 3. 框架也不能自动保护危险 URL

例如服务端返回：

```text
javascript:恶意代码
```

业务直接绑定到链接：

```jsx
function Link({ url }) { // 定义链接组件
  return ( // 返回链接
    <a href={url}> {/* URL 仍然需要进行协议校验 */}
      打开链接
    </a>
  ); // JSX 返回结束
} // 组件结束
```

## 🔴 标准答案

> React JSX 和 Vue 模板插值会对普通文本进行转义，可以降低常见 XSS 风险；但 `dangerouslySetInnerHTML`、`v-html`、直接 DOM 操作和不可信 URL 会绕过这种保护。框架只能提供安全默认值，不能替代业务输入校验和富文本过滤。

------

# 八、Markdown 为什么也可能产生 XSS

很多人认为：

> Markdown 只是文本，所以天然安全。

错误。

Markdown 解析器可能允许：

- 原生 HTML
- 链接
- 图片
- 特殊扩展
- 嵌入标签

攻击链可能是：

```text
恶意 Markdown
→ Markdown 解析器转换成 HTML
→ HTML 插入页面
→ 恶意属性或标签执行
```

因此安全顺序应是：

```text
Markdown 原文
→ Markdown 转换为 HTML
→ 对最终 HTML 做 Sanitization
→ 插入页面
```

而不是只对 Markdown 原字符串做简单替换。

------

# 九、DOMPurify 的正确使用

你的项目使用流式 Markdown 和 `DOMPurify`，这部分很适合成为安全亮点。

React 示例：

```jsx
import DOMPurify from 'dompurify'; // 导入 HTML 安全过滤库

import { marked } from 'marked'; // 导入 Markdown 解析器

import { useMemo } from 'react'; // 导入 React 计算缓存 Hook

function MarkdownMessage({ markdown }) { // 定义 Markdown 消息组件
  const safeHtml = useMemo(() => { // 当 Markdown 变化时重新生成安全 HTML
    const rawHtml = marked.parse(markdown); // 先将 Markdown 转换成原始 HTML

    return DOMPurify.sanitize(rawHtml, { // 对最终 HTML 进行安全过滤
      USE_PROFILES: { // 配置允许使用的过滤配置
        html: true, // 允许经过过滤的普通 HTML
      }, // USE_PROFILES 配置结束
    }); // 返回过滤后的安全 HTML
  }, [markdown]); // Markdown 内容变化时重新计算

  return ( // 返回消息内容
    <div // 创建 Markdown 容器
      dangerouslySetInnerHTML={{ // 使用原始 HTML 插入能力
        __html: safeHtml, // 只插入已经过滤的 HTML
      }} // 插入配置结束
    />
  ); // JSX 返回结束
} // MarkdownMessage 组件结束
```

Vue 示例：

```js
import DOMPurify from 'dompurify'; // 导入 HTML 安全过滤库

import { marked } from 'marked'; // 导入 Markdown 解析器

import { computed } from 'vue'; // 导入 Vue 计算属性

const safeHtml = computed(() => { // 创建安全 HTML 计算属性
  const rawHtml = marked.parse(markdown.value); // 将 Markdown 转换为 HTML

  return DOMPurify.sanitize(rawHtml); // 过滤最终生成的 HTML
}); // 计算属性定义结束
```

模板：

```html
<!-- 只将过滤后的 HTML 交给 v-html -->
<div v-html="safeHtml"></div>
```

------

# 十、流式 Markdown 的特殊安全问题

AI 每次返回一部分字符：

```text
第一段：<im
第二段：g src=x
第三段： onerror=...
```

如果每次都对“不完整 HTML 片段”进行解析和插入，可能出现：

- 解析结果反复变化
- 标签边界不完整
- Sanitizer 重复运行成本高
- 页面频繁更新
- 安全策略和性能互相影响

合理方案：

```text
字符流进入缓冲区
→ 按帧或固定间隔合并
→ Markdown 解析
→ 对完整的当前 HTML 再过滤
→ 只更新当前最后一条消息
```

## 🔴 项目回答

> AI 输出同样属于不可信输入。我会先把流式字符缓冲成当前 Markdown，再转换成 HTML，并对最终 HTML 使用 DOMPurify 过滤，最后才通过原始 HTML API 渲染。历史消息保持稳定，只处理当前变化消息，既控制 XSS，也减少重复解析开销。

------

# 十一、CSP 是什么

CSP 全称：

> Content Security Policy，内容安全策略。

它通过 HTTP 响应头限制页面可以：

- 从哪里加载脚本
- 从哪里加载样式
- 从哪里加载图片
- 是否允许内联脚本
- 是否允许 `eval`
- 是否允许页面被嵌入 iframe
- 可以向哪些地址发请求

示例：

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-random123';
  style-src 'self';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com wss://ws.example.com;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
```

含义：

```text
default-src 'self'
→ 默认只允许同源资源

script-src 'self' 'nonce-...'
→ 只允许同源脚本和带正确 nonce 的内联脚本

object-src 'none'
→ 禁止 object、embed 等插件内容

base-uri 'self'
→ 限制 base 标签来源

frame-ancestors 'none'
→ 禁止其他页面用 iframe 嵌入当前页面
```

------

# 十二、CSP nonce 和 hash

## 1. nonce

服务端为每个页面响应生成随机值：

```html
<!-- 只有带正确 nonce 的脚本才能执行 -->
<script nonce="random123">
  // 这里是服务器明确授权的内联脚本
</script>
```

响应头中同时声明：

```text
script-src 'nonce-random123'
```

要求：

- nonce 应难以预测
- 最好每次响应重新生成
- 不能把 nonce 固定写死在前端包里

------

## 2. hash

对固定内联脚本计算摘要，在 CSP 中允许对应摘要。

适合：

- 内容完全固定的内联脚本

脚本内容稍微改变，Hash 就要重新计算。

------

## 3. 为什么不推荐 unsafe-inline

```text
script-src 'unsafe-inline'
```

这会允许大量内联脚本执行，明显削弱 CSP 对 XSS 的限制能力。

## 4. 为什么不推荐 unsafe-eval

它会允许：

- `eval`
- `new Function`
- 部分字符串代码执行

同样会扩大攻击面。

------

# 十三、CSP 不能替代代码修复

CSP 是：

> 纵深防御。

它可以降低 XSS 成功后的执行能力，但不能替代：

- 输出转义
- DOMPurify
- URL 校验
- 安全 DOM API
- 输入校验
- 移除危险代码

## 推荐部署过程

```text
先使用 Content-Security-Policy-Report-Only
→ 收集违规报告
→ 修复现有资源和内联脚本
→ 再启用正式阻断策略
```

否则直接上线严格 CSP，可能把自己正常业务也拦截掉。

------

# 十四、Trusted Types：进阶 DOM XSS 防御

浏览器中的 DOM XSS 经常来自：

```text
字符串
→ innerHTML 等危险 Sink
```

Trusted Types 的思路是：

> 不再允许任意字符串直接进入敏感 DOM Sink，而要求使用经过可信策略生成的对象。

CSP 可以声明：

```text
require-trusted-types-for 'script'
```

这样能帮助大型项目限制：

- `innerHTML`
- `document.write`
- 动态脚本 URL

它不适合所有兼容环境，但在大型后台和高安全应用中是很好的进阶防线。

## 🟡 面试加分

> CSP 主要限制资源执行来源，Trusted Types 进一步约束字符串进入 DOM XSS Sink。两者可以与 Sanitizer 组合，形成更强的纵深防御。

------

# 十五、CSRF 是什么

CSRF 全称：

> Cross-Site Request Forgery，跨站请求伪造。

核心条件：

1. 用户已经登录目标网站
2. 浏览器中保存着会自动携带的身份凭证
3. 攻击网站诱导浏览器向目标网站发请求
4. 目标网站只凭自动携带的凭证识别用户

例如用户已经登录银行网站，浏览器保存了 Session Cookie。

攻击页面可能构造：

```html
<!-- 浏览器可能自动请求目标地址 -->
<img src="https://bank.example/transfer?to=attacker&amount=1000">
```

如果目标网站错误地用 GET 执行转账，并且只检查 Cookie，就可能把请求当成用户本人发起。

## 核心本质

> 攻击者通常不需要读取响应，只要让用户浏览器带着凭证完成危险操作即可。

------

# 十六、为什么 CORS 不能防 CSRF

CORS 主要控制：

> 跨源 JavaScript 能不能读取响应。

CSRF 常常不需要读取响应。

攻击者可以使用：

- 表单提交
- 图片请求
- iframe
- 导航请求

让浏览器发送请求。

因此：

```text
CORS 拒绝读取
≠ 请求一定没有发送
≠ CSRF 已被阻止
```

## 🔴 标准答案

> CORS 是跨源响应读取控制，而 CSRF 利用浏览器自动携带身份凭证发送请求。攻击者不一定需要读取返回值，所以不能把 CORS 当成 CSRF 防御。

------

# 十七、CSRF 的主要防御方案

## 1. SameSite Cookie

```text
SameSite=Strict
SameSite=Lax
SameSite=None
```

### Strict

跨站场景通常不携带 Cookie，防御最强，但可能影响正常跳转体验。

### Lax

兼顾安全和可用性，部分顶级导航可能携带 Cookie，但很多跨站子请求和危险方法受到限制。

### None

允许跨站携带 Cookie，通常必须同时：

```text
Secure
```

适合确实需要第三方场景的 Cookie，但必须配合其他 CSRF 防御。

------

## 2. CSRF Token

服务端生成攻击者无法获得的随机 Token。

正常页面提交请求时同时携带：

```text
Cookie 身份凭证
+
CSRF Token
```

攻击网站虽然可能让浏览器自动带 Cookie，但通常拿不到页面中的 CSRF Token。

前端示例：

```js
async function submitOrder(orderData) { // 定义订单提交函数
  const csrfToken = document // 从页面中读取 CSRF Token
    .querySelector('meta[name="csrf-token"]') // 查找保存 Token 的 meta 标签
    ?.getAttribute('content'); // 获取 Token 内容

  const response = await fetch('/api/orders', { // 向订单接口发送请求
    method: 'POST', // 使用 POST 提交订单
    credentials: 'include', // 允许浏览器携带会话 Cookie
    headers: { // 设置请求头
      'Content-Type': 'application/json', // 声明请求体为 JSON
      'X-CSRF-Token': csrfToken ?? '', // 携带 CSRF Token
    }, // 请求头配置结束
    body: JSON.stringify(orderData), // 将订单对象序列化为 JSON
  }); // 请求发送结束

  if (!response.ok) { // 判断服务器是否正常处理
    throw new Error('订单提交失败'); // 失败时抛出异常
  } // 响应检查结束

  return response.json(); // 解析并返回响应数据
} // submitOrder 函数结束
```

------

## 3. 验证 Origin 和 Referer

服务器可以检查请求来源：

```text
Origin
Referer
```

判断是否来自允许的网站。

它适合作为额外防线，但要考虑：

- 部分环境可能缺失 Referer
- 代理和隐私策略可能影响请求头
- 不能只靠一个请求头完成全部安全校验

------

## 4. 自定义请求头

跨站普通 HTML 表单无法任意添加自定义请求头。

例如要求：

```text
X-CSRF-Token
```

可以提高攻击门槛。

但是：

> 自定义请求头不是脱离服务器验证的魔法，服务端必须真正检查其内容。

------

## 5. 敏感操作二次确认

例如：

- 修改密码
- 绑定银行卡
- 删除账号
- 转账
- 修改重要权限

可以要求：

- 再次输入密码
- 短信验证码
- 二次确认
- WebAuthn
- 多因素认证

------

# 十八、不要用 GET 执行有副作用的操作

错误设计：

```text
GET /deleteUser?id=100
GET /transfer?amount=1000
```

GET 应尽量保持安全和幂等语义，不应修改关键业务状态。

敏感操作应使用：

```text
POST
PUT
PATCH
DELETE
```

但要注意：

> 使用 POST 并不能自动防止 CSRF，HTML 表单同样可以发 POST。

------

# 十九、Same-Origin 和 Same-Site 不完全相同

这是容易让面试官眼前一亮的点。

两个地址：

```text
https://app.example.com
https://api.example.com
```

它们：

- 主机名不同，所以是跨 Origin
- 但通常属于同一个 Site

这会影响：

- CORS 判断
- SameSite Cookie 判断
- CSRF 风险分析

## 🔴 加分回答

> CORS 使用 Origin 概念，通常比较协议、主机和端口；SameSite Cookie 使用 Site 概念，子域之间可能跨 Origin 但仍属于同 Site。因此不能把跨域和跨站完全当成同一个概念。

------

# 二十、Cookie 的核心安全属性

服务端设置 Cookie 时，应理解以下属性。

## 1. HttpOnly

```text
HttpOnly
```

作用：

> JavaScript 不能通过 `document.cookie` 读取该 Cookie。

它能降低 XSS 直接窃取 Token 的风险。

但不能阻止 XSS：

- 在当前页面发起请求
- 修改页面
- 监听用户输入
- 以用户身份执行操作

因此：

> HttpOnly 降低凭证被直接偷走的风险，但不能治愈 XSS。

------

## 2. Secure

```text
Secure
```

要求 Cookie 只通过 HTTPS 发送。

------

## 3. SameSite

限制跨站请求携带 Cookie。

------

## 4. Domain

控制哪些域名可以接收 Cookie。

不设置 `Domain` 时通常是 Host-only Cookie，范围更小。

------

## 5. Path

限制 Cookie 在哪些路径下发送。

注意：

> Path 主要控制发送范围，不是强安全隔离机制。

------

## 6. Max-Age / Expires

控制 Cookie 有效时间。

Session Cookie 通常在会话结束后失效；持久 Cookie 可以保留更久。

------

# 二十一、安全 Cookie 示例

服务端示意代码：

```js
function setRefreshTokenCookie(response, refreshToken) { // 定义设置刷新 Token Cookie 的函数
  response.cookie('refresh_token', refreshToken, { // 写入刷新 Token Cookie
    httpOnly: true, // 禁止前端 JavaScript 直接读取 Cookie
    secure: true, // 只允许通过 HTTPS 传输
    sameSite: 'lax', // 降低常见跨站请求自动携带风险
    path: '/api/auth/refresh', // 尽量缩小 Cookie 的发送路径
    maxAge: 7 * 24 * 60 * 60 * 1000, // 设置七天有效期
  }); // Cookie 配置结束
} // 函数定义结束
```

真实项目还要根据：

- 前后端是否同站
- 是否需要跨站 Cookie
- 浏览器环境
- 刷新接口路径
- CSRF 策略

调整配置。

------

# 二十二、localStorage 存 Token 的风险

优点：

- 使用简单
- 页面刷新后仍存在
- 请求时可以手动加入 Header
- 不会像 Cookie 那样自动随所有匹配请求发送

主要风险：

> 一旦页面存在 XSS，恶意脚本可以读取 localStorage 中的 Token，并将它发送到攻击者服务器。

```js
const token = localStorage.getItem('access_token'); // 页面脚本可以直接读取 Token
```

Token 被窃取后，攻击者甚至可以离开当前页面继续使用它，直到 Token 过期或被撤销。

------

# 二十三、HttpOnly Cookie 存 Token 的风险

优点：

- JavaScript 无法直接读取
- 降低长期凭证被脚本偷走的风险

风险：

- 浏览器可能自动携带
- 需要认真防御 CSRF
- 跨域配置更复杂
- XSS 仍可利用当前页面执行操作

## 🔴 深度结论

> localStorage 更怕凭证被 XSS 直接窃取；HttpOnly Cookie 可以降低直接窃取风险，但需要解决 Cookie 自动携带导致的 CSRF。没有一种存储位置能够替代对 XSS、CSRF 和后端权限的完整防护。

------

# 二十四、常见 Token 架构选择

## 方案一：Access Token 放 localStorage

优点：

- 实现简单

缺点：

- XSS 后容易被直接窃取
- 长期保存风险较高

------

## 方案二：Token 全放 HttpOnly Cookie

优点：

- JavaScript 不可直接读取

需要：

- SameSite
- CSRF Token
- Origin 校验
- Secure
- 合理 Cookie 范围

------

## 方案三：Access Token 放内存，Refresh Token 放 HttpOnly Cookie

流程：

```text
登录
→ Access Token 保存在内存
→ Refresh Token 存 HttpOnly Cookie
→ 页面刷新后通过刷新接口恢复登录
```

优点：

- Access Token 不长期持久化
- Refresh Token 不可被 JavaScript 直接读取

缺点：

- 架构更复杂
- 刷新接口需要防 CSRF
- XSS 仍可操作当前页面
- 多标签页同步需要额外设计

------

## 方案四：BFF 模式

浏览器只持有安全 Session Cookie：

```text
浏览器
→ BFF
→ BFF 持有或交换后端 Token
→ 业务 API
```

浏览器 JavaScript 不直接接触真正的后端访问 Token。

这种方式安全边界通常更清晰，但需要增加 BFF 服务。

------

# 二十五、JWT 是什么

JWT 全称：

> JSON Web Token。

常见结构：

```text
Header.Payload.Signature
```

例如：

```text
xxxxx.yyyyy.zzzzz
```

## Header

通常声明：

- Token 类型
- 签名算法

## Payload

保存 Claims，例如：

- `sub`：主体用户
- `exp`：过期时间
- `iat`：签发时间
- `nbf`：生效时间
- `iss`：签发者
- `aud`：接收方
- `jti`：Token 唯一标识
- 角色或权限信息

## Signature

用于验证：

- Token 是否由可信签发者生成
- 内容是否被篡改

------

# 二十六、JWT 签名不等于加密

JWT 的 Header 和 Payload 通常只是 Base64URL 编码。

它们可以被轻易解码查看。

```js
function decodeJwtPayload(token) { // 定义只用于查看 Payload 的函数
  const payloadPart = token.split('.')[1]; // 获取 JWT 中间的 Payload 部分

  const normalizedPayload = payloadPart // 开始修正 Base64URL 字符
    .replace(/-/g, '+') // 将 URL 安全减号恢复为加号
    .replace(/_/g, '/'); // 将 URL 安全下划线恢复为斜杠

  const jsonText = decodeURIComponent( // 将 UTF-8 字节转换成字符串
    atob(normalizedPayload) // 对 Base64 内容进行解码
      .split('') // 将解码结果拆成字符数组
      .map((character) => { // 遍历每一个字符
        const hex = character.charCodeAt(0) // 获取字符编码
          .toString(16) // 转换为十六进制
          .padStart(2, '0'); // 保证两位十六进制格式

        return `%${hex}`; // 转换成 URI 编码片段
      }) // 字符映射结束
      .join(''), // 合并全部编码片段
  ); // UTF-8 解码结束

  return JSON.parse(jsonText); // 将 JSON 字符串转换成对象
} // 函数定义结束
```

这段代码只能：

> 查看 Payload。

不能验证：

- 签名是否合法
- Token 是否被篡改
- Token 是否过期
- 签发者是否可信

## 🔴 必背

> JWT 默认是签名令牌，不是加密令牌。Payload 不应存放密码、银行卡号等敏感明文信息。客户端解码只能用于展示，真正的签名验证必须由可信服务端完成。

------

# 二十七、前端能不能相信 JWT 中的角色

假设前端解码得到：

```json
{
  "role": "admin"
}
```

前端可以用它：

- 控制菜单展示
- 控制按钮显示
- 提升用户体验

但不能把它作为最终安全依据。

攻击者可以：

- 修改前端代码
- 修改页面状态
- 直接调用接口
- 伪造一个没有合法签名的 JWT 字符串

服务端必须：

1. 验证 JWT 签名
2. 验证过期时间
3. 验证签发者和受众
4. 根据服务端权限规则鉴权
5. 校验数据范围

## 🔴 标准答案

> 前端解码 JWT 只能用于界面展示，不能替代服务端验签和授权。前端隐藏按钮不是安全控制，真正权限必须在每个敏感接口执行服务端校验。

------

# 二十八、JWT 的优点和局限

## 优点

- 自包含
- 适合分布式服务传递身份
- 服务端不一定需要保存传统 Session
- 跨服务验证方便

## 局限

### 1. 难以立即撤销

JWT 签发后，在过期前通常仍然有效。

可以采用：

- 短过期时间
- Refresh Token
- 黑名单
- 用户 Token Version
- 密钥轮换
- 服务端会话记录

### 2. Payload 膨胀

每次请求都携带 Token，内容过大会增加传输成本。

### 3. 权限可能过期

用户权限已经被管理员修改，但旧 JWT 里仍然保存旧角色。

### 4. Refresh Token 管理复杂

需要处理：

- 轮换
- 重放检测
- 撤销
- 多设备
- 过期
- 并发刷新

## 🔴 加分表达

> JWT 的无状态并不等于整个认证系统无状态。一旦需要立即注销、设备管理、Refresh Token 轮换和风险控制，服务端通常仍然需要保存部分状态。

------

# 二十九、Access Token 与 Refresh Token

## Access Token

特点：

- 生命周期较短
- 用于调用业务接口
- 泄露后的危险窗口应尽量短

## Refresh Token

特点：

- 生命周期较长
- 仅用于获取新 Access Token
- 权限更敏感
- 应尽可能安全存储
- 需要轮换和撤销机制

合理流程：

```text
Access Token 过期
→ 使用 Refresh Token 请求刷新
→ 服务端验证 Refresh Token
→ 返回新 Access Token
→ 可同时轮换 Refresh Token
→ 旧 Refresh Token 失效
```

------

# 三十、Refresh Token Rotation

每次刷新时：

```text
旧 Refresh Token
→ 换取新 Access Token
→ 同时签发新 Refresh Token
→ 旧 Refresh Token 失效
```

如果旧 Refresh Token 后续再次被使用，服务端可以怀疑：

> Token 已经被复制或重放。

然后撤销对应登录会话。

这是比“一个 Refresh Token 用七天不变”更安全的设计。

------

# 三十一、多请求同时 401 的刷新并发问题

页面同时发出五个请求，Access Token 失效：

```text
请求 A → 401
请求 B → 401
请求 C → 401
```

错误方案：

```text
每个请求各刷新一次
→ 同时发出多个刷新请求
→ Refresh Token 轮换冲突
→ 新旧 Token 互相覆盖
```

正确方案：

> 共享同一个 refreshPromise。

```js
let refreshPromise = null; // 保存当前唯一的 Token 刷新任务

async function getNewAccessToken() { // 定义获取新 Access Token 的函数
  if (refreshPromise === null) { // 判断当前是否没有刷新任务
    refreshPromise = refreshAccessToken() // 启动真正的刷新请求
      .finally(() => { // 无论刷新成功或失败都执行清理
        refreshPromise = null; // 清除当前刷新任务引用
      }); // finally 处理结束
  } // 刷新任务创建结束

  return refreshPromise; // 所有并发请求等待同一个 Promise
} // getNewAccessToken 函数结束
```

## 🔴 项目回答

> 多个请求同时 401 时，我会使用单例 refreshPromise，让所有请求等待同一次刷新，避免 Refresh Token 轮换冲突。每个原请求只能重试一次，刷新失败则统一清理登录状态，防止无限刷新循环。

------

# 三十二、XSS 和 CSRF 的关系

## XSS

攻击者脚本运行在你的页面 Origin 中。

## CSRF

攻击者页面诱导浏览器携带目标网站凭证发请求。

两者区别：

| 对比                   | XSS              | CSRF                         |
| ---------------------- | ---------------- | ---------------------------- |
| 恶意代码运行位置       | 目标网站页面内部 | 攻击者网站                   |
| 是否通常能读取页面数据 | 能               | 通常不能                     |
| 是否依赖自动携带凭证   | 不一定           | 通常依赖                     |
| 核心防御               | 转义、过滤、CSP  | SameSite、CSRF Token、Origin |

## 更危险的关系

> 一旦存在 XSS，许多 CSRF 防御也可能失效。

因为运行在正常页面中的恶意脚本可能：

- 读取页面里的 CSRF Token
- 调用正常接口
- 使用当前用户身份操作

所以安全优先级通常是：

> XSS 必须认真防守。

------

# 三十三、点击劫持 Clickjacking

攻击者把你的页面放进透明 iframe 中，再在上面伪造按钮。

用户以为点击：

```text
领取奖品
```

实际点击了 iframe 中的：

```text
确认转账
```

## 防御

CSP：

```text
Content-Security-Policy: frame-ancestors 'none'
```

或只允许特定来源：

```text
Content-Security-Policy: frame-ancestors 'self' https://trusted.example
```

兼容性防线：

```text
X-Frame-Options: DENY
```

或：

```text
X-Frame-Options: SAMEORIGIN
```

`frame-ancestors` 更灵活。

------

# 三十四、开放重定向 Open Redirect

错误实现：

```js
const redirectUrl = new URLSearchParams(location.search) // 读取当前 URL 查询参数
  .get('redirect'); // 获取跳转目标

location.href = redirectUrl; // 危险：直接跳转到用户指定地址
```

攻击链接：

```text
https://trusted.example/login?redirect=https://fake-login.example
```

用户看到前半段可信域名，登录后却被跳到钓鱼网站。

------

## 安全跳转示例

```js
function getSafeRedirect(target) { // 定义安全跳转地址处理函数
  if (!target) { // 判断是否没有传入跳转地址
    return '/'; // 没有地址时返回首页
  } // 空地址判断结束

  const parsedUrl = new URL(target, window.location.origin); // 基于当前站点解析目标地址

  if (parsedUrl.origin !== window.location.origin) { // 判断目标是否跨 Origin
    return '/'; // 跨 Origin 时回退到首页
  } // Origin 校验结束

  return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`; // 返回安全的站内路径
} // getSafeRedirect 函数结束
```

更严谨的业务还可以维护：

```text
允许跳转的路径白名单
```

------

# 三十五、postMessage 安全

跨窗口通信：

```js
window.addEventListener('message', (event) => { // 监听其他窗口发来的消息
  if (event.origin !== 'https://trusted.example.com') { // 校验消息来源 Origin
    return; // 来源不可信时直接忽略
  } // Origin 校验结束

  if (event.source !== expectedWindow) { // 校验发送消息的窗口对象
    return; // 不是预期窗口时忽略
  } // source 校验结束

  const message = event.data; // 读取消息数据

  if (message?.type !== 'PAYMENT_SUCCESS') { // 校验消息类型
    return; // 不支持的消息类型直接忽略
  } // 消息类型校验结束

  handlePaymentSuccess(message.payload); // 处理经过验证的支付结果
}); // message 事件监听结束
```

发送时不要随意：

```js
targetWindow.postMessage(data, '*'); // 不推荐：任何 Origin 都可能接收
```

应指定明确目标：

```js
targetWindow.postMessage( // 向目标窗口发送消息
  data, // 传入消息数据
  'https://trusted.example.com', // 指定允许接收的目标 Origin
); // postMessage 调用结束
```

------

# 三十六、文件上传安全

前端可以校验：

- 文件大小
- 扩展名
- MIME 类型
- 图片尺寸
- 上传数量
- 文件名称长度

```js
function validateImageFile(file) { // 定义图片文件校验函数
  const allowedTypes = new Set([ // 创建允许的 MIME 类型集合
    'image/jpeg', // 允许 JPEG
    'image/png', // 允许 PNG
    'image/webp', // 允许 WebP
  ]); // MIME 类型集合结束

  if (!allowedTypes.has(file.type)) { // 判断文件 MIME 类型是否允许
    throw new Error('只允许上传 JPG、PNG 或 WebP 图片'); // 类型不允许时抛错
  } // 类型校验结束

  const maxSize = 5 * 1024 * 1024; // 设置最大文件大小为五 MB

  if (file.size > maxSize) { // 判断文件是否超过大小限制
    throw new Error('图片不能超过 5MB'); // 超过限制时抛错
  } // 文件大小校验结束

  return true; // 文件基础校验通过
} // validateImageFile 函数结束
```

但前端校验可以被绕过。

服务端必须重新校验：

- 文件真实内容
- MIME
- 文件头
- 恶意脚本
- 病毒
- 存储路径
- 文件名
- 权限
- 访问方式

## 图片上传风险

攻击者可能把：

```text
恶意 HTML 或脚本
```

伪装成图片扩展名。

上传资源服务器应考虑：

- 独立域名
- 禁止执行脚本
- 正确 Content-Type
- `X-Content-Type-Options: nosniff`
- 随机文件名
- 内容扫描

------

# 三十七、对象 URL 要及时释放

```js
const previewUrl = URL.createObjectURL(file); // 为本地文件创建临时预览地址

imageElement.src = previewUrl; // 将临时地址设置为图片来源

imageElement.addEventListener('load', () => { // 监听图片加载完成
  URL.revokeObjectURL(previewUrl); // 释放临时对象 URL 占用的资源
}); // load 事件监听结束
```

这主要是资源管理问题，也能避免大量文件预览造成内存持续增长。

------

# 三十八、原型污染 Prototype Pollution

假设项目有一个不安全的深度合并函数：

```text
用户传入：
__proto__
constructor
prototype
```

攻击者可能尝试修改对象原型上的公共属性，影响其他对象。

特别需要警惕：

- 自己手写深合并
- 动态路径赋值
- 老旧工具库
- 将用户 JSON 直接合并进配置

简单防御思想：

```js
const dangerousKeys = new Set([ // 创建危险属性名集合
  '__proto__', // 禁止原型入口属性
  'prototype', // 禁止 prototype 属性
  'constructor', // 禁止 constructor 属性
]); // 危险属性集合结束

function isSafeKey(key) { // 定义属性名安全判断函数
  return !dangerousKeys.has(key); // 不在危险集合中才视为安全
} // isSafeKey 函数结束
```

更重要的是：

- 使用已修复的库
- 不盲目信任用户对象
- 更新依赖版本
- 对配置字段使用白名单

------

# 三十九、第三方脚本和供应链风险

引入第三方脚本：

```html
<script src="https://cdn.example.com/library.js"></script>
```

意味着第三方脚本通常拥有与你页面代码相近的执行能力。

风险包括：

- CDN 被劫持
- NPM 包被投毒
- 依赖账号被盗
- 恶意安装脚本
- 间接依赖漏洞
- 第三方埋点读取页面数据

## 防御方式

- 锁定依赖版本
- 提交 lock 文件
- 依赖审计
- 减少不必要依赖
- 使用可信源
- 评估安装脚本
- 设置 CSP
- 对静态 CDN 资源使用 SRI
- 建立依赖升级机制

------

# 四十、SRI 子资源完整性

```html
<!-- 只有文件内容与摘要一致时才执行 -->
<script
  src="https://cdn.example.com/library.js"
  integrity="sha384-这里填写实际摘要"
  crossorigin="anonymous"
></script>
```

如果 CDN 返回的文件内容被修改，浏览器会发现摘要不匹配并拒绝执行。

SRI 适合：

- 内容固定
- 文件版本固定
- 第三方 CDN 静态资源

如果资源每次动态变化，就不容易使用固定摘要。

------

# 四十一、前端环境变量不是秘密

Vite：

```js
const apiKey = import.meta.env.VITE_API_KEY; // 该值可能被打包进浏览器可下载的代码
```

只要代码运行在浏览器，用户通常就能通过：

- DevTools
- Network
- Source Map
- 构建文件
- 运行时变量

找到其中的数据。

所以前端不能真正保存：

- 数据库密码
- 服务端私钥
- 云服务 Secret
- 永久第三方密钥
- JWT 签名密钥

## 🔴 必背

> 前端环境变量只是构建配置，不是秘密保险箱。需要保密的密钥必须保存在服务端，由前端调用受控接口，不能直接打进浏览器包。

------

# 四十二、Source Map 安全

生产 Source Map 对排错很有帮助，但公开暴露可能让攻击者更容易看到：

- 原始目录结构
- 源码
- 注释
- 内部接口名
- 业务逻辑

方案不是简单地“一律关闭”，而是根据项目选择：

- 不公开上传
- 上传到错误监控平台
- 服务器限制访问
- 使用 hidden source map
- 发布时检查敏感信息

注意：

> 隐藏 Source Map 不能掩盖真正放进前端包里的密钥。

------

# 四十三、WebSocket 安全

WebSocket 也要考虑：

- 使用 `wss`
- 握手阶段认证
- Token 过期
- 连接权限
- 消息格式校验
- 消息大小限制
- 服务端 Origin 校验
- 重连频率限制
- 任务 ID 权限
- 防止订阅其他用户数据

前端不能只判断：

```js
if (message.userId === currentUserId) { // 仅在前端判断消息是否属于当前用户
  renderMessage(message); // 展示当前消息
} // 判断结束
```

因为真正的数据隔离必须由服务端完成。

## 🟢 项目回答

> WebSocket 建连和消息订阅都需要后端鉴权，不能只靠前端过滤 taskId。前端还会校验消息结构和序号，使用 wss，并在 Token 过期时重新认证；服务端必须保证用户只能订阅自己有权限的任务。

------

# 四十四、常见安全响应头

## 1. Content-Security-Policy

限制资源和脚本执行来源。

## 2. Strict-Transport-Security

要求后续优先使用 HTTPS：

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

启用前要确保所有目标域名都能正确支持 HTTPS。

## 3. X-Content-Type-Options

```text
X-Content-Type-Options: nosniff
```

降低浏览器将资源猜测成其他可执行类型的风险。

## 4. Referrer-Policy

限制跳转和请求时发送多少 Referer 信息。

## 5. Permissions-Policy

控制页面是否可以使用：

- 摄像头
- 麦克风
- 定位
- 全屏
- 其他浏览器能力

## 6. frame-ancestors / X-Frame-Options

防止点击劫持。

------

# 四十五、前端权限控制不是安全边界

你项目里有多角色、路由守卫、动态 TabBar 和按钮权限。

这些前端控制的作用是：

- 隐藏无权限菜单
- 避免用户误操作
- 改善交互体验
- 减少无效请求

但攻击者可以：

- 修改 JavaScript
- 修改 Pinia 状态
- 手动打开隐藏路由
- 直接通过 Postman 调接口

因此后端必须校验：

```text
用户身份
→ 角色权限
→ 资源归属
→ 数据范围
→ 操作状态
```

## 🔴 项目满分回答

> 我把前端权限分成路由、菜单和按钮三个层级，但这些只负责交互体验。真正安全边界在后端，每个接口都要校验用户角色、资源归属和数据权限。不能因为按钮被隐藏，就认为接口已经安全。

------

# 四十六、常见安全误区

## 误区一：前端校验过了就安全

前端校验可以绕过，服务端必须重新验证。

## 误区二：HTTPS 可以防 XSS

HTTPS 保护传输过程，不能阻止页面自身执行恶意脚本。

## 误区三：HttpOnly 可以彻底防 XSS

HttpOnly 只限制 JavaScript 读取 Cookie，XSS 仍可以操作页面和发请求。

## 误区四：JWT 比 Session 天然安全

安全性取决于：

- 存储
- 生命周期
- 签名验证
- 撤销
- CSRF
- XSS
- 密钥管理

JWT 不是“更安全”的同义词。

## 误区五：POST 可以防 CSRF

攻击页面同样可以提交 POST 表单。

## 误区六：CORS 是后端权限

CORS 只影响浏览器跨源读取，不能阻止非浏览器客户端调用接口。

## 误区七：Base64 是加密

Base64 是编码，可以被直接还原。

## 误区八：前端加密密码后就不需要 HTTPS

攻击者如果能篡改前端脚本，也可以直接截获加密前或加密后的值。传输仍必须使用 HTTPS。

------

# 四十七、结合你项目的安全拷打

## 1. AI Markdown 怎么防 XSS？

> AI 输出和用户输入都属于不可信内容。我会先将 Markdown 转换成 HTML，再使用 DOMPurify 对最终 HTML 进行允许列表过滤，最后才通过 `dangerouslySetInnerHTML` 或 `v-html` 渲染。流式过程中会先缓冲字符，再分批解析和过滤，只更新当前消息，兼顾安全和性能。

------

## 2. 为什么不能只依赖 React 默认转义？

> React 默认转义普通 JSX 文本，但 Markdown 需要转成 HTML，使用 `dangerouslySetInnerHTML` 后就绕过了默认保护。另外动态 URL、第三方脚本和直接 DOM 操作也不在普通文本转义的保护范围内。

------

## 3. Token 放 localStorage 安全吗？

> 实现简单，但发生 XSS 时脚本可以直接读取并窃取 Token。更高安全场景可以考虑 HttpOnly、Secure、SameSite Cookie，或 Access Token 放内存、Refresh Token 放 HttpOnly Cookie，并配合 CSRF Token、Origin 校验和短生命周期设计。不存在只靠存储位置就绝对安全的方案。

------

## 4. 多个接口同时 401 怎么刷新？

> 使用共享 refreshPromise，保证同时只有一个刷新请求。其他失败请求等待同一个结果，刷新成功后用新 Token 重放一次；刷新失败统一清理登录态。每个原请求需要重试标记，避免无限循环。

------

## 5. 动态按钮权限能保证安全吗？

> 不能。前端权限只能改善体验，攻击者可以绕过页面直接调用接口。后端必须校验 Token、角色、资源归属和数据范围。

------

## 6. 文件上传前端做了类型校验，够吗？

> 不够。file.type 和扩展名都可能伪造。前端校验用于体验和减少无效上传，服务端必须检查真实文件内容、文件头、大小、恶意代码，并使用安全文件名和独立存储策略。

------

# 四十八、面试官连续追问模拟

## 问题一：XSS 有哪些类型？

> 存储型会将攻击内容保存到服务器并影响后续访问者；反射型通过请求参数立即反射到响应；DOM 型主要由前端把不可信数据写入 innerHTML 等危险 API。三者最终都是让不可信数据进入可执行上下文。

## 问题二：怎么防 XSS？

> 普通文本使用框架默认转义或 textContent；富文本使用经过验证的 Sanitizer；避免 innerHTML、eval 等危险 API；动态 URL 做协议白名单；部署 CSP 和必要时 Trusted Types；Cookie 设置 HttpOnly 降低凭证直接窃取风险。防御应采用多层组合。

## 问题三：DOMPurify 应该过滤 Markdown 还是 HTML？

> Markdown 解析可能产生 HTML，因此应该对最终生成的 HTML 进行过滤，然后再插入页面。只过滤原始 Markdown 不能覆盖解析器最终生成的全部标签和属性。

## 问题四：CSP 能彻底防 XSS 吗？

> 不能。CSP 是纵深防御，可以限制脚本来源和内联脚本执行，但错误配置、允许过宽来源或业务逻辑漏洞仍可能被利用。根本上仍要修复不安全的数据流和 DOM Sink。

## 问题五：CSRF 原理是什么？

> 用户已经在目标网站登录，浏览器会自动携带 Cookie。攻击网站诱导浏览器向目标网站发起危险请求，目标服务器只根据自动携带凭证识别用户，就可能把请求当成用户本人操作。

## 问题六：CSRF 怎么防？

> 使用 SameSite Cookie、不可预测的 CSRF Token、Origin 或 Referer 校验，并对敏感操作进行二次确认。服务端还应避免 GET 修改数据，并校验请求的业务权限。

## 问题七：CORS 为什么不能防 CSRF？

> CORS 主要限制跨源 JavaScript 读取响应，而 CSRF 通常只需要请求成功，不需要读取响应。浏览器仍可能通过表单、图片或导航发出请求。

## 问题八：JWT 是加密的吗？

> 常见 JWT 是签名而不是加密。Header 和 Payload 可以直接解码，签名只用于验证内容是否被篡改和签发者是否可信，所以不能在 Payload 中存敏感明文。

## 问题九：JWT 如何注销？

> 单纯无状态 JWT 在过期前不容易立即失效。可以使用短期 Access Token、Refresh Token 会话、黑名单、用户 Token Version 或密钥轮换实现撤销，但这会引入一定服务端状态。

## 问题十：HttpOnly Cookie 能阻止 XSS 吗？

> 不能。它只能阻止脚本直接读取 Cookie。恶意脚本仍然可以在当前页面发请求和执行用户操作，因此必须从根本上修复 XSS。

------

# 四十九、本章最容易漏掉的 25 个点

1. XSS 不一定需要 `<script>` 标签。
2. DOM 型 XSS 可能完全不经过服务端模板。
3. 安全分析要追踪 Source 到 Sink。
4. 不能靠简单正则完成通用 HTML 过滤。
5. 转义与富文本过滤不是一回事。
6. 不同输出上下文需要不同编码策略。
7. React 和 Vue 只保护普通插值。
8. `v-html` 和 `dangerouslySetInnerHTML` 会绕过默认转义。
9. Markdown 最终也可能生成危险 HTML。
10. 应过滤 Markdown 解析后的最终 HTML。
11. CSP 是纵深防御，不是漏洞修复替代品。
12. nonce 应由服务端每次响应随机生成。
13. HttpOnly 不能彻底防 XSS。
14. CORS 不能防 CSRF。
15. POST 请求也可能受到 CSRF。
16. Same-Origin 与 Same-Site 不完全相同。
17. localStorage Token 容易被 XSS 读取。
18. Cookie Token 需要考虑 CSRF。
19. JWT 签名不等于加密。
20. 客户端解码 JWT 不等于验证 JWT。
21. JWT 无状态不代表认证系统完全无状态。
22. 前端权限不是安全边界。
23. 前端文件校验可以被绕过。
24. 前端环境变量不是真正秘密。
25. 第三方脚本拥有很高的页面权限。

------

# 五十、本章五分钟必背答案

> 前端安全的核心原则是所有外部输入都不可信，不可信数据不能直接进入可执行上下文。XSS 分为存储型、反射型和 DOM 型，排查时要关注数据从 URL、接口、存储或消息等 Source，是否流入 innerHTML、document.write、eval 等危险 Sink。
>
> 普通文本应该使用框架默认转义或 textContent；富文本和 Markdown 应先生成最终 HTML，再通过 DOMPurify 等成熟 Sanitizer 过滤，之后才能使用 v-html 或 dangerouslySetInnerHTML。CSP 可以限制脚本和资源来源，nonce、hash、frame-ancestors 和 Trusted Types 可以形成纵深防御，但不能替代代码层修复。
>
> CSRF 利用浏览器自动携带 Cookie，让用户在不知情的情况下执行危险操作。主要防御包括 SameSite Cookie、CSRF Token、Origin 或 Referer 校验，以及敏感操作二次确认。CORS 只限制跨源响应读取，不能独立防止 CSRF。
>
> Token 放 localStorage 容易在 XSS 时被直接窃取；HttpOnly Cookie 可以降低直接窃取风险，但要防范 CSRF。更高安全架构可以使用短期 Access Token、Refresh Token 轮换、HttpOnly Secure SameSite Cookie，或者 BFF 模式。不存在只靠 Token 存储位置就绝对安全的方案。
>
> JWT 通常是签名而不是加密，Payload 可以被解码，前端解码只能用于展示，服务端必须验证签名、过期时间、签发者、受众和权限。JWT 也存在撤销困难和权限过期问题，通常需要短生命周期、Refresh Token 会话或黑名单等机制。
>
> 路由守卫、按钮隐藏、文件类型校验和前端角色判断都只能改善体验，真正安全边界必须在服务端。安全不是一个单点功能，而是转义、过滤、CSP、Cookie 属性、Token 生命周期、后端鉴权、依赖管理和安全监控共同构成的体系。

------

# 五十一、本章自测题

1. XSS 的核心原理是什么？
2. 存储型、反射型、DOM 型有什么区别？
3. 什么是 XSS 的 Source 和 Sink？
4. 为什么删除 script 标签不能完全防 XSS？
5. 转义和 Sanitization 有什么区别？
6. 为什么编码必须区分输出上下文？
7. React 和 Vue 默认能防哪些 XSS？
8. `dangerouslySetInnerHTML` 为什么危险？
9. Markdown 为什么也可能造成 XSS？
10. DOMPurify 应该处理 Markdown 原文还是最终 HTML？
11. CSP 能解决什么问题？
12. nonce 和 hash 有什么区别？
13. 为什么不能随便使用 `unsafe-inline`？
14. Trusted Types 解决什么问题？
15. CSRF 的攻击条件是什么？
16. CORS 为什么不能防 CSRF？
17. SameSite 三种值有什么区别？
18. CSRF Token 为什么有效？
19. Origin 与 Referer 校验有什么作用？
20. Same-Origin 与 Same-Site 有什么区别？
21. HttpOnly、Secure、SameSite 分别解决什么问题？
22. localStorage 存 Token 有什么风险？
23. HttpOnly Cookie 存 Token 有什么风险？
24. JWT 是加密的吗？
25. 前端解码 JWT 能否证明 Token 合法？
26. JWT 为什么难以立即撤销？
27. Access Token 和 Refresh Token 有什么区别？
28. Refresh Token Rotation 是什么？
29. 多个请求同时 401 如何避免重复刷新？
30. 为什么前端权限不能代替后端权限？
31. 点击劫持如何防御？
32. 开放重定向有什么风险？
33. postMessage 为什么必须验证 Origin？
34. 前端文件类型校验为什么不够？
35. 前端环境变量为什么不能保存真正密钥？
36. SRI 有什么作用？
37. WebSocket 需要考虑哪些安全问题？
38. HttpOnly 能否彻底防止 XSS？
39. HTTPS 能否防止 XSS？
40. JWT 是否天然比 Session 更安全？

------

# 五十二、本章查漏补缺清单

```text
□ 能完整讲清三类 XSS
□ 能解释 Source 与 Sink
□ 能区分转义与富文本过滤
□ 能说明框架默认转义的边界
□ 能安全处理 Markdown 和富文本
□ 能解释 DOMPurify 的正确使用顺序
□ 能说明流式 Markdown 的安全与性能问题
□ 能解释 CSP、nonce、hash
□ 能说明 CSP 不能替代代码修复
□ 能解释 Trusted Types
□ 能完整讲清 CSRF 原理
□ 能比较 SameSite 三种模式
□ 能解释 CSRF Token
□ 能说明 CORS 不能防 CSRF
□ 能区分 Same-Origin 与 Same-Site
□ 能解释 Cookie 五个核心属性
□ 能比较 localStorage 与 HttpOnly Cookie
□ 能设计 Access Token 与 Refresh Token
□ 能解释 Refresh Token Rotation
□ 能处理多请求并发刷新
□ 能说明 JWT 签名不是加密
□ 能说明 JWT 撤销问题
□ 能说明前端权限不是安全边界
□ 能防止点击劫持和开放重定向
□ 能安全使用 postMessage
□ 能说明文件上传的前后端校验边界
□ 能说明前端不能保存真正 Secret
□ 能解释第三方依赖与 SRI 风险
□ 能结合 AI Markdown、Token 刷新和多角色权限回答项目问题
```

下一章是整个体系的最后一章：**第十二章——前端工程化、TypeScript、构建工具、微前端、简历项目拷打与综合模拟面试。**
