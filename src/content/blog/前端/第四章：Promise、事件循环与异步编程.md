---
title: 第四章：Promise、事件循环与异步编程
slug: di-si-zhang-promise-shi-jian-xun-huan-yu-yi-bu-bian-cheng
description: >-
  你的简历明确写了异步任务、Promise.all 并行请求、WebSocket
  进度推送、并发上传、网络请求竞态和复杂运行态问题排查，因此面试官很可能不会只问“宏任务和微任务是什么”，而是连续追问：
publishDate: '2026-08-02'
category: 前端
tags:
  - JavaScript
  - 浏览器
cover: auto
draft: false
featured: false
toc: true
---
这一章是前端面试的**绝对高频核心章**。

你的简历明确写了异步任务、`Promise.all` 并行请求、WebSocket 进度推送、并发上传、网络请求竞态和复杂运行态问题排查，因此面试官很可能不会只问“宏任务和微任务是什么”，而是连续追问：

- Promise 的回调为什么异步执行？
- `async/await` 后面的代码为什么进入微任务？
- `Promise.all` 失败后其他请求会不会停止？
- 多个接口并行和并发控制有什么区别？
- 为什么旧请求会覆盖新请求？
- `finally` 会不会改变 Promise 状态？
- 微任务太多会发生什么？
- `setTimeout(fn, 0)` 真的是立即执行吗？

------

# 一、本章学习目标

学完后必须做到四件事：

## 🔴 能背

1. 浏览器事件循环的完整过程
2. 宏任务和微任务的区别
3. Promise 的三种状态与状态转换
4. Promise 链式调用原理
5. 值穿透和异常穿透
6. `async/await` 的本质
7. `Promise.all` 等六种组合方法的区别
8. 异步异常如何捕获
9. 请求竞态和取消如何解决
10. 微任务过多为什么可能阻塞页面

## 🟠 能判断

能够准确判断包含以下内容的执行顺序：

- 同步代码
- `setTimeout`
- `Promise.then`
- `queueMicrotask`
- `async/await`
- `requestAnimationFrame`
- Promise 链式返回
- then 中再次创建微任务

## 🟠 能手写

1. `Promise.resolve`
2. `Promise.reject`
3. `Promise.all`
4. `Promise.race`
5. `Promise.allSettled`
6. `Promise.finally`
7. `sleep`
8. Promise 超时控制
9. 顺序执行异步任务
10. 最新请求控制

------

# 二、JavaScript 为什么能处理异步任务

## 1. JavaScript 主线程是单线程

浏览器中的 JavaScript 主线程通常一次只能执行一段 JavaScript 代码。

主线程还承担很多工作：

- 执行 JavaScript
- 处理用户事件
- 计算页面布局
- 绘制页面
- 处理部分浏览器任务

假设网络请求必须由 JavaScript 主线程一直等待：

```text
发送请求
→ 主线程等待 3 秒
→ 页面无法点击
→ 动画停止
→ 请求返回
→ 主线程继续工作
```

页面会非常卡顿。

实际情况是：

```text
JavaScript 发起请求
→ 浏览器网络模块处理请求
→ JavaScript 主线程继续执行
→ 请求完成后将回调安排进任务队列
→ 主线程空闲后执行回调
```

## 2. 异步能力不全由 JavaScript 引擎提供

需要区分三部分：

### JavaScript 引擎

主要负责：

- 执行 JavaScript
- 管理调用栈
- 管理内存
- 垃圾回收

### 浏览器 Web APIs

主要提供：

- 定时器
- 网络请求
- DOM 事件
- WebSocket
- `requestAnimationFrame`
- IntersectionObserver

### 事件循环

负责协调：

- 调用栈
- 任务队列
- 微任务队列
- 页面渲染

## 🔴 标准答案

> JavaScript 主线程通常是单线程的，但浏览器提供了定时器、网络请求、DOM 事件等异步能力。JavaScript 发起异步操作后，相关工作由浏览器模块处理，完成后将对应回调放入任务队列。事件循环会在调用栈清空后，从任务队列中取出任务执行，因此 JavaScript 能够在单线程模型下处理异步任务。

------

# 三、调用栈、任务队列与事件循环

## 1. 调用栈

所有同步代码都在调用栈中执行。

```js
function first() { // 定义第一个函数
  second(); // 在 first 内部调用 second
} // first 函数定义结束

function second() { // 定义第二个函数
  console.log('执行 second'); // 输出执行信息
} // second 函数定义结束

first(); // 调用 first 函数
```

调用栈变化：

```text
全局执行上下文
→ first 入栈
→ second 入栈
→ second 出栈
→ first 出栈
```

------

## 2. 事件循环的核心流程

浏览器一次事件循环，可以先记成：

```text
执行一个宏任务
→ 执行过程中可能产生微任务
→ 当前同步代码执行完
→ 清空全部微任务
→ 浏览器可能进行页面渲染
→ 开始下一个宏任务
```

这里最容易错的是：

> 不是执行一个微任务，而是尽量清空当前微任务队列。

------

# 四、宏任务与微任务

## 1. 常见宏任务

前端面试中常见的宏任务包括：

- 整体脚本 `script`
- `setTimeout`
- `setInterval`
- 用户交互事件
- 网络事件回调
- MessageChannel 消息
- 部分 I/O 回调

整体脚本本身可以理解为第一个宏任务。

------

## 2. 常见微任务

常见微任务包括：

- `Promise.then`
- `Promise.catch`
- `Promise.finally`
- `queueMicrotask`
- `MutationObserver`
- `async/await` 中 `await` 后续代码

注意：

> `new Promise()` 传入的执行器是同步执行的，不是微任务。

------

## 3. 第一套执行顺序题

```js
console.log('1'); // 同步代码，立即输出 1

setTimeout(() => { // 注册一个定时器宏任务
  console.log('2'); // 定时器宏任务执行时输出 2
}, 0); // 延迟设为 0，但不会立即执行

Promise.resolve().then(() => { // 注册一个 Promise 微任务
  console.log('3'); // 微任务执行时输出 3
}); // then 注册结束

console.log('4'); // 同步代码，立即输出 4
```

结果：

```text
1
4
3
2
```

分析：

```text
执行同步代码：1
→ 注册 setTimeout 宏任务
→ 注册 Promise 微任务
→ 执行同步代码：4
→ 当前 script 同步代码结束
→ 清空微任务：3
→ 执行下一个宏任务：2
```

## 📌 一句话记忆

> 同步先执行，微任务随后清空，宏任务下一轮再执行。

------

# 五、Promise 构造函数是同步执行的

这是非常高频的陷阱。

