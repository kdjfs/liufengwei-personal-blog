---
title: 第十二章：前端工程化、TypeScript、构建工具、微前端与综合面试
slug: >-
  di-shi-er-zhang-qian-duan-gong-cheng-hua-typescript-gou-jian-gong-ju-wei-qian-duan-yu-zong-he-mian-shi
description: 前 11 章解决了“代码怎么写、框架怎么运行、页面为什么快或慢、系统如何保证安全”；这一章解决的是：
publishDate: '2026-08-02'
category: 前端
tags:
  - React
  - Vue
  - JavaScript
  - TypeScript
  - Node.js
  - CSS
  - 浏览器
  - 算法
cover: auto
draft: false
featured: false
toc: true
---
这是整个 12 章体系的最后一章。

前 11 章解决了“代码怎么写、框架怎么运行、页面为什么快或慢、系统如何保证安全”；这一章解决的是：

> 如何把多人开发的大型前端项目，稳定地开发、构建、测试、发布、监控和维护。

工程化不是“会配 Webpack”，而是完整链路：

```text
代码规范
→ 类型检查
→ 模块组织
→ 依赖管理
→ 构建打包
→ 自动测试
→ CI/CD
→ 灰度发布
→ 错误监控
→ 性能监控
→ 快速回滚
```

------

# 一、什么是前端工程化

面试官问：

> 你怎么理解前端工程化？

不要只回答：

> 使用 Vite、Webpack 打包项目。

## 满分答案

> 前端工程化是通过模块化、组件化、规范化、自动化和监控体系，提高项目开发效率、代码质量、交付稳定性和可维护性。它不仅包括构建工具，还包括 TypeScript、代码规范、依赖管理、自动化测试、CI/CD、环境配置、错误监控、性能预算、灰度发布和回滚机制。

可以拆成五层：

| 层级       | 解决的问题                     |
| ---------- | ------------------------------ |
| 开发规范   | 多人写代码如何保持一致         |
| 模块与架构 | 业务代码如何拆分和复用         |
| 构建体系   | 源码如何变成浏览器可运行资源   |
| 交付体系   | 如何自动测试、构建、发布、回滚 |
| 运行保障   | 上线后如何发现错误和性能问题   |

------

# 二、模块化的发展

前端模块化主要解决：

- 全局变量污染
- 命名冲突
- 依赖关系混乱
- 代码难以复用
- 文件加载顺序难以维护

------

# 三、CommonJS 和 ES Module

这是工程化面试的核心题。

## 1. CommonJS

Node.js 传统模块写法：

```js
const userService = require('./userService'); // 同步加载 userService 模块

function getUserName(userId) { // 定义获取用户名的方法
  const user = userService.getUser(userId); // 调用依赖模块查询用户

  return user.name; // 返回用户姓名
} // getUserName 函数结束

module.exports = { // 导出当前模块提供的能力
  getUserName, // 导出获取用户名的方法
}; // 模块导出结束
```

特点：

- 使用 `require`
- 使用 `module.exports`
- 传统加载过程偏同步
- 模块首次执行后通常会被缓存
- 适合传统 Node.js 环境
- 依赖关系可以动态书写

例如：

```js
const moduleName = condition // 根据条件计算模块名
  ? './moduleA' // 条件成立时选择模块 A
  : './moduleB'; // 条件不成立时选择模块 B

const targetModule = require(moduleName); // 运行时动态决定加载哪个模块
```

这种动态依赖使构建工具更难提前分析完整依赖图。

------

## 2. ES Module

```js
import { getUser } from './userService.js'; // 静态导入用户查询方法

export function getUserName(userId) { // 导出获取用户名的方法
  const user = getUser(userId); // 调用用户查询方法

  return user.name; // 返回用户名
} // getUserName 函数结束
```

特点：

- 使用 `import`、`export`
- 依赖关系通常可以静态分析
- 默认使用严格模式
- 顶层 `this` 通常为 `undefined`
- 导入的是只读的实时绑定
- 更适合 Tree Shaking
- 浏览器可以原生支持

------

## 3. 什么叫实时绑定

模块 A：

```js
export let count = 0; // 导出可变化的 count 绑定

export function increase() { // 导出增加 count 的函数
  count += 1; // 修改模块内部的 count
} // increase 函数结束
```

模块 B：

```js
import { count, increase } from './counter.js'; // 导入 count 和修改函数

console.log(count); // 输出初始值 0

increase(); // 调用函数修改模块内部的 count

console.log(count); // 输出更新后的值 1
```

`count` 不是简单复制出来的一份旧值，而是关联着原模块的导出绑定。

但导入方不能直接重新赋值：

```js
import { count } from './counter.js'; // 导入只读绑定

count = 100; // 错误：导入方不能直接修改导入绑定
```

------

## 4. CommonJS 和 ESM 对比

| 对比项         | CommonJS                    | ES Module              |
| -------------- | --------------------------- | ---------------------- |
| 语法           | `require`、`module.exports` | `import`、`export`     |
| 依赖分析       | 可动态，较难完全静态分析    | 主要可静态分析         |
| 加载思想       | 传统上偏同步                | 浏览器中异步获取模块图 |
| 导出关系       | 常见理解为导出对象          | 只读实时绑定           |
| Tree Shaking   | 较困难                      | 更友好                 |
| 浏览器原生支持 | 不直接支持传统 CJS          | 支持                   |
| 顶层 this      | 常见为模块上下文            | `undefined`            |

## 🔴 必背答案

> CommonJS 的依赖可以在运行时动态决定，传统上通过 require 同步加载并导出对象；ES Module 的 import、export 结构通常可以在编译阶段静态分析，导入值是只读实时绑定，因此更适合 Tree Shaking、代码分割和浏览器原生模块系统。

------

# 四、动态 import 是什么

静态导入：

```js
import MapPanel from './MapPanel.js'; // 页面初始化时将地图模块纳入依赖图
```

动态导入：

```js
async function openMap() { // 定义打开地图的方法
  const mapModule = await import('./MapPanel.js'); // 用户需要地图时再加载模块

  const MapPanel = mapModule.default; // 读取模块的默认导出

  renderMapPanel(MapPanel); // 渲染地图模块
} // openMap 函数结束
```

`import()` 返回 Promise，通常会形成异步代码块。

适用于：

- 路由懒加载
- 大型弹窗
- 地图 SDK
- ECharts
- 富文本编辑器
- 管理后台
- 低频功能

------

# 五、构建工具到底做什么

构建工具不只是“把文件合成一个文件”。

完整构建过程大致包括：

```text
读取入口
→ 解析 import/require
→ 构建模块依赖图
→ 调用转换器处理源码
→ 处理 CSS、图片、字体等资源
→ Tree Shaking
→ 代码分割
→ 生成 Chunk
→ 压缩代码
→ 生成文件 Hash
→ 输出构建产物和 Source Map
```

------

# 六、Webpack 的核心原理

Webpack 可以理解为：

> 以入口文件为起点，递归分析依赖，构建模块图，再将模块转换并组织成一个或多个 Chunk。

简化过程：

```text
entry
→ 分析 import
→ 找到依赖模块
→ 对每个模块执行 loader
→ 生成模块依赖图
→ 根据配置切分 chunk
→ plugin 介入构建生命周期
→ 输出文件
```

------

# 七、Loader 和 Plugin 的区别

这是 Webpack 的高频题。

## 1. Loader

Loader 主要负责：

> 将某类文件转换成 Webpack 可以继续处理的模块。

例如：

```text
TypeScript
→ JavaScript

Sass
→ CSS

Vue 单文件组件
→ JavaScript、CSS、模板代码
```

简化配置：

```js
export default { // 导出 Webpack 配置对象
  module: { // 配置不同类型模块的处理规则
    rules: [ // 定义 Loader 规则数组
      {
        test: /\.ts$/, // 匹配以 .ts 结尾的文件
        use: 'ts-loader', // 使用 ts-loader 转换 TypeScript
        exclude: /node_modules/, // 排除第三方依赖目录
      },
    ], // Loader 规则数组结束
  }, // module 配置结束
}; // Webpack 配置结束
```

Loader 更像流水线里的“加工工人”。

------

## 2. Plugin

Plugin 可以监听和干预 Webpack 构建生命周期。