```js
console.log('1'); // 同步输出 1

const promise = new Promise((resolve) => { // 创建 Promise，执行器立即同步执行
  console.log('2'); // 同步输出 2
  resolve('成功'); // 将 Promise 状态修改为 fulfilled
  console.log('3'); // 状态修改后，后续同步代码仍然继续执行
}); // Promise 创建结束

promise.then(() => { // 注册 fulfilled 后执行的微任务
  console.log('4'); // 微任务阶段输出 4
}); // then 注册结束

console.log('5'); // 同步输出 5
```

结果：

```text
1
2
3
5
4
```

## 🔴 必背

> `new Promise(executor)` 中的执行器 `executor` 会立即同步执行；只有通过 `then`、`catch`、`finally` 注册的回调，才会进入微任务队列异步执行。

------

# 六、微任务执行过程中还能继续产生微任务

```js
console.log('1'); // 同步输出 1

Promise.resolve().then(() => { // 注册第一个微任务
  console.log('2'); // 第一个微任务输出 2

  Promise.resolve().then(() => { // 在微任务中注册新的微任务
    console.log('3'); // 新微任务稍后输出 3
  }); // 内层 then 注册结束
}); // 外层 then 注册结束

Promise.resolve().then(() => { // 注册第二个微任务
  console.log('4'); // 第二个微任务输出 4
}); // 第二个 then 注册结束

console.log('5'); // 同步输出 5
```

结果：

```text
1
5
2
4
3
```

为什么不是 `2、3、4`？

最开始微任务队列是：

```text
微任务 A：输出 2
微任务 B：输出 4
```

执行 A 时又加入微任务 C：

```text
微任务 B：输出 4
微任务 C：输出 3
```

微任务一般按照先进先出执行，所以是：

```text
2 → 4 → 3
```

------

# 七、微任务饥饿

如果一个微任务不断创建新的微任务，浏览器可能一直无法进入下一个宏任务和渲染阶段。

```js
function createMicrotask() { // 定义递归创建微任务的函数
  queueMicrotask(() => { // 向微任务队列加入一个任务
    console.log('执行微任务'); // 输出当前微任务信息
    createMicrotask(); // 再次创建新的微任务
  }); // 当前微任务注册结束
} // 函数定义结束

createMicrotask(); // 启动无限微任务链
```

可能导致：

- `setTimeout` 长时间得不到执行
- 页面渲染被推迟
- 用户操作无法及时响应
- 页面看起来卡死

## 🟡 深度回答

> 微任务优先级高并不代表微任务越多越好。浏览器通常会在当前宏任务结束后清空微任务队列。如果微任务持续产生新微任务，可能形成微任务饥饿，延迟后续宏任务和页面渲染。

------

# 八、Promise 的三种状态

Promise 有三种状态：

```text
pending：等待中
fulfilled：已成功
rejected：已失败
```

状态转换只能是：

```text
pending → fulfilled
pending → rejected
```

一旦状态确定，就不能再次改变。

------

## 1. 状态只能改变一次

```js
const promise = new Promise((resolve, reject) => { // 创建 Promise
  resolve('第一次成功'); // 第一次修改状态，Promise 变成 fulfilled
  reject(new Error('失败')); // 状态已经确定，本次调用无效
  resolve('第二次成功'); // 状态已经确定，本次调用无效
}); // Promise 创建结束

promise.then((value) => { // 注册成功回调
  console.log(value); // 输出第一次成功
}); // then 注册结束
```

结果：

```text
第一次成功
```

## 🔴 必背

> Promise 状态具有不可逆性。一旦从 pending 变为 fulfilled 或 rejected，后续调用 resolve 或 reject 都不会再改变状态。

------

# 九、resolve 一个 Promise 时发生什么

`resolve` 不一定代表立即 fulfilled。

如果传入的是另一个 Promise，外层 Promise 会采用内层 Promise 的最终状态。

```js
const innerPromise = new Promise((resolve) => { // 创建内层 Promise
  setTimeout(() => { // 注册定时器
    resolve('内层成功'); // 一秒后让内层 Promise 成功
  }, 1000); // 设置一秒延迟
}); // 内层 Promise 创建结束

const outerPromise = new Promise((resolve) => { // 创建外层 Promise
  resolve(innerPromise); // 外层 Promise 采用内层 Promise 的最终状态
}); // 外层 Promise 创建结束

outerPromise.then((value) => { // 等待外层最终完成
  console.log(value); // 输出内层成功
}); // then 注册结束
```

## 🟡 深度表达

> `resolve(x)` 的语义不是简单地把 Promise 的结果值设置为 x。如果 x 是 Promise 或 thenable，Promise 解析过程会尝试采用它的状态，这称为状态吸收或 thenable assimilation。

------

# 十、thenable 是什么

thenable 是：

> 任何包含可调用 `then` 方法的对象。

它不一定是真正的原生 Promise。

```js
const thenable = { // 创建一个 thenable 对象
  then(resolve) { // 定义 then 方法
    resolve('thenable 成功'); // 调用传入的 resolve
  }, // then 方法定义结束
}; // thenable 对象定义结束

Promise.resolve(thenable).then((value) => { // Promise.resolve 会吸收 thenable 状态
  console.log(value); // 输出 thenable 成功
}); // then 注册结束
```

这是为什么 Promise 实现不能只判断：

```js
value instanceof Promise; // 这种判断无法覆盖其他 Promise 实现和 thenable
```

而需要检查对象是否具有可调用的 `then`。

------

# 十一、then 每次都会返回一个新 Promise

```js
const promise1 = Promise.resolve(1); // 创建成功状态的 Promise

const promise2 = promise1.then((value) => { // then 返回一个全新的 Promise
  return value + 1; // 返回普通值 2
}); // 第一个 then 结束

console.log(promise1 === promise2); // 输出 false，说明不是同一个 Promise
```

这就是 Promise 能够链式调用的基础。

------

# 十二、then 回调返回什么，决定下一个 Promise 的状态

这是 Promise 链最核心的知识。

## 1. 返回普通值

```js
Promise.resolve(1) // 创建值为 1 的成功 Promise
  .then((value) => { // 注册第一个成功回调
    return value + 1; // 返回普通值 2
  }) // 当前 then 返回 fulfilled 状态的新 Promise
  .then((value) => { // 接收上一步的返回值
    console.log(value); // 输出 2
  }); // Promise 链结束
```

规则：

```text
回调返回普通值
→ 下一个 Promise fulfilled
→ 普通值作为成功结果
```

------

## 2. 返回 Promise

```js
Promise.resolve(1) // 创建初始成功 Promise
  .then((value) => { // 注册第一个回调
    return Promise.resolve(value + 1); // 返回另一个成功 Promise
  }) // 链式 Promise 会等待返回的 Promise
  .then((value) => { // 接收内层 Promise 的成功值
    console.log(value); // 输出 2
  }); // Promise 链结束
```

规则：

```text
回调返回 Promise
→ 下一个 Promise 采用该 Promise 的最终状态
```

------

## 3. 抛出异常

```js
Promise.resolve('开始') // 创建成功 Promise
  .then(() => { // 注册成功回调
    throw new Error('执行失败'); // 主动抛出异常
  }) // 返回 rejected 状态的新 Promise
  .catch((error) => { // 捕获上一步异常
    console.log(error.message); // 输出执行失败
  }); // Promise 链结束
```

规则：

```text
回调抛出异常
→ 下一个 Promise rejected
→ 异常作为失败原因
```

------

## 4. 没有 return

```js
Promise.resolve(1) // 创建成功 Promise
  .then((value) => { // 注册第一个回调
    value + 1; // 只计算但没有返回
  }) // 相当于返回 undefined
  .then((value) => { // 接收上一步结果
    console.log(value); // 输出 undefined
  }); // Promise 链结束
```

## 📌 一句话记忆

> Promise 链不是自动传值，真正传给下一步的是当前回调的返回值。

------

# 十三、值穿透

当 `then` 没有传函数时，成功值会继续向后传递。

```js
Promise.resolve(100) // 创建成功值为 100 的 Promise
  .then() // 没有提供回调，成功值向后穿透
  .then(null) // null 不是函数，成功值继续穿透
  .then((value) => { // 接收穿透后的值
    console.log(value); // 输出 100
  }); // Promise 链结束
```

近似理解：

```js
Promise.resolve(100) // 创建成功值为 100 的 Promise
  .then((value) => value) // 默认成功处理函数返回原值
  .then((value) => value) // 再次将原值向后传递
  .then((value) => { // 接收最终值
    console.log(value); // 输出 100
  }); // Promise 链结束
```

------

# 十四、异常穿透

如果中间没有失败处理函数，异常会沿链向后传播，直到被最近的失败处理捕获。

```js
Promise.resolve('开始') // 创建成功 Promise
  .then(() => { // 注册第一个回调
    throw new Error('接口失败'); // 抛出异常
  }) // Promise 变为 rejected
  .then((value) => { // 没有提供失败处理函数
    console.log(value); // 当前成功回调不会执行
  }) // 异常继续向后传播
  .catch((error) => { // 捕获之前的异常
    console.log(error.message); // 输出接口失败
  }); // Promise 链结束
```

## 🔴 标准答案

> Promise 具有值穿透和异常穿透。当 then 对应位置没有提供函数时，成功值或失败原因会继续向后传递。异常会沿 Promise 链传播，直到遇到最近的失败处理函数。

------

# 十五、catch 的本质

下面两种写法在基本语义上相近：

```js
promise.catch((error) => { // 使用 catch 注册失败回调
  console.log(error); // 输出异常
}); // catch 结束
promise.then(undefined, (error) => { // 使用 then 第二个参数处理失败
  console.log(error); // 输出异常
}); // then 结束
```

但链式调用中有重要区别。

------

## then 第二个参数捕获不到同一个 then 成功回调里的错误

```js
Promise.resolve('成功') // 创建成功 Promise
  .then(
    () => { // 当前 then 的成功回调
      throw new Error('成功回调内部报错'); // 在成功回调中抛错
    }, // 成功回调结束
    (error) => { // 当前 then 的失败回调
      console.log('这里捕获不到', error); // 不会捕获同级成功回调产生的错误
    }, // 失败回调结束
  ) // 当前 then 返回新的 rejected Promise
  .catch((error) => { // 下一个 catch 可以捕获
    console.log(error.message); // 输出成功回调内部报错
  }); // Promise 链结束
```

因此工程中通常更推荐：

```js
requestData() // 发起异步请求
  .then((data) => { // 处理成功结果
    return processData(data); // 返回数据处理结果
  }) // 成功处理结束
  .catch((error) => { // 统一捕获请求和数据处理异常
    handleError(error); // 执行统一异常处理
  }); // Promise 链结束
```

------

# 十六、catch 处理后，Promise 可能重新变成成功

```js
Promise.reject(new Error('失败')) // 创建失败 Promise
  .catch((error) => { // 捕获失败
    console.log(error.message); // 输出失败
    return '降级数据'; // 返回普通值
  }) // catch 返回 fulfilled Promise
  .then((value) => { // 进入成功分支
    console.log(value); // 输出降级数据
  }); // Promise 链结束
```

## ⚠️ 高频陷阱

```js
try { // 开始异常捕获
  const result = await requestData(); // 等待请求结果
  return result; // 请求成功时返回结果
} catch (error) { // 捕获请求异常
  console.error(error); // 记录异常
} // catch 结束
```

如果 catch 中没有重新抛错，函数最终会：

```text
fulfilled，结果为 undefined
```

有时会把真正的错误“吞掉”。

需要根据业务决定：

```js
catch (error) { // 捕获异常
  reportError(error); // 上报异常信息
  throw error; // 重新抛出，让上层知道操作失败
} // catch 结束
```

------

# 十七、finally 的真正行为

`finally` 无论成功失败都会执行，通常用于清理资源：

- 关闭 loading
- 恢复按钮状态
- 清理定时器
- 释放锁
- 清理刷新状态

```js
setLoading(true); // 开启加载状态

requestData() // 发起请求
  .then((data) => { // 处理成功结果
    renderData(data); // 渲染数据
  }) // 成功处理结束
  .catch((error) => { // 处理失败结果
    showError(error); // 展示错误
  }) // 失败处理结束
  .finally(() => { // 无论成功失败都会执行
    setLoading(false); // 关闭加载状态
  }); // Promise 链结束
```

------

## 1. finally 不接收前一个结果

```js
Promise.resolve(100) // 创建成功值为 100 的 Promise
  .finally((value) => { // finally 不会接收到成功值
    console.log(value); // 通常输出 undefined
  }) // finally 默认保持原状态和值
  .then((value) => { // 接收原成功值
    console.log(value); // 输出 100
  }); // Promise 链结束
```

------

## 2. finally 默认透传原状态

```js
Promise.reject(new Error('失败')) // 创建失败 Promise
  .finally(() => { // 执行清理逻辑
    console.log('执行清理'); // 输出清理信息
  }) // 默认仍保持 rejected
  .catch((error) => { // 捕获原异常
    console.log(error.message); // 输出失败
  }); // Promise 链结束
```

------

## 3. finally 自己抛错会覆盖原状态

```js
Promise.resolve('原成功结果') // 创建成功 Promise
  .finally(() => { // 执行 finally
    throw new Error('清理失败'); // finally 自己抛出异常
  }) // 整条链变成 rejected
  .catch((error) => { // 捕获 finally 的异常
    console.log(error.message); // 输出清理失败
  }); // Promise 链结束
```

## 🔴 标准答案