可以完成：

- 生成 HTML
- 删除旧产物
- 注入环境变量
- 提取 CSS
- 分析包体积
- 压缩资源
- 上传 Source Map
- 自定义构建逻辑

```js
class BuildTimePlugin { // 定义自定义构建时间插件
  apply(compiler) { // Webpack 会调用插件的 apply 方法
    compiler.hooks.done.tap( // 监听构建完成钩子
      'BuildTimePlugin', // 设置当前插件名称
      () => { // 定义构建完成后的逻辑
        console.log('Webpack 构建完成'); // 输出构建完成信息
      }, // 钩子回调结束
    ); // done 钩子注册结束
  } // apply 方法结束
} // 插件类定义结束
```

Plugin 更像“管理整个生产线的负责人”。

## 🔴 标准答案

> Loader 面向具体模块内容，负责把某种源码转换成 JavaScript、CSS 等可处理模块；Plugin 面向整个构建生命周期，通过钩子干预资源生成、优化、输出和发布过程。Loader 解决文件怎么转换，Plugin 解决构建过程怎么扩展。

------

# 八、Vite 为什么开发环境启动快

传统打包式开发：

```text
启动开发服务
→ 先分析整个项目
→ 打包大量模块
→ 生成 Bundle
→ 浏览器加载
```

项目越大，初始打包越慢。

Vite 的核心开发思想：

```text
启动开发服务器
→ 不提前完整打包业务源码
→ 浏览器通过原生 ESM 按需请求模块
→ 请求哪个文件，服务端转换哪个文件
```

例如浏览器请求：

```text
/src/main.ts
```

`main.ts` 导入：

```text
/src/App.vue
```

浏览器继续请求 `App.vue`，Vite 再按需转换。

## 加分回答

> Vite 把传统“启动时处理整个应用”的成本，转移成“浏览器按需请求模块时再处理”，所以项目越大，开发服务初次启动优势通常越明显。

------

# 九、为什么依赖需要预构建

第三方依赖可能存在两个问题：

## 1. CommonJS 兼容问题

浏览器原生 ESM 不能直接理解传统 CommonJS 依赖。

## 2. 模块数量过多

某个第三方库可能内部拆成数百个文件。

如果浏览器逐个请求：

```text
一个依赖
→ 几百次模块请求
```

开发体验会变差。

所以 Vite 开发期通常会对依赖做预构建：

```text
CommonJS 或复杂依赖
→ 转换成适合浏览器的 ESM
→ 合并过碎模块
→ 缓存预构建结果
```

## 🔴 标准答案

> Vite 开发期利用浏览器原生 ESM 按需加载业务源码，但第三方依赖可能是 CommonJS，或者内部模块过于碎片化。因此需要依赖预构建，将它们转换为更适合浏览器的 ESM 形式，并减少大量模块请求。

------

# 十、HMR 热更新原理

HMR 全称：

> Hot Module Replacement，热模块替换。

它的目标不是简单刷新浏览器，而是：

> 只替换变化模块，并尽可能保留当前应用状态。

简化流程：

```text
开发服务器监听文件变化
→ 重新转换变化模块
→ 通过 WebSocket 通知浏览器
→ 浏览器请求新模块
→ HMR Runtime 找到更新边界
→ 替换模块
→ 框架执行局部更新
```

Vue 和 React 的开发插件通常会建立组件级更新边界。

例如修改组件样式时：

```text
只更新对应样式
→ 页面状态尽量保留
```

如果无法安全局部替换：

```text
退化成整页刷新
```

## 🔴 面试答案

> HMR 依赖开发服务器监听文件、WebSocket 通知和浏览器端 HMR Runtime。文件变化后只重新处理相关模块，浏览器拉取新模块并沿模块依赖图寻找可接受更新的边界；如果没有安全更新边界，就回退为整页刷新。

------

# 十一、Vite、Webpack、Rollup 怎么比较

## Webpack

更偏向完整应用构建体系：

- 各种资源统一模块化
- Loader、Plugin 生态成熟
- 配置能力强
- 适合复杂历史项目
- 大型项目配置可能较重

## Rollup

更偏向：

- ES Module
- 库打包
- 高质量输出
- Tree Shaking
- 多种模块格式输出

适合组件库、工具库。

## Vite

Vite 是上层开发与构建工具：

- 开发期强调原生 ESM 和按需转换
- 集成快速转换和 HMR
- 生产环境仍会进行打包优化
- 对 Vue、React 项目开发体验较好

## 🔴 高分回答

> Webpack 是通用模块打包器，应用构建能力和生态成熟；Rollup 更专注 ESM 与库构建，输出通常更简洁；Vite 不只是另一个打包器，它在开发期利用原生 ESM 按需提供模块，在生产环境再进行完整打包优化。选择工具应考虑项目历史、插件生态、构建规模和团队维护成本，而不是只比较启动速度。

------

# 十二、Tree Shaking 的本质

Tree Shaking 是：

> 构建阶段删除最终不会被使用的导出代码。

模块：

```js
export function usedFunction() { // 导出实际会使用的方法
  return 'used'; // 返回已使用结果
} // usedFunction 结束

export function unusedFunction() { // 导出没有被引用的方法
  return 'unused'; // 返回未使用结果
} // unusedFunction 结束
```

调用方：

```js
import { usedFunction } from './utils.js'; // 只导入真正使用的方法

console.log(usedFunction()); // 调用已导入的方法
```

构建工具可以尝试删除 `unusedFunction`。

------

# 十三、Tree Shaking 的前提

通常需要：

- 使用可静态分析的 ESM
- 生产构建开启优化
- 代码没有不可判断的动态行为
- 正确声明副作用
- 压缩器完成死代码删除

------

# 十四、什么是副作用

模块被导入后，即使没有使用导出，也会产生行为：

```js
window.globalConfig = { // 导入模块后修改全局对象
  theme: 'dark', // 写入全局主题配置
}; // 全局配置结束

import './global.css'; // 导入模块时注入全局 CSS
```

这些属于副作用。

如果错误地将整个包标记为无副作用，构建工具可能删掉：

- 全局 CSS
- Polyfill
- 原型扩展
- 全局注册逻辑

## 🔴 必背答案

> Tree Shaking 依赖静态模块分析，但构建工具不能随意删除有副作用的模块。`sideEffects` 配置是在告诉构建工具哪些文件即使导出未使用，也必须保留。错误设置为 false 可能导致 CSS、Polyfill 或全局注册逻辑在生产环境消失。

------

# 十五、代码分割和 Tree Shaking 的区别

## Tree Shaking

解决：

> 最终不需要的代码能不能删除。

## 代码分割

解决：

> 需要的代码是否必须在首屏一次性加载。

例如地图代码确实会被使用，不能 Tree Shake 删除。

但它可以：

```text
首页不加载
→ 进入地图页时再加载
```

## 🔴 标准答案

> Tree Shaking 删除永远不会使用的代码；代码分割保留需要的代码，但把它放到不同 Chunk，在真正需要时再加载。两者解决的是不同问题，可以同时使用。

------

# 十六、Chunk 加载失败怎么处理

前端发布新版本：

```text
旧页面 HTML 正在运行
→ 引用了旧 chunk 文件名
→ 服务器清理旧文件
→ 用户点击懒加载页面
→ 请求旧 chunk
→ 返回 404
```

这会出现：

- ChunkLoadError
- 动态导入失败
- 页面局部白屏

## 解决思路

1. 发布时保留一段时间的旧资源。
2. 静态文件使用不可变版本名称。
3. HTML 不设置超长缓存。
4. 动态导入失败时提示用户刷新。
5. 记录当前前端版本。
6. 灰度发布时避免 HTML 和资源版本错配。

示例：

```js
async function loadPageModule() { // 定义懒加载页面的方法
  try { // 开始捕获动态导入异常
    return await import('./TripPage.js'); // 尝试加载旅行页面模块
  } catch (error) { // 捕获 Chunk 加载失败
    console.error('页面模块加载失败：', error); // 记录错误信息

    const shouldReload = window.confirm( // 弹出版本刷新提示
      '检测到新版本，是否刷新页面？', // 提示用户重新加载
    ); // confirm 调用结束

    if (shouldReload) { // 判断用户是否同意刷新
      window.location.reload(); // 刷新页面获取最新 HTML
    } // 刷新判断结束

    throw error; // 继续向上抛出，便于错误边界处理
  } // try/catch 结束
} // loadPageModule 函数结束
```