> `finally` 无论 Promise 成功或失败都会执行，一般用于清理资源。它默认不会接收前一个结果，也不会改变原 Promise 的状态和值；但如果 finally 自身抛出异常，或者返回一个 rejected Promise，就会用新的失败覆盖原结果。

------

# 十八、手写 Promise.prototype.finally

```js
Promise.prototype.myFinally = function (callback) { // 给 Promise 原型添加 myFinally
  const PromiseConstructor = this.constructor; // 获取当前 Promise 的构造函数

  return this.then( // 通过 then 分别处理成功和失败
    (value) => { // 定义成功处理函数
      return PromiseConstructor.resolve(callback()).then(() => { // 等待清理函数完成
        return value; // 清理成功后继续返回原成功值
      }); // 内层 then 结束
    }, // 成功处理函数结束
    (reason) => { // 定义失败处理函数
      return PromiseConstructor.resolve(callback()).then(() => { // 等待清理函数完成
        throw reason; // 清理成功后继续抛出原失败原因
      }); // 内层 then 结束
    }, // 失败处理函数结束
  ); // 外层 then 结束
}; // myFinally 定义结束
```

为什么要使用 `Promise.resolve(callback())`？

因为 `callback` 可能返回：

- 普通值
- Promise
- thenable

`finally` 需要等待清理任务完成。

------

# 十九、async 函数的本质

## 1. async 函数一定返回 Promise

```js
async function getNumber() { // 定义 async 函数
  return 100; // 返回普通值 100
} // async 函数定义结束

const result = getNumber(); // 调用 async 函数并得到 Promise

console.log(result instanceof Promise); // 输出 true
```

近似等价于：

```js
function getNumber() { // 定义普通函数
  return Promise.resolve(100); // 返回成功状态的 Promise
} // 函数定义结束
```

------

## 2. async 函数抛错会返回 rejected Promise

```js
async function getData() { // 定义 async 函数
  throw new Error('获取失败'); // 抛出异常
} // async 函数定义结束

getData().catch((error) => { // 捕获 async 函数返回的 rejected Promise
  console.log(error.message); // 输出获取失败
}); // catch 结束
```

------

# 二十、await 的本质

可以把：

```js
const result = await promise; // 等待 Promise 完成
console.log(result); // 处理成功结果
```

近似理解成：

```js
Promise.resolve(promise).then((result) => { // 将 await 后续代码放进成功微任务
  console.log(result); // 处理成功结果
}); // then 结束
```

但这只是帮助理解，实际语义更加完整。

## 核心过程

执行到 `await expression` 时：

1. 计算 `expression`
2. 通过类似 `Promise.resolve` 的方式处理结果
3. 暂停当前 async 函数后续执行
4. 当前调用栈继续执行其他同步代码
5. 等待结果完成
6. 将 `await` 后续代码安排为微任务
7. 恢复 async 函数执行

------

# 二十一、async/await 执行顺序题

```js
async function test() { // 定义 async 函数
  console.log('2'); // 调用时同步输出 2
  await Promise.resolve(); // 暂停后续代码，并安排恢复微任务
  console.log('4'); // 恢复微任务执行时输出 4
} // async 函数定义结束

console.log('1'); // 同步输出 1

test(); // 调用 async 函数，函数先同步执行到 await

console.log('3'); // 同步输出 3
```

结果：

```text
1
2
3
4
```

------

# 二十二、await 普通值也会异步恢复

```js
async function test() { // 定义 async 函数
  console.log('A'); // 同步输出 A
  await 100; // 普通值会被类似 Promise.resolve 包装
  console.log('B'); // 后续代码仍进入微任务
} // async 函数定义结束

test(); // 调用函数

console.log('C'); // 同步输出 C
```

结果：

```text
A
C
B
```

## 🔴 必背

> `await` 后面即使是普通值，也会暂停当前 async 函数，后续代码通常以微任务形式恢复执行。

------

# 二十三、await 的错误如何捕获

## 1. try/catch

```js
async function loadData() { // 定义异步加载函数
  try { // 开始异常捕获
    const data = await requestData(); // 等待请求完成
    return data; // 返回请求数据
  } catch (error) { // 捕获同步异常和 Promise 拒绝
    reportError(error); // 上报异常
    throw error; // 重新抛出异常给上层
  } finally { // 无论成功失败都会执行
    setLoading(false); // 关闭加载状态
  } // 异常处理结束
} // 函数定义结束
```

`try/catch` 可以捕获：

- `await` 的 Promise 拒绝
- 当前同步代码抛出的异常
- 前面已经等待到的异步异常

但不能自动捕获没有 `await` 的异步 Promise。

------

## 2. 忘记 await 导致捕获失败

```js
async function loadData() { // 定义异步函数
  try { // 开始 try
    requestData(); // 只启动 Promise，但没有 await 和 return
  } catch (error) { // 尝试捕获异常
    console.log(error); // 通常捕获不到 Promise 的异步拒绝
  } // try/catch 结束
} // 函数定义结束
```

正确方式之一：

```js
async function loadData() { // 定义异步函数
  try { // 开始异常捕获
    await requestData(); // 等待 Promise，使拒绝进入 catch
  } catch (error) { // 捕获请求拒绝
    console.log(error); // 输出异常
  } // try/catch 结束
} // 函数定义结束
```

或者：

```js
function loadData() { // 定义普通函数
  return requestData().catch((error) => { // 直接返回并捕获 Promise
    console.log(error); // 输出异常
    throw error; // 继续向上抛出
  }); // catch 结束
} // 函数定义结束
```

------

# 二十四、串行和并行

这是项目优化中的重点。

## 1. 串行执行

```js
const categories = await getCategories(); // 等待分类接口完成后再继续
const medicines = await getMedicines(); // 分类完成后才开始药品接口
const causes = await getCauses(); // 药品完成后才开始病因接口
```

假设每个接口 1 秒，总时间大约 3 秒。

适用于：

- 后一个任务依赖前一个结果
- 必须严格按顺序执行
- 存在业务状态依赖

------

## 2. 并行执行

```js
const categoriesPromise = getCategories(); // 立即启动分类请求
const medicinesPromise = getMedicines(); // 立即启动药品请求
const causesPromise = getCauses(); // 立即启动病因请求

const [categories, medicines, causes] = await Promise.all([ // 并行等待三个请求
  categoriesPromise, // 分类请求 Promise
  medicinesPromise, // 药品请求 Promise
  causesPromise, // 病因请求 Promise
]); // 并行等待结束
```

假设每个接口 1 秒，总时间接近最慢的那个接口，即约 1 秒。

也可以简写：

```js
const [categories, medicines, causes] = await Promise.all([ // 同时启动并等待多个请求
  getCategories(), // 启动分类请求
  getMedicines(), // 启动药品请求
  getCauses(), // 启动病因请求
]); // Promise.all 结束
```