不要在失败后无限自动刷新，否则可能造成刷新死循环。

------

# 十七、Babel、TypeScript、SWC 等工具的职责

## TypeScript 编译器

可以负责：

- 类型检查
- 将 TypeScript 转成 JavaScript
- 生成声明文件

但很多项目为了速度，会把：

```text
类型检查
和
语法转换
```

拆开。

例如：

```text
Vite/esbuild/SWC
→ 快速去除类型并转换语法

tsc
→ 单独执行类型检查
```

------

## Babel

主要负责：

- JavaScript 语法转换
- JSX 转换
- 插件化代码转换
- 按目标浏览器处理语法

Babel 本身通常不负责完整 TypeScript 类型检查。

------

## Polyfill

语法转换不代表运行时 API 自动存在。

例如旧环境不支持：

```js
const result = Promise.allSettled(tasks); // 使用 Promise.allSettled 运行时 API
```

即使语法可以解析，浏览器仍可能缺少 `Promise.allSettled`。

这时可能需要 Polyfill。

## 🔴 高分答案

> 语法降级和运行时能力补齐是两件事。Babel、SWC 等可以把新语法转换为旧语法，但 Promise、Map、Array.prototype.includes 等运行时 API 可能仍需要 Polyfill。TypeScript 类型在编译后会被擦除，也不能替代运行时数据校验。

------

# 十八、Browserslist 的作用

Browserslist 用于描述目标运行环境，例如：

```text
支持哪些浏览器
支持到什么版本
```

构建工具、CSS 处理器、JavaScript 转换器可以据此决定：

- 要转换哪些语法
- 要添加哪些 CSS 前缀
- 需要哪些兼容处理

目标越旧：

```text
兼容代码更多
→ 包体积可能更大
→ 构建更复杂
```

因此不能无脑追求支持所有古老浏览器。

------

# 十九、依赖管理核心知识

## dependencies

运行项目时需要的依赖，例如：

- Vue
- React
- Axios
- Pinia

## devDependencies

主要在开发和构建阶段使用，例如：

- ESLint
- TypeScript
- 测试工具
- 构建插件

对于最终是否进入浏览器包，不能只看它写在哪一栏，还要看：

> 源码是否真正导入。

------

## peerDependencies

表示：

> 当前包要求使用方提供某个兼容版本的依赖。

组件库通常不应私自再打包一套 React：

```text
业务项目有 React A
组件库又包含 React B
→ Hooks 和上下文可能异常
```

所以组件库通常把 React 声明为 peer dependency。

------

# 二十、语义化版本 SemVer

版本格式：

```text
主版本.次版本.修订版本
```

例如：

```text
2.5.3
```

- 主版本：不兼容改动
- 次版本：向后兼容的新功能
- 修订版本：向后兼容的问题修复

常见范围：

```text
^1.2.3
→ 一般允许升级次版本和修订版本，但不跨主版本

~1.2.3
→ 一般允许升级修订版本
```

具体边界还要结合 `0.x` 版本规则理解。

------

# 二十一、为什么必须提交 Lock 文件

Lock 文件记录：

- 精确版本
- 间接依赖版本
- 下载地址
- 完整性摘要
- 依赖结构

没有 Lock 文件：

```text
开发者 A 今天安装
开发者 B 下周安装
CI 下个月安装
→ 可能得到不同依赖版本
```

出现：

> 我本地可以，线上不可以。

## 🔴 标准答案

> package.json 描述允许的依赖范围，Lock 文件记录实际解析出的精确依赖树。提交 Lock 文件能提高开发、CI 和生产构建的一致性，也便于审计依赖变更。

------

# 二十二、TypeScript 真正解决什么问题

不要只回答：

> TypeScript 给 JavaScript 加了类型。

更好的答案：

> TypeScript 将一部分运行时错误提前到开发和编译阶段，并通过类型系统描述模块边界、接口协议和业务状态，提升重构安全性、代码提示和多人协作效率。

TypeScript 主要价值：

- 提前发现字段错误
- 描述接口结构
- 约束函数输入输出
- 支持安全重构
- 改善编辑器提示
- 表达复杂业务状态
- 作为模块间契约

但它不能解决：

- 运行时接口返回错误
- XSS、CSRF
- 业务逻辑错误
- 性能问题
- 数据库错误

------

# 二十三、any、unknown、never

## 1. any

```ts
let data: any = getData(); // 使用 any 接收任意类型数据

data.notExist.deep.method(); // 编译器几乎不会阻止危险调用
```

`any` 相当于：

> 暂时退出类型检查。

适合极少数迁移或第三方边界场景，不应到处使用。

------

## 2. unknown

```ts
function parseResponse(value: unknown) { // 使用 unknown 接收不可信数据
  if ( // 开始进行类型收窄
    typeof value === 'object' && // 确保 value 是对象
    value !== null && // 排除 null
    'message' in value // 确保对象存在 message 属性
  ) {
    const result = value as { message: unknown }; // 将对象收窄为含 message 的结构

    if (typeof result.message === 'string') { // 判断 message 是否为字符串
      return result.message; // 安全返回字符串
    } // 字符串判断结束
  } // 对象判断结束

  return '未知响应'; // 数据结构不合法时返回兜底值
} // parseResponse 函数结束
```

`unknown` 表示：

> 我暂时不知道它是什么，使用前必须证明。

------

## 3. never

`never` 表示永远不会正常产生值。

```ts
function throwError(message: string): never { // 定义一定会抛错的函数
  throw new Error(message); // 抛出异常并终止当前流程
} // throwError 函数结束
```

还常用于穷尽检查：

```ts
type OrderStatus = // 定义订单状态联合类型
  | 'pending' // 待处理状态
  | 'processing' // 处理中状态
  | 'completed'; // 已完成状态

function getStatusText(status: OrderStatus): string { // 根据状态返回展示文本
  switch (status) { // 根据状态进行分支判断
    case 'pending': // 匹配待处理状态
      return '待处理'; // 返回待处理文本

    case 'processing': // 匹配处理中状态
      return '处理中'; // 返回处理中文本

    case 'completed': // 匹配已完成状态
      return '已完成'; // 返回已完成文本

    default: { // 处理理论上不可能出现的分支
      const exhaustiveCheck: never = status; // 新增状态未处理时触发类型错误

      return exhaustiveCheck; // 保持返回类型完整
    } // default 分支结束
  } // switch 结束
} // getStatusText 函数结束
```

## 🔴 必背

> any 是关闭检查，unknown 是暂时未知但使用前必须收窄，never 表示不可能存在的值，常用于抛错函数和联合类型的穷尽检查。

------

# 二十四、interface 和 type

## interface

```ts
interface User { // 定义用户对象接口
  id: string; // 定义用户 ID
  name: string; // 定义用户姓名
} // User 接口结束

interface Admin extends User { // 继承普通用户接口
  permissions: string[]; // 增加管理员权限列表
} // Admin 接口结束
```

特点：

- 擅长描述对象结构
- 支持 `extends`
- 支持声明合并

------

## type

```ts
type UserId = string | number; // 定义用户 ID 联合类型

type RequestState<T> = // 定义泛型请求状态
  | { status: 'loading' } // 加载状态
  | { status: 'success'; data: T } // 成功状态
  | { status: 'error'; error: Error }; // 失败状态
```

特点：

- 能描述联合类型
- 交叉类型
- 条件类型
- 映射类型
- 元组
- 基本类型别名

## 如何选择

- 公共对象契约可以优先考虑 `interface`
- 联合、条件、映射等类型使用 `type`
- 团队保持一致比机械争论更重要

## 🔴 标准答案

> interface 和 type 都能描述对象。interface 支持声明合并和 extends，适合公共对象契约；type 表达能力更广，可以描述联合、交叉、条件和映射类型。项目中应根据表达需求选择，而不是认为其中一个绝对更高级。

------

# 二十五、联合类型比大量可选字段更安全

不推荐：

```ts
interface RequestState<T> { // 定义不够严谨的请求状态
  loading?: boolean; // 可选加载标记
  data?: T; // 可选成功数据
  error?: Error; // 可选错误信息
} // RequestState 接口结束
```

这允许产生矛盾状态：

```text
loading = true
data 有值
error 也有值
```

更推荐可辨识联合：

```ts
type RequestState<T> = // 定义严格的请求状态联合类型
  | {
      status: 'idle'; // 表示尚未请求
    }
  | {
      status: 'loading'; // 表示正在加载
    }
  | {
      status: 'success'; // 表示请求成功
      data: T; // 成功状态必须包含数据
    }
  | {
      status: 'error'; // 表示请求失败
      error: Error; // 失败状态必须包含错误
    }; // 联合类型结束
```

使用：

```ts
function renderState<T>(state: RequestState<T>) { // 根据请求状态执行渲染
  if (state.status === 'success') { // 判断当前是否成功
    console.log(state.data); // 当前分支可以安全访问 data
  } // 成功状态判断结束

  if (state.status === 'error') { // 判断当前是否失败
    console.error(state.error); // 当前分支可以安全访问 error
  } // 失败状态判断结束
} // renderState 函数结束
```

## 🟡 加分表达

> 类型系统不应只是给字段加注释，还应该帮助排除非法业务状态。使用可辨识联合可以做到“让错误状态无法被表达”。

------

# 二十六、泛型解决什么问题

错误写法：

```ts
function identity(value: any): any { // 使用 any 定义通用返回函数
  return value; // 返回输入值
} // identity 函数结束
```

类型信息丢失。

泛型：

```ts
function identity<T>(value: T): T { // 使用泛型保留输入输出类型关系
  return value; // 返回与输入相同类型的值
} // identity 函数结束

const result = identity('React'); // TypeScript 推断 result 为 string
```

泛型核心不是：

> 让函数支持所有类型。

而是：

> 描述多个位置之间的类型关系。

------

## 泛型请求函数

```ts
interface ApiResponse<T> { // 定义统一接口响应结构
  code: number; // 定义业务状态码
  message: string; // 定义响应消息
  data: T; // 使用泛型表示具体业务数据
} // ApiResponse 接口结束

async function request<T>(url: string): Promise<T> { // 定义泛型请求函数
  const response = await fetch(url); // 发起网络请求

  if (!response.ok) { // 检查 HTTP 状态
    throw new Error(`请求失败：${response.status}`); // 状态异常时抛错
  } // HTTP 状态判断结束

  const result = (await response.json()) as ApiResponse<T>; // 将响应解析为统一结构

  if (result.code !== 200) { // 判断业务状态是否成功
    throw new Error(result.message); // 业务失败时抛出错误
  } // 业务状态判断结束

  return result.data; // 返回具体业务数据
} // request 函数结束
```

但注意：

> `as ApiResponse<T>` 只是在编译期告诉 TypeScript 相信你，并没有运行时验证服务器真的返回这个结构。

------

# 二十七、TypeScript 类型会在运行时消失

```ts
interface User { // 定义用户接口
  id: string; // 定义用户 ID
  name: string; // 定义用户姓名
} // User 接口结束
```

编译成 JavaScript 后，`User` 通常不存在。

所以接口返回：

```json
{
  "id": 123,
  "username": null
}
```

TypeScript 不能自动阻止。

## 正确思路

外部边界数据需要运行时校验：

- 接口响应
- localStorage
- URL 参数
- WebSocket 消息
- postMessage
- 用户上传 JSON

简单类型守卫：

```ts
interface User { // 定义用户结构
  id: string; // 定义字符串用户 ID
  name: string; // 定义字符串用户名
} // User 接口结束

function isUser(value: unknown): value is User { // 定义用户类型守卫
  if (typeof value !== 'object' || value === null) { // 排除非对象和 null
    return false; // 数据不是对象时校验失败
  } // 对象判断结束

  const candidate = value as Record<string, unknown>; // 转换为未知属性对象

  return ( // 返回字段校验结果
    typeof candidate.id === 'string' && // 确保 id 是字符串
    typeof candidate.name === 'string' // 确保 name 是字符串
  ); // 校验表达式结束
} // isUser 函数结束
```

## 🔴 标准答案

> TypeScript 只在编译阶段生效，类型会被擦除。对于接口响应、WebSocket 和本地存储等外部数据，不能只写类型断言，还需要类型守卫或运行时 Schema 校验。

------

# 二十八、keyof、typeof 和索引访问类型

```ts
const user = { // 定义用户对象
  id: '1001', // 定义用户 ID
  name: '刘凤伟', // 定义用户姓名
  age: 22, // 定义用户年龄
}; // 用户对象结束

type User = typeof user; // 根据运行时变量推导用户类型

type UserKey = keyof User; // 得到 'id' | 'name' | 'age'

type UserName = User['name']; // 得到 name 属性对应的 string 类型
```

通用安全取值：

```ts
function getProperty< // 定义安全读取属性的泛型函数
  T extends object, // 限制 T 必须是对象
  K extends keyof T, // 限制 K 必须是 T 的合法键
>(
  target: T, // 接收目标对象
  key: K, // 接收合法属性名
): T[K] { // 返回对应属性类型
  return target[key]; // 读取并返回目标属性
} // getProperty 函数结束
```

------

# 二十九、映射类型

```ts
type Optional<T> = { // 定义将属性变为可选的映射类型
  [K in keyof T]?: T[K]; // 遍历所有属性并添加可选标记
}; // Optional 类型结束

type ReadonlyData<T> = { // 定义只读映射类型
  readonly [K in keyof T]: T[K]; // 遍历所有属性并添加 readonly
}; // ReadonlyData 类型结束
```

内置工具类型：

- `Partial<T>`
- `Required<T>`
- `Readonly<T>`
- `Pick<T, K>`
- `Omit<T, K>`
- `Record<K, V>`

不要只会背名字，要理解它们都是在做：

> 对原类型进行映射和重新组合。

------

# 三十、条件类型与 infer

```ts
type ApiResult<T> = T extends Promise<infer R> // 判断 T 是否为 Promise，并推断内部类型
  ? R // 如果是 Promise，返回其内部结果类型
  : T; // 否则返回原类型
```

使用：

```ts
type ResultA = ApiResult<Promise<string>>; // 推导为 string

type ResultB = ApiResult<number>; // 推导为 number
```

`infer` 的意义：

> 在条件类型匹配过程中声明一个待推断的类型变量。

不需要为了面试炫技手写极复杂类型，但要理解常见工具类型背后的思路。

------

# 三十一、as const 和 satisfies

## as const

```ts
const orderStatus = { // 定义订单状态配置
  pending: 'pending', // 定义待处理状态
  completed: 'completed', // 定义已完成状态
} as const; // 将属性和值收窄为只读字面量
```

类型不再是宽泛的 `string`，而是精确字面量。

------

## satisfies

```ts
type RouteConfig = Record< // 定义路由配置约束
  string, // 路由名称是字符串
  {
    path: string; // 每个路由必须具有 path
    requiresAuth: boolean; // 每个路由必须声明是否需要登录
  }
>; // RouteConfig 类型结束

const routes = { // 定义路由配置对象
  home: {
    path: '/', // 设置首页路径
    requiresAuth: false, // 首页不要求登录
  },
  profile: {
    path: '/profile', // 设置个人页路径
    requiresAuth: true, // 个人页要求登录
  },
} satisfies RouteConfig; // 校验对象满足 RouteConfig，同时保留精确推断
```

`satisfies` 与直接断言不同：

> 它检查是否符合目标类型，但尽量保留对象自身更精确的类型信息。

------

# 三十二、结构类型系统

TypeScript 主要采用结构类型：

> 只要结构兼容，就可以赋值，不要求类名或接口名相同。

```ts
interface User { // 定义用户接口
  id: string; // 定义用户 ID
  name: string; // 定义用户姓名
} // User 接口结束

const admin = { // 定义管理员对象
  id: '1', // 定义管理员 ID
  name: '刘凤伟', // 定义管理员姓名
  permissions: ['read'], // 定义额外权限字段
}; // admin 对象结束

const user: User = admin; // 结构至少满足 User，因此可以赋值
```

------

## 对象字面量的额外属性检查