------

## 3. 错误的“伪并行”

```js
const categories = await getCategories(); // 等待第一个请求完成
const medicines = await getMedicines(); // 再启动第二个请求
const results = await Promise.all([categories, medicines]); // 此时放进去的已经是结果，不再并行
```

## 🔴 标准答案

> 多个任务互不依赖时，应先同时启动，再统一 await，这样总耗时接近最慢任务；如果依赖前一步结果，则必须串行。Promise.all 只能等待已经提供的任务，无法把之前已经串行执行的代码重新变成并行。

------

# 二十五、六种 Promise 组合方法

## 1. Promise.all

规则：

- 全部成功才成功
- 一个失败立即失败
- 结果按输入顺序排列
- 不会取消其他已启动任务

适合：

> 所有数据都是必要依赖。

------

## 2. Promise.allSettled

规则：

- 等待全部结束
- 不会因为单个失败提前结束
- 每项包含状态和结果

```js
const results = await Promise.allSettled([ // 等待全部任务完成
  getWeather(), // 请求天气数据
  getHotels(), // 请求酒店数据
  getRestaurants(), // 请求餐饮数据
]); // allSettled 结束

for (const result of results) { // 遍历每个任务结果
  if (result.status === 'fulfilled') { // 判断当前任务是否成功
    console.log(result.value); // 输出成功结果
  } else { // 进入失败分支
    console.error(result.reason); // 输出失败原因
  } // 状态判断结束
} // 结果遍历结束
```

适合：

> 部分数据允许降级，必须知道每个任务的结果。

例如星途智旅中：

- 行程主数据必须成功
- 天气失败可以展示“暂无天气”
- 推荐餐厅失败可以隐藏模块

------

## 3. Promise.race

规则：

> 第一个确定状态的任务决定结果，不管它成功还是失败。

```js
const result = await Promise.race([ // 竞争多个 Promise
  requestData(), // 真正的数据请求
  timeout(5000), // 五秒超时任务
]); // race 结束
```

适合：

- 超时控制
- 多数据源竞争
- 首个响应

------

## 4. Promise.any

规则：

- 第一个成功的任务决定结果
- 失败会继续等待
- 全部失败才 reject
- 全部失败时通常得到 `AggregateError`

适合：

> 多个镜像源、CDN、备用服务，只需要第一个成功结果。

------

## 5. Promise.resolve

用于：

- 将普通值包装成成功 Promise
- 吸收 Promise 或 thenable 状态
- 统一处理同步值和异步值

------

## 6. Promise.reject

返回一个立即 rejected 的 Promise。

```js
return Promise.reject(new Error('参数错误')); // 创建失败状态 Promise 并返回
```

------

## 对比表

| 方法         | 什么时候成功       | 什么时候失败                             |
| ------------ | ------------------ | ---------------------------------------- |
| `all`        | 全部成功           | 任意一个失败                             |
| `allSettled` | 全部结束后返回结果 | 外层通常不会因单项失败而失败             |
| `race`       | 第一个完成的是成功 | 第一个完成的是失败                       |
| `any`        | 任意一个成功       | 全部失败                                 |
| `resolve`    | 包装或吸收成功状态 | 传入 rejected Promise 时会采用其失败状态 |
| `reject`     | 不成功             | 立即失败                                 |

## 📌 记忆

> all 要全赢，any 只要一赢，race 谁先结束听谁的，allSettled 不管输赢都等完。

------

# 二十六、Promise.race 实现超时控制

## 1. 基础版

```js
function timeout(delay) { // 定义超时 Promise
  return new Promise((resolve, reject) => { // 创建 Promise
    setTimeout(() => { // 创建定时器
      reject(new Error(`请求超过 ${delay}ms`)); // 超时后拒绝 Promise
    }, delay); // 设置超时时间
  }); // Promise 创建结束
} // timeout 函数定义结束

async function requestWithTimeout(requestPromise, delay) { // 定义带超时的请求函数
  return Promise.race([ // 让请求和超时任务竞争
    requestPromise, // 原始请求 Promise
    timeout(delay), // 超时 Promise
  ]); // 返回竞争结果
} // 函数定义结束
```

## 2. race 超时不会真正取消请求

即使超时 Promise 先失败，原网络请求通常还在继续。

所以更完整的实现应该配合 `AbortController`。

```js
async function fetchWithTimeout(url, delay) { // 定义支持取消的超时请求
  const controller = new AbortController(); // 创建请求取消控制器

  const timer = setTimeout(() => { // 创建超时定时器
    controller.abort(); // 超时后取消请求
  }, delay); // 设置超时时间

  try { // 开始请求和异常捕获
    const response = await fetch(url, { // 发起 fetch 请求
      signal: controller.signal, // 传入取消信号
    }); // fetch 配置结束

    return response; // 返回请求响应
  } finally { // 无论成功失败都会执行
    clearTimeout(timer); // 清理超时定时器
  } // try/finally 结束
} // 函数定义结束
```

## 🟡 加分表达

> `Promise.race` 只能让调用方不再等待旧请求，不能自动终止底层工作。超时控制最好同时配合取消信号，否则请求仍然会消耗网络和服务器资源。

------

# 二十七、AbortController 请求取消

```js
const controller = new AbortController(); // 创建取消控制器

fetch('/api/search', { // 发起网络请求
  signal: controller.signal, // 将取消信号传入 fetch
}) // fetch 调用结束
  .then((response) => { // 处理响应
    return response.json(); // 解析 JSON
  }) // 响应处理结束
  .catch((error) => { // 捕获请求异常
    if (error.name === 'AbortError') { // 判断是否主动取消
      console.log('请求已取消'); // 输出取消提示
      return; // 结束异常处理
    } // 取消判断结束

    throw error; // 其他异常继续抛出
  }); // Promise 链结束

controller.abort(); // 主动取消请求
```

适用场景：

- 搜索关键词变化
- 页面切换
- 组件卸载
- 超时控制
- 重复请求
- 用户主动取消上传

------

# 二十八、请求竞态：防抖不能完全解决

场景：

```text
请求 A 先发出，耗时 3 秒
请求 B 后发出，耗时 1 秒
B 先返回并渲染
A 后返回并覆盖 B
```

这是典型的：

> 旧请求覆盖新请求。

------

## 解决方案一：请求编号

```js
let latestRequestId = 0; // 保存最新请求编号

async function search(keyword) { // 定义搜索函数
  const currentRequestId = ++latestRequestId; // 为当前请求生成编号

  const result = await requestSearch(keyword); // 发起搜索请求

  if (currentRequestId !== latestRequestId) { // 判断当前请求是否已经过期
    return; // 过期结果直接忽略
  } // 请求编号判断结束

  renderResult(result); // 只有最新请求才能渲染结果
} // 搜索函数定义结束
```