```ts
interface User { // 定义用户结构
  id: string; // 定义用户 ID
  name: string; // 定义用户名
} // User 接口结束

const user: User = { // 直接将对象字面量赋值给 User
  id: '1', // 设置用户 ID
  name: '刘凤伟', // 设置用户姓名
  role: 'admin', // 错误：对象字面量存在未声明的额外属性
}; // 对象定义结束
```

但先赋给变量时，可能通过结构兼容：

```ts
const admin = { // 先定义具有更多字段的对象
  id: '1', // 设置用户 ID
  name: '刘凤伟', // 设置用户名
  role: 'admin', // 设置额外角色字段
}; // admin 对象结束

const user: User = admin; // admin 至少具有 User 所需字段
```

## 加分点

> TypeScript 的额外属性检查主要针对新鲜对象字面量，不等于系统采用严格的名义类型。

------

# 三十三、tsconfig 最重要的配置思想

不需要死背所有字段，但必须理解以下方向：

## strict

开启严格类型检查总开关。

## noImplicitAny

不允许隐式出现 any。

## strictNullChecks

让 `null`、`undefined` 被严格区分。

## noUncheckedIndexedAccess

通过数组或索引访问时，结果可能包含 `undefined`。

```ts
const users = ['A', 'B']; // 定义用户数组

const firstUser = users[10]; // 索引越界时运行结果是 undefined
```

如果不检查，代码可能错误地认为它一定是字符串。

## exactOptionalPropertyTypes

更严格地区分：

```text
属性不存在
和
属性存在但值为 undefined
```

## noEmit

仅做类型检查，由其他工具负责代码转换。

## moduleResolution

决定模块路径如何解析，应与项目构建方式匹配。

## 🔴 高分答案

> TypeScript 严格模式不是为了让开发更难，而是让 null、隐式 any、越界访问等风险尽量提前暴露。项目中不应该为了消除报错到处使用 as 和 any，而应修正数据边界和类型设计。

------

# 三十四、项目目录应该怎么设计

不要按“文件类型”无限堆放：

```text
components/
hooks/
utils/
pages/
```

当项目变大时，可以结合业务领域组织：

```text
src/
├── app/                    应用初始化、路由、全局 Provider
├── shared/                 跨业务通用能力
│   ├── components/         通用 UI 组件
│   ├── hooks/              通用 Hooks
│   ├── utils/              无业务工具
│   └── request/            请求基础设施
├── features/               业务能力
│   ├── auth/               登录和权限
│   ├── trip/               行程业务
│   ├── map/                地图业务
│   └── chat/               AI 对话业务
├── pages/                  页面组合层
├── stores/                 全局或跨页面状态
└── main.ts                 应用入口
```

## 原则

- 通用层不能反向依赖业务层
- 页面负责组合，不承载全部细节
- 业务模块尽量自治
- 请求 DTO、类型和业务转换集中管理
- 不把所有函数都丢进 `utils`

------

# 三十五、接口层为什么要分层

不推荐页面直接到处写：

```ts
const response = await fetch('/api/trip'); // 页面直接发请求

const result = await response.json(); // 页面直接解析后端响应

setTrip(result.data); // 页面直接依赖后端数据结构
```

更好的层次：

```text
请求基础层
→ 处理 Token、超时、错误码

业务 API 层
→ 定义具体接口和参数

数据转换层
→ 后端 DTO 转换为前端模型

页面或 Hook
→ 使用业务模型
```

示例：

```ts
interface TripDto { // 定义后端返回的行程 DTO
  trip_id: string; // 后端使用下划线 ID
  trip_name: string; // 后端使用下划线名称
} // TripDto 接口结束

interface Trip { // 定义前端业务模型
  id: string; // 前端统一使用 id
  name: string; // 前端统一使用 name
} // Trip 接口结束

function transformTrip(dto: TripDto): Trip { // 定义后端 DTO 转前端模型的方法
  return { // 返回统一业务对象
    id: dto.trip_id, // 转换行程 ID
    name: dto.trip_name, // 转换行程名称
  }; // Trip 对象结束
} // transformTrip 函数结束
```

优势：

- 后端字段变化集中处理
- 页面不依赖奇怪字段名
- 更容易 Mock 和测试
- 类型边界清晰

------

# 三十六、错误处理应该分层

不是所有错误都：

```text
弹出“系统异常”
```

可以分为：

| 错误类型       | 处理方式                |
| -------------- | ----------------------- |
| 参数校验错误   | 表单字段提示            |
| 未登录         | 进入刷新或登录流程      |
| 无权限         | 403 页面或禁用操作      |
| 网络断开       | 重试提示                |
| 可降级模块失败 | 模块局部降级            |
| 程序异常       | 错误边界和日志上报      |
| 服务端异常     | 展示 Trace ID，便于排查 |

高分表达：

> 错误处理不是在 Axios 拦截器里统一弹 Toast。拦截器负责通用协议错误，业务层负责业务语义，页面负责用户交互，监控系统负责记录上下文。

------

# 三十七、微前端解决什么问题

微前端不是为了：

> 让一个小项目看起来更高级。

它主要适用于：

- 大型系统
- 多团队独立开发
- 不同技术栈并存
- 独立构建和发布
- 历史系统渐进式升级
- 业务边界较清晰

典型后台：

```text
主应用
├── 用户中心：团队 A
├── 财务系统：团队 B
├── 仓储系统：团队 C
└── 数据大屏：团队 D
```

每个团队希望：

- 独立仓库
- 独立开发
- 独立测试
- 独立发布
- 主应用统一导航和权限

------

# 三十八、什么时候不适合微前端

不适合：

- 项目很小
- 团队只有两三个人
- 业务耦合非常严重
- 所有模块同时发布
- 没有独立团队边界
- 团队没有基础设施维护能力

微前端会增加：

- 运行时复杂度
- 路由冲突
- 样式隔离
- 依赖重复
- 通信成本
- 监控难度
- 本地联调难度
- 发布版本协调

## 🔴 标准答案

> 微前端解决的是组织和独立交付问题，不是单纯技术炫技。没有多团队、独立发布和技术栈迁移需求时，引入微前端的复杂度可能大于收益。

------

# 三十九、qiankun 的核心运行模型

qiankun 的核心思想可以理解为：

```text
主应用注册子应用
→ 监听路由
→ 命中激活规则
→ 加载子应用资源
→ 执行 bootstrap
→ 执行 mount
→ 路由离开
→ 执行 unmount
```

子应用一般暴露生命周期：

```ts
export async function bootstrap() { // 子应用首次初始化时执行
  console.log('子应用 bootstrap'); // 输出初始化信息
} // bootstrap 生命周期结束

export async function mount(props: Record<string, unknown>) { // 子应用每次挂载时执行
  console.log('子应用 mount：', props); // 读取主应用传入的信息

  renderSubApplication(props); // 将子应用渲染到指定容器
} // mount 生命周期结束

export async function unmount() { // 子应用卸载时执行
  destroySubApplication(); // 卸载框架根节点和业务资源
} // unmount 生命周期结束
```

`unmount` 必须清理：

- 框架根实例
- 全局事件
- 定时器
- WebSocket
- Observer
- 全局状态订阅
- 第三方 SDK
- 挂到 body 的弹窗

------

# 四十、子应用为什么需要独立运行能力

子应用既要能在主应用中运行，也最好能够单独启动：

```text
主应用模式
→ 接收主应用容器和通信数据

独立模式
→ 自己创建根容器和路由
```

这样有利于：

- 独立开发
- 单独调试
- 单独测试
- 降低主应用依赖

------

# 四十一、微前端路由问题

需要考虑：

- 主应用路由与子应用路由前缀
- Hash 和 History 冲突
- 子应用基础路径
- 浏览器刷新 404
- 重复监听路由
- 子应用内部跳转是否影响主应用
- 页面返回时状态是否保留

例如：

```text
主应用前缀：/warehouse
子应用内部：/inventory
最终地址：/warehouse/inventory
```

子应用不能假设自己永远部署在 `/`。

------

# 四十二、微前端静态资源路径问题

子应用独立部署地址：

```text
https://warehouse.example.com
```

被主应用加载到：

```text
https://portal.example.com
```

如果子应用资源使用相对路径：

```text
/assets/logo.png
```

浏览器可能错误地请求主应用域名资源。

需要确保：

- 构建 public path 正确
- 运行时资产基础路径正确
- CSS 中图片路径正确
- 动态 import Chunk 地址正确

这是微前端最常见的问题之一。

------

# 四十三、JavaScript 沙箱能保证安全吗

不能。

微前端沙箱主要用于：

- 限制全局变量污染
- 记录和恢复 `window` 修改
- 隔离部分运行状态

它不是：

- 浏览器安全沙箱
- 权限边界
- 恶意代码防护
- 多租户安全隔离

如果子应用和主应用运行在同一页面中，恶意子应用仍可能通过 DOM、网络等方式影响页面。

## 🔴 加分答案

> qiankun 的 JavaScript 沙箱主要解决全局变量污染和副作用恢复，不是真正的安全隔离。需要不可信代码隔离时，应考虑 iframe、独立 Origin 和严格通信协议。

------

# 四十四、CSS 隔离的难点

微前端可能遇到：

```css
button { /* 子应用定义全局按钮样式 */
  color: red; /* 可能污染主应用所有按钮 */
} /* button 规则结束 */
```

解决方式：

- CSS Modules
- Scoped CSS
- BEM 命名
- 子应用统一前缀
- Shadow DOM
- 运行时样式隔离

但仍需注意：

- 弹窗挂载到 `body`
- Teleport、Portal 逃离子应用容器
- 第三方组件全局样式
- CSS 变量污染
- 字体和动画名称冲突

## 高分表达

> 微前端样式隔离不仅是给选择器加前缀。Portal 或 Teleport 挂到 body 后可能逃离作用域，CSS 变量、动画名和第三方组件样式也可能冲突，因此最好从组件库和命名规范层面一起治理。

------

# 四十五、微前端通信怎么设计

不推荐：

```text
所有子应用共享一个巨大全局 Store
```

这会让独立应用重新耦合在一起。

更推荐：

## 1. Props

主应用挂载时传递：

- 当前用户
- Token 获取方法
- 路由能力
- 全局配置

## 2. 事件协议

```text
子应用发布订单创建事件
→ 主应用或其他模块订阅
```

需要定义：

- 事件名
- 数据结构
- 版本
- 错误处理
- 取消订阅

## 3. URL

适合：

- 页面定位
- 查询条件
- 可分享状态

## 4. 后端或共享服务

跨业务长期状态最好通过服务端统一，而不是在前端应用间偷偷传递内部对象。

## 🔴 必背

> 微前端通信应该传递稳定业务协议，而不是让子应用互相操作内部组件或 Store。通信过多往往说明业务边界拆分不合理。

------

# 四十六、微前端公共依赖问题

多个子应用分别打包：

- React
- Vue
- UI 组件库
- 日期库

可能导致：

- 资源重复下载
- 内存增加
- 版本冲突
- 上下文不共享
- Hooks 多实例异常

但强制所有应用共享同一版本，也会降低独立升级能力。

这是权衡：

```text
共享越多
→ 资源更少
→ 独立性下降

共享越少
→ 独立性更强
→ 重复依赖增加
```

------

# 四十七、qiankun 和 Module Federation 的思路区别

## qiankun 类运行时编排

更关注：

- 应用级加载
- 路由激活
- 生命周期
- 沙箱
- 样式隔离
- 多技术栈子应用

## Module Federation

更关注：

- 构建产物间共享模块
- 运行时加载远程组件
- 共享依赖
- 模块级复用

可以粗略理解：

```text
qiankun
→ 组合多个应用

Module Federation
→ 组合多个远程模块
```

两者不是绝对互斥，但工程复杂度都不低。

------

# 四十八、Monorepo 是什么

Monorepo 是：

> 多个应用或包放在同一个代码仓库统一管理。

例如：

```text
apps/
├── web/
├── admin/
└── mobile/

packages/
├── ui/
├── request/
├── eslint-config/
└── types/
```

适合：

- 多应用共享组件
- 统一规范
- 原子提交
- 统一依赖升级
- 跨包重构

风险：

- 仓库变大
- CI 构建变慢
- 权限边界复杂
- 包依赖容易混乱
- 工具链要求更高

------

# 四十九、Monorepo 与微前端不是一回事

Monorepo 解决：

> 代码仓库如何组织。

微前端解决：

> 多个前端应用如何在运行和发布时组合。

可能出现：

```text
多个子应用在一个 Monorepo
```

也可能：

```text
每个微前端子应用独立仓库
```

两者没有必然绑定关系。

------

# 五十、CI/CD 完整流程

成熟前端项目提交代码后，可以经历：

```text
安装依赖
→ ESLint
→ 类型检查
→ 单元测试
→ 构建
→ 依赖安全扫描
→ 产物体积检查
→ 上传 Source Map
→ 部署测试环境
→ E2E 或冒烟测试
→ 灰度发布
→ 监控指标
→ 全量发布
→ 失败回滚
```

## 🔴 面试答案

> CI/CD 的价值不是自动执行 npm run build，而是把质量门禁固化到交付流程，让类型错误、测试失败、体积回退和安全风险在发布前被发现，并保证构建产物可追踪、可回滚。

------

# 五十一、为什么强调一次构建、多环境晋级

不推荐：

```text
测试环境构建一次
生产环境重新构建一次
```

因为：

- 依赖可能变化
- 环境可能变化
- 两次产物不一定一致

更可靠的思想：

```text
同一次构建生成不可变产物
→ 测试环境验证
→ 将相同产物晋级到生产
```

环境差异通过：

- 运行时配置
- 服务端注入配置
- 部署配置

解决。

## 加分表达

> 真正发布到生产的应是已经在测试环境验证过的同一份不可变产物，而不是重新构建出的“理论上相同版本”。

------

# 五十二、灰度发布与回滚

灰度发布可以按：

- 用户比例
- 地区
- 账号白名单
- 组织
- 设备
- Cookie
- 请求 Header

逐步放量。

灰度期间观察：

- JavaScript 错误率
- 接口错误率
- LCP、INP
- 白屏率
- 核心业务成功率

发现异常：

```text
暂停放量
→ 回滚上一版本
```

回滚必须提前准备，而不是出事后再研究。

------

# 五十三、环境变量与运行时配置

构建时环境变量会被打进前端包：

```ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL; // 读取构建阶段注入的接口地址
```

问题：

```text
测试环境一个包
生产环境又重新构建一个包
```

运行时配置思路：

```js
window.RUNTIME_CONFIG = { // 由部署环境在页面运行时注入配置
  apiBaseUrl: 'https://api.example.com', // 设置当前环境接口地址
  release: '2026.07.31', // 设置当前发布版本
}; // 运行时配置结束
```

前端读取：

```ts
const apiBaseUrl = window.RUNTIME_CONFIG.apiBaseUrl; // 读取部署环境注入的接口地址
```

注意：

> 无论构建变量还是运行时变量，只要发送到浏览器，都不能存放真正秘密。

------

# 五十四、前端监控体系

完整前端监控至少包括：

## 1. 错误监控

- JavaScript 异常
- Promise 未处理异常
- 资源加载失败
- 框架错误边界
- Chunk 加载失败

## 2. 接口监控

- 请求耗时
- 状态码
- 业务错误码
- 重试次数
- Trace ID

## 3. 性能监控

- LCP
- INP
- CLS
- 路由切换时间
- 首屏业务可用时间
- AI 首字时间

## 4. 业务监控

- 登录成功率
- 订单提交成功率
- 行程生成成功率
- 文件上传成功率

------

# 五十五、全局错误捕获示例

```ts
window.addEventListener('error', (event) => { // 监听全局运行错误和资源错误
  reportError({ // 调用统一错误上报函数
    type: 'window-error', // 标记错误来源
    message: event.message, // 保存错误消息
    filename: event.filename, // 保存发生错误的脚本地址
    line: event.lineno, // 保存错误行号
    column: event.colno, // 保存错误列号
    stack: event.error?.stack, // 保存异常堆栈
    release: window.RUNTIME_CONFIG.release, // 保存当前前端版本
    path: window.location.href, // 保存当前页面地址
  }); // 错误上报结束
}); // error 事件监听结束

window.addEventListener('unhandledrejection', (event) => { // 监听未处理 Promise 拒绝
  reportError({ // 调用统一错误上报方法
    type: 'unhandled-rejection', // 标记 Promise 异常类型
    message: String(event.reason), // 将失败原因转换成字符串
    stack: event.reason?.stack, // 尝试读取错误堆栈
    release: window.RUNTIME_CONFIG.release, // 保存当前发布版本
    path: window.location.href, // 保存当前页面地址
  }); // Promise 异常上报结束
}); // unhandledrejection 监听结束
```