------

## 解决方案二：取消旧请求

```js
let currentController = null; // 保存当前请求控制器

async function search(keyword) { // 定义搜索函数
  if (currentController !== null) { // 判断是否存在旧请求
    currentController.abort(); // 取消旧请求
  } // 旧请求判断结束

  currentController = new AbortController(); // 创建新请求控制器

  const result = await requestSearch(keyword, { // 发起搜索请求
    signal: currentController.signal, // 传入取消信号
  }); // 请求配置结束

  renderResult(result); // 渲染最新结果
} // 搜索函数定义结束
```

------

## 最稳妥方案

同时使用：

```text
AbortController + 请求编号
```

因为：

- 取消用于节省资源
- 请求编号用于保障最终数据正确
- 部分请求阶段可能已经无法取消
- 部分第三方请求库取消能力不完整

## 📌 高分结论

> 防抖解决的是触发频率，取消解决的是资源浪费，请求编号解决的是结果正确性，三者针对的不是同一个问题。

------

# 二十九、requestAnimationFrame 与事件循环

`requestAnimationFrame` 简称 `rAF`，用于在浏览器下一次绘制前执行回调。

适合：

- 动画更新
- DOM 视觉位置更新
- 合并一帧内的渲染操作
- 滚动视觉效果

```js
function updatePosition() { // 定义位置更新函数
  element.style.transform = 'translateX(100px)'; // 修改元素视觉位置
} // 函数定义结束

requestAnimationFrame(() => { // 请求下一帧绘制前执行
  updatePosition(); // 更新元素位置
}); // rAF 注册结束
```

## rAF 和 setTimeout 的区别

`setTimeout`：

- 按时间安排宏任务
- 不保证与屏幕刷新同步
- 页面在后台时行为可能被限制
- 容易出现丢帧或无效绘制

`requestAnimationFrame`：

- 由浏览器根据绘制节奏调用
- 更适合视觉更新
- 通常在下一帧绘制前执行
- 后台标签页一般会暂停或降低频率

## ⚠️ 不要死背固定顺序

浏览器渲染不是简单固定成：

```text
微任务 → rAF → 渲染 → setTimeout
```

更准确的说法是：

> 每轮事件循环结束并清空微任务后，浏览器会根据刷新时机判断是否需要进行渲染；在渲染更新阶段，会执行符合条件的 `requestAnimationFrame` 回调。

------

# 三十、浏览器一帧大致发生什么

前端面试常见的简化流程：

```text
处理输入事件
→ 执行 JavaScript
→ 清空微任务
→ 执行 requestAnimationFrame
→ 样式计算
→ 布局 Layout
→ 绘制 Paint
→ 合成 Composite
```

但不要把它理解成每一轮事件循环都一定完整渲染。

浏览器会根据：

- 屏幕刷新率
- 页面是否可见
- 是否存在视觉变化
- 当前任务是否太长

决定渲染时机。

------

# 三十一、长任务为什么卡页面

浏览器常见刷新率是 60Hz 时，每帧预算大约 16.7ms。

如果一段 JavaScript 同步执行 200ms：

```js
const startTime = Date.now(); // 记录开始时间

while (Date.now() - startTime < 200) { // 持续阻塞主线程约 200 毫秒
  Math.random(); // 执行无意义计算模拟耗时任务
} // 长循环结束
```

这期间：

- 用户点击不能及时处理
- 页面不能及时渲染
- 动画发生卡顿
- 输入响应延迟
- INP 变差

## 解决思路

- 拆分任务
- 使用 `setTimeout` 或调度 API 让出主线程
- 使用 Web Worker
- 降低计算量
- 分片渲染
- 使用虚拟列表
- 避免微任务无限递归

------

# 三十二、分片执行大量任务

假设需要处理十万条数据。

```js
function processInChunks(items, chunkSize) { // 定义分片处理函数
  let currentIndex = 0; // 保存当前处理位置

  function processChunk() { // 定义单个分片处理函数
    const endIndex = Math.min( // 计算当前分片结束位置
      currentIndex + chunkSize, // 当前索引加分片大小
      items.length, // 不超过数组总长度
    ); // 结束位置计算完成

    while (currentIndex < endIndex) { // 处理当前分片中的数据
      processItem(items[currentIndex]); // 处理当前元素
      currentIndex += 1; // 索引向后移动
    } // 当前分片处理结束

    if (currentIndex < items.length) { // 判断是否还有剩余数据
      setTimeout(processChunk, 0); // 将下一分片放到后续宏任务，让出主线程
    } // 剩余数据判断结束
  } // processChunk 定义结束

  processChunk(); // 启动分片处理
} // processInChunks 定义结束
```

## 🟡 深度

为什么不是 `queueMicrotask(processChunk)`？

因为微任务会在进入下一宏任务和渲染前持续清空。

使用微任务分片，仍可能阻塞渲染。

使用宏任务分片，浏览器才有机会在任务之间处理输入和渲染。

## 📌 高分表达

> 切片不只是把一个循环拆成多个函数，还要选择能够真正让出主线程的调度方式。使用递归微任务可能仍然阻塞渲染；宏任务、调度 API 或 Web Worker 才更适合长任务拆分。

------

# 三十三、Web Worker 解决什么问题

Web Worker 可以将部分计算任务放到独立线程执行。

适合：

- 大量数据计算
- 图片处理
- 复杂数据转换
- 文件解析
- 加密解密
- 路径计算

不适合：

- 直接操作 DOM
- 很小的任务
- 频繁传输超大对象但没有使用 Transferable
- 需要大量共享可变状态的逻辑

主线程和 Worker 通过消息通信，不共享普通 JavaScript 对象。

## 🔴 面试回答

> Web Worker 可以把 CPU 密集型计算移出主线程，避免阻塞用户交互和页面渲染。但 Worker 不能直接访问 DOM，并且线程创建、消息序列化和数据传输都有成本，所以更适合计算量较大的任务，而不是所有异步任务。

------

# 三十四、未处理的 Promise 拒绝

```js
Promise.reject(new Error('请求失败')); // 创建失败 Promise，但没有 catch
```

浏览器可能触发：

```text
unhandledrejection
```

可以进行全局监听：

```js
window.addEventListener('unhandledrejection', (event) => { // 监听未处理的 Promise 拒绝
  console.error('未处理的异步异常：', event.reason); // 记录失败原因
}); // 事件监听结束
```

同步错误通常对应：

```js
window.addEventListener('error', (event) => { // 监听全局同步错误和资源错误
  console.error('页面错误：', event.error); // 记录异常对象
}); // 事件监听结束
```

## 🟡 工程深度

全局监听是兜底，不是替代局部异常处理。

好的异常体系需要区分：

- 用户提示
- 日志上报
- 业务降级
- 请求重试
- 登录失效
- 未知程序异常