需要注意：

- 采样
- 去重
- 限流
- 脱敏
- Source Map 还原
- 用户隐私
- Breadcrumb 行为轨迹

------

# 五十六、Source Map 应该怎么管理

生产 Source Map 的作用：

```text
压缩代码报错位置
→ 映射回原始源码行列
```

但不一定要公开给所有用户。

更常见流程：

```text
构建生成 Source Map
→ 上传错误监控平台
→ 部署时不公开或限制访问
→ 上报错误时根据 release 还原堆栈
```

必须让：

```text
错误事件中的 release
和
Source Map 对应版本
```

一致，否则无法正确还原。

------

# 五十七、测试体系怎么设计

## 1. 单元测试

测试纯函数和独立逻辑：

- 数据转换
- 权限判断
- 金额计算
- 状态机
- 工具函数

## 2. 组件测试

测试：

- 用户操作
- 条件渲染
- 表单校验
- 组件事件
- 加载和错误状态

不要过度测试组件内部实现细节。

## 3. 集成测试

测试多个模块协作：

- 页面 + Store + API Mock
- 登录状态 + 路由守卫
- 表单 + 请求 + 错误提示

## 4. E2E

从用户视角测试核心链路：

```text
登录
→ 创建行程
→ 查看生成进度
→ 打开结果
→ 导出分享
```

E2E 成本较高，应优先覆盖关键业务，而不是所有按钮。

------

# 五十八、为什么测试金字塔不能机械套用

前端项目中：

- UI 变化频繁
- 组件交互复杂
- 浏览器差异存在
- 大量逻辑由框架驱动

因此更重要的是：

> 让测试覆盖真实风险。

例如订单状态机值得大量单元测试，而一个纯展示标题组件没有必要写复杂测试。

------

# 五十九、代码规范工具各自负责什么

## ESLint

检查：

- 潜在错误
- 不良写法
- Hook 规则
- 未使用变量
- 团队编码规范

## Prettier

负责：

- 格式化
- 缩进
- 换行
- 引号风格

## TypeScript

负责：

- 类型关系
- 参数和返回值
- 字段兼容性

它们职责不同：

```text
Prettier
→ 代码长什么样

ESLint
→ 代码写法是否合理

TypeScript
→ 类型是否正确
```

------

# 六十、提交规范和 Git 工作流

提交信息可以采用：

```text
feat: 新增行程地图
fix: 修复 Token 刷新并发问题
refactor: 重构订单状态转换
perf: 优化长会话首屏渲染
test: 增加权限判断测试
docs: 更新接口说明
```

价值：

- 自动生成变更日志
- 快速定位版本改动
- 便于回滚
- 便于代码审查

不要为了形式把一个巨大改动拆成几十个无意义提交，也不要一个提交混入多个无关功能。

------

# 六十一、项目拷打：4.5MB 降到 2.7MB

面试官可能问：

> 你是怎么优化的？

高分结构：

> 我先统一测量口径，通过构建分析确认 4.5MB 指的是哪类产物，并定位占比最大的依赖和首屏 Chunk。然后把地图、图表和低频模块改为动态加载，清理未使用依赖，检查是否存在重复版本，优化按需导入和 Tree Shaking，并结合文本压缩降低传输体积。优化后用相同配置重新构建得到 2.7MB，同时继续观察首屏真实加载体积、请求瀑布和 JavaScript 执行时间，避免只优化 dist 总大小。

继续追问：

> 为什么不用把所有模块都拆开？

回答：

> 过度分包会增加请求和依赖瀑布，也可能让公共模块重复，因此我按路由、低频大模块和更新频率拆分，而不是一个组件一个 Chunk。

------

# 六十二、项目拷打：长会话 4.2 秒降到 1.7 秒

高分回答：

> 我先定义指标为进入会话后最近一屏消息可见并可交互的时间，而不是全部历史消息加载完成。排查发现首屏路径包含历史消息全量加载、串行接口、完整 Markdown 解析和大量 DOM 渲染。我将最近消息优先返回，历史消息改为向上分页；独立接口并行；流式内容按帧合并，只解析最后一条消息；旧请求通过取消和序号防止竞态。最终相同测试口径下降到约 1.7 秒。

面试官会继续问：

> 是接口变快还是前端变快？

回答：

> 两部分都可能有贡献，但必须拆开看。我会分别记录接口响应、数据转换、首屏渲染和首个可交互时间，避免把用户感知优化全部说成接口优化。

------

# 六十三、项目拷打：多角色系统怎么设计

高分回答：

> 登录后服务端返回角色和权限集合，前端根据配置生成菜单和 TabBar，路由守卫控制页面准入，按钮权限控制操作展示。权限配置集中管理，避免各页面散落大量角色 if/else。Pinia 只保存当前用户和权限等跨页面状态，切换账号或角色时统一重置缓存和 Store。前端权限只改善体验，最终接口仍由后端校验角色、资源归属和数据范围。

------

# 六十四、项目拷打：WebSocket 任务进度如何保证可靠

高分回答：

> WebSocket 用于实时推送，但我不会把它当成唯一事实来源。每条消息携带 taskId、序号和状态，前端只处理更高版本消息，避免乱序回退。断线后进行带退避的重连，重连成功通过 HTTP 查询任务最终状态完成补偿。组件卸载时关闭连接和定时器，服务端负责订阅权限，前端不能只通过 taskId 过滤保障安全。

------

# 六十五、项目拷打：地图 API 降级怎么实现

高分回答：

> 我会先抽象统一地图能力接口，让业务层只依赖地点搜索、标记绘制和路线规划等能力，不直接散落 Google 或高德 SDK 调用。初始化时根据网络、地区和配置选择实现；主地图加载超时或报错后释放旧实例，再加载备用实现。状态和业务数据保留在框架层，地图实例放 ref 中，切换时重新将标记和路线同步到新实例。

这比：

> Google 失败就 if 一下换高德。

更有架构深度。

------

# 六十六、项目拷打：MDF.js 或企业工作台竞态怎么排查

推荐回答：

> 我会先画出 ViewModel 生命周期、查询触发源和 GridModel 数据写入顺序，然后给每次请求加入请求 ID、触发来源和时间日志。常见问题是初始化查询、路由激活和手动查询同时运行，后返回的旧请求覆盖新状态。正确性层面使用请求序号只允许最新结果提交，资源层面取消可取消请求；同时检查组件卸载、缓存恢复和多次注册监听，避免生命周期重复触发。

------

# 六十七、简历指标如何避免被问倒

简历上出现数字，至少要准备五件事：

```text
指标定义
基线环境
测量工具
具体改动
优化后复测
```

例如“提升 60%”必须回答：

- 提升了什么？
- 从多少到多少？
- 平均值还是 P75？
- 测了多少次？
- 网络和设备是否一致？
- 是否牺牲了其他指标？

## 真实性红线

不知道的数据不要现场编造。

更稳妥的表达：

> 这是固定测试环境下多次测量的近似值，主要用于说明优化趋势；当时没有完整 RUM 数据，所以我不会把它描述成所有线上用户的统一结果。

这种回答比编造“线上百万用户 P99”更可靠。

------

# 六十八、综合模拟：面试官连续追问

## 问题一：Vite 为什么快？

> 开发期主要利用浏览器原生 ESM，不需要在启动前完整打包全部业务代码，而是按浏览器请求转换模块；第三方依赖通过预构建解决 CommonJS 兼容和模块碎片问题。文件变化后通过 HMR 只更新受影响模块。

## 问题二：Webpack Loader 和 Plugin 区别？

> Loader 负责转换单个模块内容，例如 TS 转 JS、Sass 转 CSS；Plugin 通过构建钩子干预整个编译生命周期，例如生成 HTML、提取 CSS、上传 Source Map。

## 问题三：Tree Shaking 为什么会失效？

> 可能因为 CommonJS 或动态依赖难以静态分析、模块存在副作用、第三方包没有良好 ESM 输出、整包导入或 sideEffects 配置错误。还要依赖生产优化和压缩器删除死代码。

## 问题四：TypeScript 为什么不能保证接口数据安全？

> TypeScript 类型会在编译后擦除，接口响应仍然是运行时未知数据。类型断言不会验证真实字段，因此外部边界要使用类型守卫或 Schema 校验。

## 问题五：泛型解决什么问题？

> 泛型描述不同位置之间的类型关系。例如请求函数的响应数据类型与调用方传入的类型参数关联，而不是简单用 any 接受所有类型。

## 问题六：微前端解决什么问题？

> 主要解决大型系统中多团队独立开发、构建、发布和技术栈迁移问题。它不是单纯性能方案，会增加路由、样式、通信、依赖和监控复杂度。

## 问题七：qiankun 沙箱能保证安全吗？

> 不能。它主要隔离全局变量和恢复副作用，不是安全沙箱。不可信应用需要 iframe、独立 Origin 和严格消息协议。

## 问题八：Monorepo 和微前端区别？

> Monorepo 是代码仓库组织方式，微前端是运行时和交付架构。多个微前端可以在一个仓库，也可以分布在多个仓库。

## 问题九：前端如何做 CI/CD？

> 提交后自动执行依赖安装、Lint、类型检查、测试、构建、体积和安全检查，生成不可变产物，部署测试环境进行冒烟或 E2E，再灰度发布并观察错误率、性能和业务指标，异常时快速回滚。

## 问题十：为什么要上传 Source Map？

> 生产代码经过压缩和分包，错误堆栈难以直接定位。Source Map 可以根据 release 将压缩位置还原到原始源码，但通常应上传监控平台而不是公开暴露。

------

# 六十九、本章最容易漏掉的 30 个点

1. 工程化不等于构建工具。
2. ESM 导入是只读实时绑定。
3. 动态 import 通常会形成异步 Chunk。
4. Loader 转换模块，Plugin 干预构建生命周期。
5. Vite 开发期不是先完整打包所有业务代码。
6. 依赖预构建还解决模块请求碎片问题。
7. HMR 不等于整页刷新。
8. Tree Shaking 和代码分割解决不同问题。
9. 副作用配置错误可能删除必要 CSS。
10. Chunk 加载失败常与版本发布有关。
11. 语法转换不等于 Polyfill。
12. dependencies 和 devDependencies 不直接决定是否进入浏览器包。
13. peerDependencies 对组件库很重要。
14. Lock 文件保证依赖树一致性。
15. any 是退出类型检查。
16. unknown 使用前必须收窄。
17. never 可用于穷尽检查。
18. TypeScript 类型运行时不存在。
19. 类型断言不会校验接口数据。
20. 可辨识联合可以排除非法业务状态。
21. 微前端沙箱不是安全沙箱。
22. 微前端通信越多，业务边界可能越差。
23. CSS 隔离还要考虑 Portal、Teleport。
24. 微前端与 Monorepo 是不同维度。
25. CI/CD 不只是自动构建。
26. 应尽量一次构建、多环境晋级。
27. 灰度必须结合监控和回滚。
28. 前端环境变量不能存真正秘密。
29. Source Map 必须与 release 对应。
30. 简历性能数字必须有统一测量口径。

------

# 七十、本章十分钟必背答案

> 前端工程化是通过模块化、组件化、规范化和自动化，提高开发效率、代码质量和交付稳定性。它包括模块系统、TypeScript、构建工具、依赖管理、代码规范、测试、CI/CD、监控、灰度和回滚，而不仅是 Webpack 配置。
>
> ES Module 使用 import 和 export，依赖关系通常可以静态分析，导入值是只读实时绑定，因此更适合 Tree Shaking。Webpack 从入口构建模块依赖图，Loader 负责模块转换，Plugin 通过钩子扩展整个构建生命周期。Vite 开发期利用原生 ESM 按需转换业务源码，并通过依赖预构建处理 CommonJS 和过碎依赖，通过 HMR 局部更新模块。
>
> Tree Shaking 删除永远不会使用的代码，代码分割则把仍然需要的代码放到不同 Chunk，在访问路由或功能时再加载。构建优化要避免过度分包，并处理新旧版本不一致造成的 Chunk 加载失败。
>
> TypeScript 的价值是提前发现类型错误、描述模块契约和业务状态。any 会关闭检查，unknown 使用前必须收窄，never 表示不可能状态。泛型用于保留多个位置间的类型关系，可辨识联合可以排除非法业务状态。但 TypeScript 类型会在运行时擦除，接口、WebSocket 和本地存储仍需运行时校验。
>
> 微前端主要解决多团队独立开发和发布问题。qiankun 通过路由激活子应用，执行 bootstrap、mount 和 unmount，并提供一定的全局变量和样式隔离。但它的沙箱不是安全边界，子应用必须正确清理事件、定时器、连接和框架实例。通信应使用稳定业务协议，避免共享巨大 Store。
>
> CI/CD 应将 Lint、类型检查、测试、构建、体积检查、安全扫描和部署变成自动化质量门禁。最好对同一份不可变产物进行环境晋级，生产采用灰度发布，并根据错误率、性能和业务成功率决定继续放量或回滚。
>
> 上线后要同时监控 JavaScript 错误、Promise 异常、接口、性能和核心业务指标。错误事件应携带路由、版本、设备和 Trace ID，Source Map 根据 release 还原源码。完整工程体系的目标，是让问题尽量在开发期发现、发布时可控、上线后可定位、异常时可回滚。

------

# 七十一、最终查漏补缺清单

```text
□ 能解释 CommonJS 和 ES Module
□ 能解释 ESM 实时绑定
□ 能解释动态 import
□ 能讲清 Webpack 模块图
□ 能区分 Loader 和 Plugin
□ 能解释 Vite 开发期为什么快
□ 能解释依赖预构建
□ 能讲清 HMR 流程
□ 能比较 Vite、Webpack、Rollup
□ 能区分 Tree Shaking 与代码分割
□ 能解释 sideEffects
□ 能处理 Chunk 加载失败
□ 能区分语法转换与 Polyfill
□ 能解释 dependencies、peerDependencies
□ 能解释 SemVer 和 Lock 文件
□ 能区分 any、unknown、never
□ 能比较 interface 与 type
□ 能使用可辨识联合
□ 能解释泛型本质
□ 能使用 keyof、typeof、映射类型
□ 能解释条件类型和 infer
□ 能说明 TypeScript 运行时擦除
□ 能设计项目业务分层
□ 能设计统一接口层
□ 能讲清微前端适用场景
□ 能讲清 qiankun 生命周期
□ 能处理路由和静态资源路径
□ 能说明沙箱不是安全隔离
□ 能处理微前端样式和通信
□ 能区分微前端与 Monorepo
□ 能讲清 CI/CD 全流程
□ 能解释一次构建、多环境晋级
□ 能设计灰度和回滚
□ 能设计错误、性能、业务监控
□ 能解释 Source Map 和 release
□ 能经受性能数字追问
□ 能结合长会话、多角色、WebSocket、地图项目回答
```

# 十二章全部完成

当前学习进度：

```text
第1章：JavaScript 执行机制与核心基础          ✅
第2章：数组、对象与数据处理                  ✅
第3章：高频手撕题与工程实现                  ✅
第4章：Promise、事件循环与异步并发           ✅
第5章：Vue3 核心知识                         ✅
第6章：Vue3 响应式、Diff 与最长递增子序列    ✅
第7章：React 核心、Fiber 与 Diff             ✅
第8章：React Hooks、闭包与性能优化           ✅
第9章：浏览器、网络、渲染、缓存与跨域        ✅
第10章：前端性能优化完整体系                 ✅
第11章：XSS、CSRF、JWT 与安全体系            ✅
第12章：工程化、TypeScript、微前端与交付体系  ✅
```

你现在已经完成整套 **12/12 章核心前端面试体系**。接下来最重要的不是继续无边界增加知识，而是把每章的必背答案、项目证明材料和连续追问真正练熟。