不能所有错误都统一弹出“系统异常”。

------

# 三十五、异步循环陷阱

## 1. forEach 不会等待 async 回调

```js
const ids = [1, 2, 3]; // 创建 ID 数组

ids.forEach(async (id) => { // forEach 不会等待 async 回调完成
  const result = await requestById(id); // 异步请求当前 ID
  console.log(result); // 请求完成后输出结果
}); // forEach 调用结束

console.log('全部完成'); // 这行通常会提前执行
```

为什么？

`forEach` 不关心回调返回的 Promise。

------

## 2. 串行执行

```js
for (const id of ids) { // 依次遍历每个 ID
  const result = await requestById(id); // 等待当前请求完成
  console.log(result); // 输出当前请求结果
} // 串行循环结束

console.log('全部完成'); // 所有请求完成后输出
```

------

## 3. 并行执行

```js
const results = await Promise.all( // 并行等待所有请求
  ids.map((id) => { // 将每个 ID 转换成 Promise
    return requestById(id); // 返回当前请求 Promise
  }), // map 结束
); // Promise.all 结束

console.log(results); // 输出全部结果
```

## 🔴 标准答案

> `forEach` 不会等待 async 回调，因为它不会消费回调返回的 Promise。需要串行时使用 `for...of + await`，需要并行时使用 `map` 生成 Promise 数组再配合 `Promise.all`，需要限制并发时使用并发池。

------

# 三十六、await 放在循环中一定不好吗

不一定。

下面的说法是错误的：

> 循环里绝对不能使用 await。

应该看任务是否存在依赖。

### 必须串行

```text
登录
→ 获取 Token
→ 使用 Token 获取用户信息
```

### 可以并行

```text
分类数据
药品数据
病因数据
```

### 需要限流并行

```text
上传 100 张图片
批量调用 500 个接口
```

## 高分回答

> 是否在循环中 await 取决于任务依赖和资源限制。独立任务可以并行；强依赖任务必须串行；数量很大的独立任务不应该无限 Promise.all，而应该限制并发。性能优化不能只追求“全部并行”，还要考虑服务器容量、浏览器连接数和失败策略。

------

# 三十七、顺序执行 Promise 任务

## reduce 版本

```js
async function runTasksInSequence(tasks) { // 定义串行任务执行函数
  return tasks.reduce((previousPromise, currentTask) => { // 使用 reduce 串联任务
    return previousPromise.then(async (results) => { // 等待前一个任务完成
      const currentResult = await currentTask(); // 执行当前任务
      results.push(currentResult); // 保存当前任务结果
      return results; // 将结果传给下一轮
    }); // then 结束
  }, Promise.resolve([])); // 初始值为成功状态的空数组
} // 函数定义结束
```

## 更易读的 for...of 版本

```js
async function runTasksInSequence(tasks) { // 定义串行任务执行函数
  const results = []; // 创建结果数组

  for (const task of tasks) { // 依次遍历任务
    const result = await task(); // 等待当前任务完成
    results.push(result); // 保存当前结果
  } // 任务循环结束

  return results; // 返回全部结果
} // 函数定义结束
```

## 面试加分

> `reduce` 可以体现 Promise 链式串行原理，但业务代码中 `for...of + await` 往往可读性更好。不是代码越炫越专业，清晰和可维护性更重要。

------

# 三十八、WebSocket 和 Promise 的关系

WebSocket 与普通 Promise 请求不同。

HTTP Promise 通常代表：

> 一个任务最终成功或失败一次。

WebSocket 是：

> 持续产生多次消息的长连接。

因此不能简单地用一个 Promise 表达整个 WebSocket 生命周期。

更适合使用：

- 事件监听
- EventEmitter
- Observable
- 状态机
- 回调订阅

建立连接阶段可以包装为 Promise：

```js
function connectWebSocket(url) { // 定义 WebSocket 连接函数
  return new Promise((resolve, reject) => { // 用 Promise 表达首次连接结果
    const socket = new WebSocket(url); // 创建 WebSocket 实例

    socket.addEventListener('open', () => { // 监听连接成功
      resolve(socket); // 成功时返回 socket
    }, { once: true }); // 只监听一次 open

    socket.addEventListener('error', (error) => { // 监听连接错误
      reject(error); // 连接失败时拒绝 Promise
    }, { once: true }); // 只监听一次 error
  }); // Promise 创建结束
} // 函数定义结束
```

但后续消息仍应通过事件监听处理。

------

# 三十九、针对你简历的深度项目拷打

## 1. 面试官：为什么使用 Promise.all 优化接口请求？

推荐回答：

> 页面中的分类、药品和病因接口互不依赖，如果串行 await，总耗时是各接口耗时之和。我改为同时启动后通过 Promise.all 等待，总耗时接近最慢接口。但我不会为了并行而无脑并行：必要依赖使用 Promise.all，非核心模块允许失败时使用 allSettled，请求数量过大时使用并发池，避免瞬间压垮服务端。

------

## 2. 面试官：Promise.all 一个失败后，其他请求会停吗？

推荐回答：

> 不会。Promise.all 只是让外层 Promise 快速进入 rejected，其他已经启动的请求仍可能继续执行。如果业务要求失败后停止剩余请求，需要让任务支持 AbortController，并在失败后主动调用 abort。

------

## 3. 面试官：你怎么处理弹窗数据短暂显示后又消失？

推荐回答：

> 我会优先怀疑异步竞态和生命周期覆盖。比如手动查询先返回并展示数据，但组件初始化自动查询后返回空数据，覆盖了当前结果。我会给请求加来源日志、请求编号和时间戳，确认触发顺序；正确性上只允许最新请求提交状态，资源层再通过 AbortController 取消过期请求，同时检查 loading、空态和组件卸载后的状态更新。

------

## 4. 面试官：为什么长对话加载可以从 4.2 秒降到 1.7 秒？

结合异步部分可以回答：

> 核心不是让所有历史消息一次性更快返回，而是改变首屏关键路径。我会优先请求最近一段消息并立即渲染，历史消息异步分层加载；互不依赖的数据并行请求；流式内容到达后增量展示，而不是等待完整答案；对 Markdown 解析和 DOM 更新做批处理，避免每个字符都触发完整渲染。这里要区分接口总耗时和用户感知首屏时间，1.7 秒更可能是首屏可用时间。

------

## 5. 面试官：WebSocket 进度消息乱序怎么办？

推荐回答：

> 我会给任务和消息增加 `taskId`、序号或版本号。前端按任务隔离状态，只处理序号大于当前版本的消息；关键状态变更使用状态机校验，避免从已完成退回进行中。断线重连后还需要通过 HTTP 查询任务最终状态，不能完全依赖 WebSocket 消息补齐。

------

## 6. 面试官：异步任务越多，Promise.all 越好吗？

推荐回答：

> 不是。Promise.all 适合数量可控且互相独立的任务。大量任务全部并行会争抢浏览器连接、带宽和服务端资源，还可能造成失败重试风暴。任务较多时我会设置并发上限，根据任务类型选择 fail-fast 或 all-settled，并加入取消、重试和超时机制。

------

# 四十、本章最容易答错的 15 个点

1. `new Promise` 的执行器是同步执行的。
2. `then` 回调才是微任务。
3. `setTimeout(fn, 0)` 不是立即执行。
4. 当前宏任务结束后会清空微任务，而不是只执行一个。
5. 微任务持续产生微任务可能阻塞渲染。
6. `then` 每次都返回新 Promise。
7. Promise 链传递的是回调返回值。
8. catch 返回普通值后，链会恢复成成功状态。
9. finally 默认透传原状态，但自身抛错会覆盖原状态。
10. async 函数一定返回 Promise。
11. await 普通值后面的代码也异步恢复。
12. `forEach` 不会等待 async 回调。
13. `Promise.all` 失败不会自动取消其他请求。
14. `Promise.race` 超时不会自动终止底层请求。
15. 防抖无法独立解决请求竞态。

------

# 四十一、本章必背标准答案

## 1. 事件循环是什么？

> JavaScript 主线程通过调用栈执行同步代码，浏览器负责处理定时器、网络请求和事件等异步任务。异步任务完成后，相应回调进入任务队列。当前宏任务同步代码执行完后，浏览器会清空微任务队列，再根据时机进行渲染并执行下一个宏任务，这套协调机制就是事件循环。

## 2. 宏任务和微任务有什么区别？

> 宏任务包括整体脚本、定时器和用户事件等；微任务包括 Promise.then、queueMicrotask 和 await 后续代码等。一个宏任务执行结束后，浏览器会优先清空当前微任务队列，再进入后续渲染或下一个宏任务。

## 3. Promise 为什么能链式调用？

> 因为 then 每次都会返回一个新的 Promise。回调返回普通值时，新 Promise 成功；返回 Promise 或 thenable 时，新 Promise 会采用其最终状态；抛出异常时，新 Promise 失败。

## 4. async/await 的本质是什么？

> async 函数一定返回 Promise。执行到 await 时，会处理 await 后的值，暂停当前 async 函数的后续执行，让出当前调用栈；当等待结果确定后，再通过微任务恢复 await 后面的代码。它本质上是 Promise 链式调用的语法糖，但提供了更接近同步代码的写法。

## 5. Promise.all 和 allSettled 怎么选？

> 所有任务都是必要依赖、任一失败都无法继续时使用 Promise.all；部分任务允许失败、需要收集每项结果并进行降级时使用 Promise.allSettled。

## 6. 为什么 Promise.all 不能无限并发？

> Promise.all 会立即启动已经创建的所有任务，大量请求会争抢网络和服务器资源。任务数量较大时应该通过任务工厂和并发池控制同时运行数量。

------

# 四十二、本章自测题

## 执行顺序题一

```js
console.log('1'); // 同步输出 1

setTimeout(() => { // 注册定时器宏任务
  console.log('2'); // 宏任务输出 2
}, 0); // 定时器注册结束

Promise.resolve() // 创建成功 Promise
  .then(() => { // 注册第一个微任务
    console.log('3'); // 第一个微任务输出 3
  }) // 第一个 then 结束
  .then(() => { // 第一个 then 完成后注册后续微任务
    console.log('4'); // 后续微任务输出 4
  }); // 第二个 then 结束

queueMicrotask(() => { // 注册另一个微任务
  console.log('5'); // 微任务输出 5
}); // queueMicrotask 注册结束

console.log('6'); // 同步输出 6
```

答案：

```text
1
6
3
5
4
2
```

------

## 执行顺序题二

```js
async function test() { // 定义 async 函数
  console.log('2'); // 同步输出 2
  await Promise.resolve(); // 安排 async 恢复微任务
  console.log('5'); // 恢复后输出 5
} // test 定义结束

console.log('1'); // 同步输出 1

test(); // 调用 test 并执行到 await

Promise.resolve().then(() => { // 注册 Promise 微任务
  console.log('4'); // 输出 4
}); // then 注册结束

console.log('3'); // 同步输出 3
```

答案：

```text
1
2
3
5
4
```

因为 `await` 恢复微任务先于后面的 `Promise.then` 注册。

------

## 口述题

1. JavaScript 单线程为什么还能处理网络请求？
2. `new Promise` 中哪些代码同步执行？
3. 一轮事件循环大致如何执行？
4. 为什么微任务可能造成页面卡顿？
5. `then` 返回普通值、Promise、异常时分别发生什么？
6. 什么是值穿透和异常穿透？
7. catch 为什么可能把错误吞掉？
8. finally 会改变 Promise 状态吗？
9. async 函数为什么一定返回 Promise？
10. await 普通值为什么仍然会异步恢复？
11. `forEach(async () => {})` 有什么问题？
12. 串行、并行、限流并行分别适合什么场景？
13. Promise.all 失败后如何取消其他请求？
14. race 超时为什么不等于请求取消？
15. 防抖、取消和请求编号分别解决什么问题？
16. WebSocket 为什么不能只用一个 Promise 表达？
17. 长任务为什么会影响 INP？
18. 为什么用微任务切片不能很好地让出渲染机会？

------

# 四十三、本章最终背诵总结

> JavaScript 主线程通过调用栈执行同步代码，浏览器负责处理定时器、网络请求和用户事件。异步任务完成后，回调进入对应队列。每个宏任务执行结束后，浏览器会清空微任务队列，再根据时机进行页面渲染并进入下一个宏任务。Promise.then、queueMicrotask 和 await 后续代码属于微任务，setTimeout 和事件回调通常属于宏任务。
>
> Promise 有 pending、fulfilled 和 rejected 三种状态，状态一旦确定就不可逆。then 每次都会返回新的 Promise，回调返回普通值时下一个 Promise 成功，返回 Promise 时采用其状态，抛出异常时下一个 Promise 失败。异常可以沿链穿透，catch 处理后如果返回普通值，Promise 会恢复为成功状态。
>
> async 函数一定返回 Promise。await 会暂停当前 async 函数后续执行，在等待结果确定后通过微任务恢复。互不依赖的任务应该并行启动，存在依赖的任务必须串行，任务数量很大时需要限制并发。
>
> Promise.all 任一失败会让外层快速失败，但不会取消其他已开始任务；Promise.race 实现的超时也不会终止底层请求。生产环境应根据业务组合 AbortController、请求编号、并发控制、超时、重试和降级策略。防抖控制触发频率，取消减少资源消耗，请求编号保证最新数据不被旧结果覆盖。
