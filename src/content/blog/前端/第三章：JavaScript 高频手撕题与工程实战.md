---
title: 第三章：JavaScript 高频手撕题与工程实战
slug: di-san-zhang-javascript-gao-pin-shou-si-ti-yu-gong-cheng-shi-zhan
description: 这一章是区分“会背八股”和“真正能写代码”的关键。
publishDate: '2026-08-02'
category: 前端
tags:
  - React
  - Vue
  - JavaScript
  - Node.js
  - 浏览器
  - 算法
cover: auto
draft: false
featured: false
toc: true
---
这一章是区分“会背八股”和“真正能写代码”的关键。

你的简历里涉及防抖、并发请求、失败重试、Token 无感刷新、WebSocket、图片上传、长会话加载、`Promise.all` 和 `Map` 查询优化。面试官不会只让你背定义，很可能会让你现场写核心实现，再追问边界条件和项目应用。

------

# 一、本章学习目标

本章共分为 **四个梯队、16 道手撕题**。

## 第一梯队：必须独立写出

1. 防抖 `debounce`
2. 节流 `throttle`
3. 深拷贝 `deepClone`
4. 手写 `Promise.all`
5. Promise 并发控制
6. Promise 失败重试
7. 发布订阅 `EventEmitter`
8. 数组转树

## 第二梯队：必须理解原理并能写核心版

1. 手写 `call`
2. 手写 `apply`
3. 手写 `bind`
4. 手写 `new`
5. 手写 `instanceof`
6. LRU 缓存

## 第三梯队：简历加分题

1. 只保留最后一次请求
2. Token 无感刷新并发控制

## 第四梯队：理解即可

- 函数柯里化
- compose 函数组合
- 千分位格式化
- 大数相加
- 带过期时间的 localStorage
- JSONP

------

# 二、面试手撕题的满分答题顺序

拿到题目不要立即埋头写。

先按下面五步回答。

## 第一步：确认需求

例如面试官说：

> 手写一个防抖。

你应该先确认：

> 是普通尾部执行防抖，还是需要支持立即执行、取消和手动触发？

这不是拖延，而是在确定边界。

## 第二步：讲核心思路

例如防抖：

> 我会利用闭包保存定时器。每次调用时先清理旧定时器，再创建新定时器，因此连续触发时只有最后一次会真正执行。

## 第三步：先写核心版

保证主体逻辑正确，不要一开始就堆所有功能。

## 第四步：主动补边界

主动说出：

- 如何保存 `this`
- 如何保存参数
- 是否保留返回值
- 如何取消
- 异常怎么处理
- 空输入怎么处理
- 是否修改原数据

## 第五步：分析复杂度和应用场景

例如：

> 这个并发池对每个任务只处理一次，整体调度复杂度是 O(n)，额外结果空间是 O(n)。

## 📌 面试记忆

> 先问边界，再讲思路；先写主干，再补异常；最后分析复杂度和项目场景。

------

# 三、防抖 debounce

## 1. 防抖解决什么问题

假设用户在搜索框连续输入：

```text
v
vu
vue
vue3
```

如果每次输入都发请求，会产生四次请求。

防抖的目标是：

> 用户停止操作一段时间后，只执行最后一次。

适用场景：

- 搜索框联想
- 表单校验
- 窗口大小调整
- 富文本自动保存
- 防止按钮连续提交

------

## 2. 最基础版本

```js
// 定义防抖函数
function debounce(callback, delay) {
  // 使用闭包保存定时器编号
  let timer = null;

  // 返回真正绑定到事件上的函数
  return function debounced(...args) {
    // 保存调用当前函数时的 this
    const context = this;

    // 清除上一次尚未执行的定时器
    clearTimeout(timer);

    // 重新创建一个定时器
    timer = setTimeout(() => {
      // 使用原来的 this 和参数执行目标函数
      callback.apply(context, args);
    }, delay);
  };
}
```

使用：

```js
// 定义搜索处理函数
function handleSearch(keyword) {
  // 输出最终需要搜索的关键词
  console.log('搜索关键词：', keyword);
}

// 创建延迟 500 毫秒的防抖函数
const debouncedSearch = debounce(handleSearch, 500);

// 模拟用户连续输入
debouncedSearch('v');

// 再次调用会清理上一个定时器
debouncedSearch('vu');

// 最终只有这一次会执行
debouncedSearch('vue');
```

------

## 3. 为什么一定要用闭包

`debounce` 执行结束后，理论上局部变量应该结束生命周期。

但返回的 `debounced` 函数仍然引用 `timer`，因此 `timer` 会被保留下来。

这正是闭包的典型应用：

> 保存多次函数调用之间需要共享的状态。

------

## 4. 面试加分完整版

支持：

- 首次立即执行
- 停止操作后执行
- `cancel`
- `flush`
- 保留 `this`
- 保留参数
- 保留同步返回值

```js
// 定义增强版防抖函数
function debounce(callback, delay, options = {}) {
  // 从配置中读取是否立即执行
  const {
    leading = false,
    trailing = true,
  } = options;

  // 保存当前定时器
  let timer = null;

  // 保存最后一次调用参数
  let lastArgs = null;

  // 保存最后一次调用时的 this
  let lastContext = null;

  // 保存最近一次函数执行结果
  let result;

  // 封装真正执行目标函数的逻辑
  function invokeCallback() {
    // 保存本次执行需要使用的参数
    const currentArgs = lastArgs;

    // 保存本次执行需要使用的 this
    const currentContext = lastContext;

    // 清空旧参数引用，减少无意义内存占用
    lastArgs = null;

    // 清空旧 this 引用
    lastContext = null;

    // 执行目标函数并保存返回结果
    result = callback.apply(currentContext, currentArgs);

    // 返回目标函数执行结果
    return result;
  }

  // 定义真正对外暴露的防抖函数
  function debounced(...args) {
    // 保存最新一次调用参数
    lastArgs = args;

    // 保存最新一次调用时的 this
    lastContext = this;

    // 判断本次是否应该立即执行
    const shouldInvokeLeading =
      leading && timer === null;

    // 如果已经存在定时器，则清理旧定时器
    if (timer !== null) {
      // 清除旧定时器
      clearTimeout(timer);
    }

    // 创建新的尾部定时器
    timer = setTimeout(() => {
      // 标记当前防抖等待周期已经结束
      timer = null;

      // 如果允许尾部执行，并且存在未处理参数
      if (trailing && lastArgs !== null) {
        // 执行最后一次调用
        invokeCallback();
      }
    }, delay);

    // 如果需要首次立即执行
    if (shouldInvokeLeading) {
      // 立即执行目标函数
      invokeCallback();
    }

    // 返回最近一次同步执行结果
    return result;
  }

  // 添加取消方法
  debounced.cancel = function cancel() {
    // 判断是否存在定时器
    if (timer !== null) {
      // 清除当前定时器
      clearTimeout(timer);
    }

    // 重置定时器状态
    timer = null;

    // 清空参数引用
    lastArgs = null;

    // 清空 this 引用
    lastContext = null;
  };

  // 添加立即执行剩余任务的方法
  debounced.flush = function flush() {
    // 判断是否存在等待中的定时器
    if (timer !== null) {
      // 清除等待中的定时器
      clearTimeout(timer);

      // 重置定时器状态
      timer = null;

      // 如果还有未处理调用
      if (lastArgs !== null) {
        // 立即执行目标函数
        return invokeCallback();
      }
    }

    // 没有剩余任务时返回最近结果
    return result;
  };

  // 返回增强后的防抖函数
  return debounced;
}
```

------

## 5. 高频追问

### 为什么使用 `apply`？

因为要同时保留：

- 原调用者的 `this`
- 原调用参数

```js
// 使用 apply 保留 this 和参数
callback.apply(context, args);
```

### 防抖能保证请求顺序吗？

不能。

防抖只能减少请求数量。已经发出的请求仍可能乱序返回。

还要结合：

- `AbortController`
- 请求序号
- 只接收最后一次结果

### 防抖适不适合滚动监听？

通常不适合。

滚动监听需要持续得到反馈，更适合节流。

------

## 🔴 防抖标准答案

> 防抖是连续触发事件时不断重置定时器，只有停止触发达到指定时间后才执行最后一次。它通过闭包保存 timer，适合搜索框、表单校验和自动保存。完整实现还要考虑 this、参数、立即执行、取消和尾部执行。防抖只能减少触发次数，不能独立解决异步请求竞态。

------

# 四、节流 throttle

## 1. 节流解决什么问题

节流的目标是：

> 无论事件触发多频繁，一段时间内最多执行一次。

适用场景：

- 页面滚动
- 鼠标移动
- 拖拽
- 浏览器缩放
- 高频数据上报
- 可视化大屏事件处理

------

## 2. 时间戳版

特点：

- 第一次立即执行
- 最后一次可能不执行

```js
// 定义时间戳版节流函数
function throttle(callback, delay) {
  // 保存上一次真正执行的时间
  let previousTime = 0;

  // 返回节流后的函数
  return function throttled(...args) {
    // 获取当前时间
    const currentTime = Date.now();

    // 判断是否已经达到执行间隔
    if (currentTime - previousTime >= delay) {
      // 更新最近执行时间
      previousTime = currentTime;

      // 保留当前 this 和参数执行目标函数
      callback.apply(this, args);
    }
  };
}
```

------

## 3. 定时器版

特点：

- 第一次不会立即执行
- 最后一次通常可以执行

```js
// 定义定时器版节流函数
function throttle(callback, delay) {
  // 保存定时器编号
  let timer = null;

  // 返回节流后的函数
  return function throttled(...args) {
    // 当前已经存在定时器时直接跳过
    if (timer !== null) {
      // 结束当前调用
      return;
    }

    // 保存当前调用时的 this
    const context = this;

    // 创建定时器
    timer = setTimeout(() => {
      // 执行目标函数
      callback.apply(context, args);

      // 当前时间窗口结束，允许再次执行
      timer = null;
    }, delay);
  };
}
```

------

## 4. 时间戳加定时器完整版

```js
// 定义增强版节流函数
function throttle(callback, delay, options = {}) {
  // 读取首次和尾部执行配置
  const {
    leading = true,
    trailing = true,
  } = options;

  // 保存上一次执行时间
  let previousTime = 0;

  // 保存尾部定时器
  let timer = null;

  // 保存最后一次参数
  let lastArgs = null;

  // 保存最后一次 this
  let lastContext = null;

  // 保存最近执行结果
  let result;

  // 定义真正执行函数
  function invokeCallback(time) {
    // 更新最近执行时间
    previousTime = time;

    // 保存当前参数
    const currentArgs = lastArgs;

    // 保存当前 this
    const currentContext = lastContext;

    // 清空旧参数引用
    lastArgs = null;

    // 清空旧 this 引用
    lastContext = null;

    // 执行目标函数
    result = callback.apply(currentContext, currentArgs);

    // 返回执行结果
    return result;
  }

  // 定义节流后的函数
  function throttled(...args) {
    // 获取当前时间
    const currentTime = Date.now();

    // 首次不立即执行时，将当前时间作为起点
    if (previousTime === 0 && !leading) {
      // 设置节流起始时间
      previousTime = currentTime;
    }

    // 计算距离下一次允许执行还剩多少时间
    const remaining =
      delay - (currentTime - previousTime);

    // 保存最新参数
    lastArgs = args;

    // 保存最新 this
    lastContext = this;

    // 已经达到执行时间，或系统时间发生明显回拨
    if (remaining <= 0 || remaining > delay) {
      // 如果存在尾部定时器
      if (timer !== null) {
        // 清理尾部定时器
        clearTimeout(timer);

        // 重置定时器状态
        timer = null;
      }

      // 立即执行目标函数
      invokeCallback(currentTime);
    } else if (timer === null && trailing) {
      // 如果允许尾部执行，则创建尾部定时器
      timer = setTimeout(() => {
        // 首次不执行时重置为 0
        previousTime = leading ? Date.now() : 0;

        // 清空定时器状态
        timer = null;

        // 判断是否存在最后一次调用
        if (lastArgs !== null) {
          // 执行最后一次调用
          invokeCallback(Date.now());
        }
      }, remaining);
    }

    // 返回最近执行结果
    return result;
  }

  // 添加取消方法
  throttled.cancel = function cancel() {
    // 判断是否存在定时器
    if (timer !== null) {
      // 清除定时器
      clearTimeout(timer);
    }

    // 重置定时器
    timer = null;

    // 重置上次执行时间
    previousTime = 0;

    // 清空参数
    lastArgs = null;

    // 清空 this
    lastContext = null;
  };

  // 返回节流函数
  return throttled;
}
```

------

# 五、防抖和节流怎么区分

| 对比             | 防抖           | 节流             |
| ---------------- | -------------- | ---------------- |
| 核心             | 停止触发后执行 | 固定时间最多一次 |
| 连续触发         | 不断推迟       | 按频率持续执行   |
| 搜索框           | 适合           | 一般不选         |
| 滚动监听         | 一般不选       | 适合             |
| 窗口缩放结束处理 | 适合           | 也可使用         |
| 拖拽位置更新     | 不适合         | 适合             |

## 📌 一句话记忆

> 防抖是“你不动了我再做”，节流是“你一直动我也按固定频率做”。

## 面试加分回答

> 两者都属于高频事件限流，但防抖强调合并连续操作，只保留最后一次；节流强调限制执行频率，保证一段时间内仍有持续反馈。选择时要看业务是关心最终结果，还是关心过程反馈。

------

# 六、手写 Promise.all

这是最常考的 Promise 手撕题。

## 1. 必须满足的行为

`Promise.all` 应满足：

1. 接收可迭代对象
2. 普通值自动包装
3. 结果顺序与输入顺序一致
4. 全部成功才成功
5. 一个失败立即失败
6. 空数组直接得到 `[]`

------

## 2. 核心实现

```js
// 定义手写 Promise.all
function promiseAll(iterable) {
  // 返回一个新的 Promise
  return new Promise((resolve, reject) => {
    // 将可迭代对象转换成数组
    const items = Array.from(iterable);

    // 创建与输入等长的结果数组
    const results = new Array(items.length);

    // 保存已经完成的任务数量
    let completedCount = 0;

    // 空输入直接成功
    if (items.length === 0) {
      // 返回空数组
      resolve([]);

      // 结束当前执行
      return;
    }

    // 遍历所有输入项
    items.forEach((item, index) => {
      // 使用 Promise.resolve 兼容普通值和 Promise
      Promise.resolve(item)
        .then((value) => {
          // 按照原始索引保存结果
          results[index] = value;

          // 已完成数量加一
          completedCount += 1;

          // 判断是否全部完成
          if (completedCount === items.length) {
            // 返回最终结果数组
            resolve(results);
          }
        })
        .catch((error) => {
          // 任意一个失败时立即拒绝
          reject(error);
        });
    });
  });
}
```

------

## 3. 为什么不能直接 `push`

错误思路：

```js
// 不推荐：按照完成顺序加入结果
results.push(value);
```

假设：

- 第一个任务 3 秒完成
- 第二个任务 1 秒完成
- 第三个任务 2 秒完成

如果使用 `push`，结果会变成完成顺序，而不是输入顺序。

正确做法：

```js
// 使用原始索引保存结果
results[index] = value;
```

------

## 4. fail-fast 真的能取消其他请求吗

不能。

`Promise.all` 在一个任务失败后，会立即将外层 Promise 置为 rejected。

但其他异步任务如果已经开始，仍可能继续执行。

例如网络请求不会因为 `Promise.all` reject 就自动停止。

真正取消请求需要：

- `AbortController`
- Axios `signal`
- 自定义取消机制

## 🔴 Promise.all 标准答案

> Promise.all 会并行等待所有输入项，普通值通过 Promise.resolve 处理，结果顺序保持输入顺序，而不是完成顺序。任意一个任务失败时外层 Promise 会立即 reject，但不会自动取消其他已经开始的异步任务。如果业务要求取消，需要额外配合 AbortController。

------

# 七、Promise 并发控制

## 1. 为什么不能全部 Promise.all

假设上传 100 张图片：

```js
// 一次性启动所有上传任务
await Promise.all(
  files.map((file) => {
    // 上传当前文件
    return uploadFile(file);
  }),
);
```

问题：

- 浏览器连接数有限
- 网络带宽被争抢
- 后端瞬间压力过大
- 内存占用提高
- 失败重试形成请求风暴
- 用户体验可能反而变差

因此需要并发池：

> 同时只允许固定数量的任务执行，某个任务完成后再补充下一个。

------

## 2. Worker 模型实现

```js
// 定义 Promise 并发池
async function promisePool(taskFactories, limit) {
  // 判断任务列表是否合法
  if (!Array.isArray(taskFactories)) {
    // 抛出参数错误
    throw new TypeError('taskFactories 必须是数组');
  }

  // 判断并发数是否合法
  if (!Number.isInteger(limit) || limit <= 0) {
    // 抛出并发数错误
    throw new TypeError('limit 必须是正整数');
  }

  // 创建结果数组
  const results = new Array(taskFactories.length);

  // 保存下一个待领取任务索引
  let nextIndex = 0;

  // 定义工作线程函数
  async function worker() {
    // 持续领取任务
    while (true) {
      // 保存当前需要执行的任务索引
      const currentIndex = nextIndex;

      // 所有任务都已领取时结束
      if (currentIndex >= taskFactories.length) {
        // 退出当前 worker
        return;
      }

      // 将公共任务索引向后移动
      nextIndex += 1;

      // 获取当前任务工厂函数
      const currentTask = taskFactories[currentIndex];

      // 执行当前异步任务
      const currentResult = await currentTask();

      // 按输入顺序保存结果
      results[currentIndex] = currentResult;
    }
  }

  // 计算实际需要创建的 worker 数量
  const workerCount = Math.min(
    limit,
    taskFactories.length,
  );

  // 创建固定数量的 worker
  const workers = Array.from(
    {
      // 设置 worker 数量
      length: workerCount,
    },
    () => {
      // 启动一个 worker
      return worker();
    },
  );

  // 等待所有 worker 完成
  await Promise.all(workers);

  // 返回结果数组
  return results;
}
```

使用：

```js
// 创建异步任务工厂数组
const tasks = files.map((file) => {
  // 返回一个尚未执行的任务函数
  return () => {
    // 真正执行上传
    return uploadFile(file);
  };
});

// 同时最多上传 3 个文件
const results = await promisePool(tasks, 3);
```

------

## 3. 为什么传任务函数，而不是 Promise

错误：

```js
// 创建数组时任务已经全部开始
const tasks = files.map((file) => {
  // uploadFile 会立即执行
  return uploadFile(file);
});
```

即使之后放入并发池，也已经无法限制启动数量。

正确：

```js
// 创建延迟执行的任务工厂
const tasks = files.map((file) => {
  // 只有调用这个函数时才开始上传
  return () => uploadFile(file);
});
```

## 📌 一句话记忆

> 并发控制要控制“任务什么时候开始”，所以必须传函数，不能传已经开始执行的 Promise。

------

## 4. 失败后其他任务会不会停止

上面的版本中，如果一个 worker 报错，外层 `Promise.all` 会 reject。

但是其他已经运行的 worker 可能继续执行。

想真正全部停止，需要：

- 共享停止标记
- `AbortController`
- 每个任务支持取消
- 根据业务决定 fail-fast 还是 all-settled

------

## 🟢 项目回答

> 在多图上传场景中，我不会直接对全部文件 Promise.all，因为这会瞬间启动大量请求。我会将每个上传操作包装成任务函数，通过固定数量的 worker 控制并发。任务完成后 worker 再领取下一个任务，同时结果按照原文件索引保存。失败策略则根据业务选择立即失败或收集全部失败项。

------

# 八、Promise 失败重试

## 1. 哪些错误可以重试

适合重试：

- 网络短暂中断
- 请求超时
- 服务器 502、503、504
- 临时限流
- 短暂资源竞争

通常不应该重试：

- 400 参数错误
- 401 未授权
- 403 无权限
- 明确业务校验失败
- 非幂等写操作

## ⚠️ 核心意识

重试不是“失败了无脑再请求”。

必须判断：

- 错误是否临时
- 操作是否幂等
- 最大重试次数
- 重试间隔
- 是否加入随机抖动
- 是否支持取消

------

## 2. sleep

```js
// 定义等待函数
function sleep(delay) {
  // 返回一个延迟完成的 Promise
  return new Promise((resolve) => {
    // 到达指定时间后完成
    setTimeout(resolve, delay);
  });
}
```

------

## 3. 指数退避重试

```js
// 定义通用重试函数
async function retry(
  task,
  options = {},
) {
  // 读取重试配置
  const {
    retries = 3,
    delay = 500,
    factor = 2,
    shouldRetry = () => true,
  } = options;

  // 保存当前已经失败的次数
  let attempt = 0;

  // 持续尝试执行任务
  while (attempt <= retries) {
    try {
      // 执行任务并传入当前尝试次数
      return await task(attempt);
    } catch (error) {
      // 判断是否已经没有剩余重试次数
      const hasNoRetries =
        attempt === retries;

      // 判断当前错误是否允许重试
      const canRetry =
        shouldRetry(error, attempt);

      // 不允许继续重试时抛出错误
      if (hasNoRetries || !canRetry) {
        // 将最终错误交给调用方
        throw error;
      }

      // 计算指数退避等待时间
      const currentDelay =
        delay * factor ** attempt;

      // 等待一段时间
      await sleep(currentDelay);

      // 失败次数加一
      attempt += 1;
    }
  }

  // 理论上不会执行到这里
  throw new Error('重试流程异常结束');
}
```

使用：

```js
// 使用重试函数请求数据
const result = await retry(
  // 定义需要重试的任务
  async () => {
    // 发起网络请求
    return requestData();
  },
  {
    // 最多额外重试 3 次
    retries: 3,

    // 第一次等待 500 毫秒
    delay: 500,

    // 每次等待时间翻倍
    factor: 2,

    // 只对临时服务器错误进行重试
    shouldRetry(error) {
      // 获取状态码
      const status = error.status;

      // 判断是否属于可重试错误
      return (
        status === 502 ||
        status === 503 ||
        status === 504
      );
    },
  },
);
```

等待时间：

```text
第1次失败：500ms
第2次失败：1000ms
第3次失败：2000ms
```

------

## 4. 为什么需要随机抖动

如果一万名用户同时收到 503，并按完全相同的间隔重试：

```text
500ms 后同时重试
1000ms 后再次同时重试
```

可能形成：

> 惊群效应或重试风暴。

可以增加随机抖动：

```js
// 计算基础退避时间
const baseDelay = delay * factor ** attempt;

// 生成 0 到基础时间 30% 的随机抖动
const jitter = Math.random() * baseDelay * 0.3;

// 计算最终等待时间
const currentDelay = baseDelay + jitter;
```

## 🔴 重试标准答案

> 重试应该有次数上限，并采用指数退避，避免持续压垮服务端。对于大量客户端同时失败的场景，可以加入随机抖动，避免所有客户端同时重试。重试前还要判断错误类型和操作幂等性，参数错误、权限错误及非幂等写操作通常不能直接重试。

------

# 九、发布订阅 EventEmitter

## 1. 应用场景

- 跨组件事件通信
- WebSocket 消息分发
- 微前端通信
- 插件系统
- Node.js 事件模型
- 自定义数据总线

------

## 2. 完整实现

```js
// 定义事件发布订阅类
class EventEmitter {
  // 创建实例时初始化事件表
  constructor() {
    // 使用 Map 保存事件名和监听器集合
    this.events = new Map();
  }

  // 注册事件监听
  on(eventName, listener) {
    // 判断监听器是否为函数
    if (typeof listener !== 'function') {
      // 抛出参数错误
      throw new TypeError('listener 必须是函数');
    }

    // 当前事件不存在时创建 Set
    if (!this.events.has(eventName)) {
      // 使用 Set 避免同一函数重复注册
      this.events.set(eventName, new Set());
    }

    // 将监听器加入事件集合
    this.events.get(eventName).add(listener);

    // 返回取消订阅函数
    return () => {
      // 取消当前监听器
      this.off(eventName, listener);
    };
  }

  // 注册只执行一次的监听器
  once(eventName, listener) {
    // 创建包装函数
    const wrapper = (...args) => {
      // 执行前先移除监听器
      this.off(eventName, wrapper);

      // 使用当前实例作为 this 执行原函数
      return listener.apply(this, args);
    };

    // 记录原始监听器，方便通过原函数取消
    wrapper.originalListener = listener;

    // 注册包装函数
    return this.on(eventName, wrapper);
  }

  // 触发事件
  emit(eventName, ...args) {
    // 获取当前事件的监听器集合
    const listeners = this.events.get(eventName);

    // 当前事件没有监听器时返回 false
    if (!listeners) {
      // 表示没有任何监听器被执行
      return false;
    }

    // 复制监听器集合，避免执行过程中修改集合影响遍历
    const listenerSnapshot = [...listeners];

    // 依次执行所有监听器
    for (const listener of listenerSnapshot) {
      // 执行当前监听器
      listener.apply(this, args);
    }

    // 表示事件已经被处理
    return true;
  }

  // 移除指定监听器
  off(eventName, listener) {
    // 获取事件监听器集合
    const listeners = this.events.get(eventName);

    // 当前事件不存在时直接结束
    if (!listeners) {
      // 返回当前实例，支持链式调用
      return this;
    }

    // 遍历当前事件所有监听器
    for (const registeredListener of listeners) {
      // 判断是原函数还是 once 包装函数
      const isSameListener =
        registeredListener === listener ||
        registeredListener.originalListener === listener;

      // 找到目标监听器时删除
      if (isSameListener) {
        // 删除当前监听器
        listeners.delete(registeredListener);
      }
    }

    // 当前事件已经没有监听器
    if (listeners.size === 0) {
      // 删除整个事件项
      this.events.delete(eventName);
    }

    // 返回当前实例
    return this;
  }

  // 清空监听器
  clear(eventName) {
    // 如果传入了事件名
    if (eventName !== undefined) {
      // 只删除指定事件
      this.events.delete(eventName);
    } else {
      // 清空全部事件
      this.events.clear();
    }

    // 返回当前实例
    return this;
  }
}
```

------

## 3. 为什么用 Set 而不是数组

使用 `Set`：

- 可以避免同一函数重复注册
- 删除监听器语义更清晰
- `add`、`delete` 平均接近 O(1)

数组也可以，但删除时通常需要：

- `findIndex`
- `splice`
- 重新移动后续元素

------

## 4. emit 为什么先复制

假设某个监听器在执行过程中调用 `off`。

如果直接遍历原集合，可能影响当前遍历过程。

因此：

```js
// 创建监听器快照
const listenerSnapshot = [...listeners];
```

这是一个很容易让面试官眼前一亮的边界考虑。

------

# 十、LRU 缓存

LRU 全称：

> Least Recently Used，最近最少使用。

当缓存满时，淘汰最长时间没有被访问的数据。

应用场景：

- 页面数据缓存
- 图片缓存
- 路由缓存
- 搜索结果缓存
- 接口响应缓存
- 最近访问记录

------

## 1. 使用 Map 实现

Map 会维护插入顺序。

当某个键被访问时：

1. 删除旧键
2. 重新插入
3. 它就移动到最后面

最前面的键就是最久未使用的。

```js
// 定义 LRU 缓存类
class LRUCache {
  // 创建缓存实例
  constructor(capacity) {
    // 判断容量是否合法
    if (!Number.isInteger(capacity) || capacity <= 0) {
      // 抛出容量错误
      throw new TypeError('capacity 必须是正整数');
    }

    // 保存最大容量
    this.capacity = capacity;

    // 使用 Map 保存缓存数据
    this.cache = new Map();
  }

  // 获取缓存
  get(key) {
    // 缓存不存在时返回 -1
    if (!this.cache.has(key)) {
      // 返回未命中结果
      return -1;
    }

    // 获取缓存值
    const value = this.cache.get(key);

    // 删除旧位置
    this.cache.delete(key);

    // 重新插入到最后，表示最近使用
    this.cache.set(key, value);

    // 返回缓存值
    return value;
  }

  // 写入缓存
  put(key, value) {
    // 如果键已经存在
    if (this.cache.has(key)) {
      // 删除旧位置
      this.cache.delete(key);
    }

    // 将键值写入末尾
    this.cache.set(key, value);

    // 判断是否超过容量
    if (this.cache.size > this.capacity) {
      // 获取 Map 中最前面的键
      const oldestKey =
        this.cache.keys().next().value;

      // 淘汰最久未使用的数据
      this.cache.delete(oldestKey);
    }
  }
}
```

复杂度：

- `get` 平均接近 O(1)
- `put` 平均接近 O(1)
- 空间复杂度 O(capacity)

## 深度补充

经典 LRU 也可以使用：

- 哈希表
- 双向链表

哈希表负责 O(1) 查询，双向链表负责 O(1) 调整顺序。

JavaScript 的 `Map` 已经维护插入顺序，所以面试手写时可以简化实现。

------

# 十一、只保留最后一次请求

这是你的简历项目很容易被问到的实战题。

## 1. 问题场景

用户快速切换搜索条件：

```text
请求A：keyword = Vue
请求B：keyword = React
```

可能发生：

```text
B先返回
A后返回
A覆盖B的数据
```

这叫：

> 异步竞态。

------

## 2. 请求序号加 AbortController

```js
// 定义创建最新请求执行器的函数
function createLatestRequestRunner() {
  // 保存最新请求编号
  let latestRequestId = 0;

  // 保存当前请求的取消控制器
  let currentController = null;

  // 返回最新请求执行函数
  return async function runLatest(task) {
    // 为当前请求分配唯一编号
    const currentRequestId =
      latestRequestId + 1;

    // 更新最新请求编号
    latestRequestId = currentRequestId;

    // 如果前一个请求仍然存在
    if (currentController !== null) {
      // 取消前一个请求
      currentController.abort();
    }

    // 为当前请求创建新的控制器
    currentController =
      new AbortController();

    try {
      // 执行任务并传入取消信号
      const result = await task(
        currentController.signal,
      );

      // 当前请求已经不是最新请求
      if (currentRequestId !== latestRequestId) {
        // 忽略过期结果
        return {
          // 标记当前结果被忽略
          status: 'ignored',
        };
      }

      // 返回最新请求结果
      return {
        // 标记请求成功
        status: 'fulfilled',

        // 保存请求结果
        value: result,
      };
    } catch (error) {
      // 判断是否属于主动取消
      if (error.name === 'AbortError') {
        // 返回取消状态
        return {
          // 标记请求被取消
          status: 'aborted',
        };
      }

      // 其他异常继续抛出
      throw error;
    }
  };
}
```

使用：

```js
// 创建最新请求执行器
const runLatest =
  createLatestRequestRunner();

// 执行最新搜索请求
const result = await runLatest((signal) => {
  // 发起支持取消的 fetch 请求
  return fetch('/api/search?keyword=vue', {
    // 传入取消信号
    signal,
  }).then((response) => {
    // 解析 JSON 数据
    return response.json();
  });
});
```

## 深度回答

为什么同时需要“取消”和“请求序号”？

- `AbortController` 尽量停止旧请求，节省资源
- 请求序号是逻辑兜底，确保旧结果不能覆盖新结果
- 某些请求库、缓存层或已完成阶段可能无法真正取消

> 取消是资源层优化，请求序号是正确性保障。

这句话非常加分。

------

# 十二、Token 无感刷新并发控制

这是你简历中“Token 无感刷新”最容易被深挖的地方。

## 1. 并发问题

页面同时发出 5 个请求，Token 已经过期。

五个请求同时返回 401。

错误做法：

```text
每个 401 都单独刷新 Token
```

结果：

- 同时发出 5 次刷新请求
- Refresh Token 可能被重复消费
- 后返回的旧 Token 可能覆盖新 Token
- 所有原请求重放混乱

正确目标：

> 同一时间只允许一个刷新请求，其他 401 请求等待同一个刷新结果。

------

## 2. 单例 Promise 方案

```js
// 保存当前正在执行的刷新任务
let refreshPromise = null;

// 定义带 Token 刷新的请求函数
async function requestWithRefresh(config) {
  try {
    // 首次正常发送请求
    return await request(config);
  } catch (error) {
    // 非 401 错误直接抛出
    if (error.status !== 401) {
      // 交给上层处理
      throw error;
    }

    // 已经重试过仍然 401，避免死循环
    if (config.hasRetried) {
      // 抛出认证失败
      throw error;
    }

    // 当前没有刷新任务时创建一个
    if (refreshPromise === null) {
      // 执行刷新 Token 请求
      refreshPromise = refreshToken()
        .finally(() => {
          // 无论成功失败都清空刷新状态
          refreshPromise = null;
        });
    }

    // 所有 401 请求等待同一个刷新 Promise
    const newToken = await refreshPromise;

    // 保存新的 Token
    saveAccessToken(newToken);

    // 构造重试请求配置
    const retryConfig = {
      // 复制原请求配置
      ...config,

      // 标记当前请求已经重试过
      hasRetried: true,

      // 合并原请求头
      headers: {
        // 保留原请求头
        ...config.headers,

        // 注入最新 Token
        Authorization: `Bearer ${newToken}`,
      },
    };

    // 使用新 Token 重放原请求
    return request(retryConfig);
  }
}
```

------

## 3. 为什么 `refreshPromise` 比布尔值更好

只使用：

```js
// 保存是否正在刷新
let isRefreshing = false;
```

只能表示状态，不能让其他请求直接等待刷新结果。

使用 Promise：

```js
// 所有请求直接等待同一个异步结果
const newToken = await refreshPromise;
```

它既表示：

- 正在刷新
- 刷新成功的 Token
- 刷新失败的异常

这是更自然的异步共享机制。

------

## 4. 刷新失败怎么办

刷新失败时必须：

- 清除 Access Token
- 清除 Refresh Token
- 清除用户信息
- 拒绝所有等待请求
- 跳转登录页
- 避免多个请求重复弹登录提示

## 🔴 标准答案

> 多个请求同时 401 时，我会使用一个共享的 refreshPromise 保证同一时间只有一个刷新请求。其他请求等待同一个 Promise，刷新成功后统一使用新 Token 重放；刷新失败则统一清理登录态并跳转登录页。每个原请求需要加重试标记，避免刷新后仍然 401 导致无限循环。

------

# 十三、上一章手撕题查漏补缺

下面这些题前两章已经讲过完整代码，本章重点检查容易漏掉的边界。

## 1. 手写 call

必须记住：

- `null`、`undefined` 处理
- 基本类型包装成对象
- 使用 `Symbol` 避免属性冲突
- 返回原函数结果
- 执行后删除临时属性

核心思路：

```text
将函数临时挂到目标对象
→ 通过对象方法调用
→ this 自动指向该对象
→ 删除临时属性
```

------

## 2. 手写 apply

和 call 的核心区别只有：

```text
call：参数逐个传递
apply：参数数组传递
```

------

## 3. 手写 bind

最容易漏掉：

- bind 不立即执行
- 支持参数预置
- 支持后续参数
- 返回函数可以被 `new`
- `new` 的 this 优先级高于 bind
- 需要维护原型关系

------

## 4. 手写 new

必须记住四步：

```text
创建新对象
→ 新对象继承构造函数 prototype
→ 用新对象作为 this 执行构造函数
→ 根据返回值决定最终结果
```

构造函数主动返回对象时：

> 返回主动返回的对象。

构造函数返回普通值时：

> 忽略普通值，返回新实例。

------

## 5. 手写 instanceof

核心不是比较构造函数，而是：

> 判断右侧构造函数的 prototype 是否存在于左侧对象原型链上。

------

## 6. 深拷贝

完整深拷贝至少考虑：

- 普通对象
- 数组
- Date
- RegExp
- Map
- Set
- Symbol 属性
- 循环引用
- 保留原型
- 函数通常保留引用
- 属性描述符

面试不要说：

> JSON.parse(JSON.stringify()) 就是完整深拷贝。

它只是受限场景下的简易方案。

------

## 7. 数组转树

面试高分实现要做到：

- 两次遍历
- 使用 Map 建索引
- 不依赖父子节点顺序
- 时间复杂度 O(n)
- 能处理父节点不存在
- 主动提到环形关系校验

------

# 十四、函数柯里化 curry

柯里化是：

> 将接收多个参数的函数，转换成连续接收部分参数的函数。

例如：

```js
// 定义普通加法函数
function add(a, b, c) {
  // 返回三个数字的和
  return a + b + c;
}
```

转换后可以：

```js
// 分多次传递参数
curriedAdd(1)(2)(3);
```

实现：

```js
// 定义柯里化函数
function curry(callback, ...collectedArgs) {
  // 返回继续收集参数的函数
  return function curried(...newArgs) {
    // 合并之前参数和本次参数
    const allArgs = [
      ...collectedArgs,
      ...newArgs,
    ];

    // 判断参数数量是否足够
    if (allArgs.length >= callback.length) {
      // 参数足够时执行原函数
      return callback.apply(this, allArgs);
    }

    // 参数不足时继续返回柯里化函数
    return curry(callback, ...allArgs);
  };
}
```

使用：

```js
// 定义三个数字相加
function add(a, b, c) {
  // 返回计算结果
  return a + b + c;
}

// 创建柯里化函数
const curriedAdd = curry(add);

// 分三次传递参数
console.log(curriedAdd(1)(2)(3));

// 分两次传递参数
console.log(curriedAdd(1, 2)(3));
```

## ⚠️ 边界

`callback.length` 依赖函数声明参数数量，对默认参数和剩余参数不完全可靠。

因此这是面试常见简化实现，不是所有生产场景的万能版本。

------

# 十五、compose 函数组合

假设有三个函数：

```text
输入
→ 去除空格
→ 转成小写
→ 添加前缀
```

可以使用函数组合。

```js
// 定义从右向左执行的 compose
function compose(...functions) {
  // 返回组合后的函数
  return function composed(initialValue) {
    // 从右向左依次执行函数
    return functions.reduceRight(
      (currentValue, currentFunction) => {
        // 将上一个结果传给当前函数
        return currentFunction(currentValue);
      },
      // 设置初始输入
      initialValue,
    );
  };
}
```

使用：

```js
// 定义去除首尾空格函数
const trim = (value) => {
  // 返回处理后的字符串
  return value.trim();
};

// 定义转小写函数
const toLowerCase = (value) => {
  // 返回小写字符串
  return value.toLowerCase();
};

// 定义添加前缀函数
const addPrefix = (value) => {
  // 返回添加前缀后的字符串
  return `user_${value}`;
};

// 创建组合函数
const normalizeUsername = compose(
  // 最后执行添加前缀
  addPrefix,

  // 第二步执行转小写
  toLowerCase,

  // 第一步执行去除空格
  trim,
);

// 输出 user_liufengwei
console.log(
  normalizeUsername('  LiuFengWei  '),
);
```

## compose 和 pipe

- `compose`：从右向左
- `pipe`：从左向右

------

# 十六、手撕题中的常见低级错误

## 1. 忘记返回值

```js
// 错误：没有返回 callback 的执行结果
callback.apply(this, args);
```

需要：

```js
// 正确：返回目标函数结果
return callback.apply(this, args);
```

## 2. 丢失 this

错误：

```js
// 可能丢失原调用者的 this
callback(...args);
```

需要根据题意：

```js
// 保留原调用上下文
callback.apply(this, args);
```

## 3. Promise 任务提前执行

错误：

```js
// 创建数组时所有请求已经启动
const tasks = urls.map(fetch);
```

并发池需要任务函数：

```js
// 创建尚未执行的任务
const tasks = urls.map((url) => {
  // 返回延迟执行函数
  return () => fetch(url);
});
```

## 4. Promise.all 使用 push

会导致结果变成完成顺序，而不是输入顺序。

## 5. 重试没有次数限制

可能形成无限请求。

## 6. Token 刷新没有重试标记

可能形成：

```text
请求401
→ 刷新
→ 重放仍401
→ 再刷新
→ 无限循环
```

## 7. EventEmitter 遍历原集合

监听器执行过程中删除监听器，可能影响遍历。

## 8. 防抖只保存参数，不保存 this

对象方法和组件方法中可能出现 this 错误。

------

# 十七、针对你简历的项目拷打

## 1. 图片并发上传为什么不用 Promise.all？

满分回答：

> Promise.all 会一次启动全部上传请求，文件数量较多时会争抢带宽、增加内存和后端压力。我会将每个文件包装成任务函数，通过并发池限制同时上传数量。上传失败时根据错误类型进行重试，并采用指数退避。最终按照原文件索引保存结果，保证返回顺序稳定。

------

## 2. 搜索防抖为什么还出现旧数据覆盖？

满分回答：

> 防抖只能减少请求数量，无法保证已经发出的请求按顺序返回。如果旧请求后返回，仍可能覆盖新请求。我会通过 AbortController 取消旧请求，同时增加请求序号，只接收最后一次请求结果。取消用于节省资源，请求序号用于保证正确性。

------

## 3. Promise.all 有一个失败怎么办？

满分回答：

> 如果所有数据都是页面渲染的必要依赖，可以使用 Promise.all 快速失败；如果分类、天气等部分数据允许降级，应使用 Promise.allSettled，分别处理成功和失败结果，避免非核心接口失败导致整个页面无法展示。

------

## 4. 重试会不会重复创建订单？

满分回答：

> 会，所以重试前必须判断接口是否幂等。GET 查询通常可以重试；创建订单、支付、扣库存等非幂等操作不能直接重试。可以通过客户端生成幂等键、服务端唯一请求号或业务单号，保证重复请求只处理一次。

------

## 5. EventEmitter 有什么缺点？

满分回答：

> EventEmitter 可以降低模块直接依赖，但过度使用会让数据流变得隐式，很难追踪事件来源和触发时机，也容易因为忘记取消订阅导致内存泄漏。对于核心业务状态，我更倾向使用 Pinia、Context 或明确的数据流；EventEmitter 更适合临时通知、插件系统和跨模块事件。

------

# 十八、本章必须背下来的 8 段话

## 1. 防抖

> 防抖通过闭包保存定时器，连续触发时不断清除旧定时器，只有停止触发达到指定时间后才执行最后一次。完整实现还应保留 this 和参数，并支持立即执行、尾部执行和取消。

## 2. 节流

> 节流限制函数在固定时间内最多执行一次，适合滚动、拖拽和鼠标移动。时间戳方案适合首次立即执行，定时器方案适合保留最后一次，完整方案可以结合两者。

## 3. Promise.all

> Promise.all 保持输入顺序而不是完成顺序，普通值通过 Promise.resolve 包装，一个失败会让外层立即 reject，但不会自动取消其他任务。

## 4. 并发控制

> 并发控制的关键不是等待 Promise，而是控制 Promise 什么时候创建，所以需要传入任务函数。通过固定数量 worker 领取任务，可以将同时运行的任务限制在指定数量。

## 5. 重试

> 重试需要次数上限、错误分类和指数退避，大规模客户端场景还应加入随机抖动。非幂等写操作不能盲目重试，否则可能产生重复业务数据。

## 6. EventEmitter

> 发布订阅通过事件中心解耦发布者和订阅者，适合消息分发和模块通知，但过度使用会让数据流隐式，并且必须在组件卸载时取消订阅。

## 7. LRU

> LRU 在容量满时淘汰最久未使用的数据。使用 Map 可以通过删除并重新插入刷新访问顺序，最前面的键就是淘汰目标，get 和 put 平均接近 O(1)。

## 8. Token 刷新

> 多请求同时 401 时，应通过共享 refreshPromise 保证只有一个刷新请求，其他请求等待同一结果。刷新成功后重放原请求，失败则统一清除登录态，每个请求还需要重试标记避免无限循环。

------

# 十九、本章验收题

## 必须独立手写

1. 尾部防抖
2. 支持立即执行和取消的防抖
3. 基础节流
4. 支持首尾执行的节流
5. Promise.all
6. Promise 并发池
7. 指数退避重试
8. EventEmitter
9. LRU
10. 最新请求控制
11. Token 无感刷新
12. 数组转树

## 必须脱稿回答

1. 防抖为什么使用闭包？
2. 防抖和节流如何选择？
3. Promise.all 为什么不能用 push 保存结果？
4. Promise.all reject 后其他请求会停止吗？
5. 为什么并发池必须接收函数？
6. 并发控制失败后如何取消其他任务？
7. 哪些错误适合重试？
8. 什么是指数退避？
9. 为什么需要随机抖动？
10. EventEmitter 为什么使用 Set？
11. emit 为什么要复制监听器集合？
12. LRU 为什么可以使用 Map 实现？
13. 为什么取消请求后还要设置请求序号？
14. Token 刷新如何避免多个刷新请求？
15. 非幂等接口为什么不能直接重试？

------

# 二十、本章最终总结

你现在要形成的不是“背过几段代码”，而是下面这套思维：

```text
高频事件
→ 防抖或节流

多个独立异步任务
→ Promise.all 或 allSettled

任务太多
→ 并发池

临时网络错误
→ 有上限的指数退避重试

旧请求覆盖新请求
→ AbortController + 请求序号

多个请求同时 401
→ 共享 refreshPromise

模块之间事件通知
→ EventEmitter

有限容量缓存
→ LRU

大量重复查询
→ Map 建立索引
```

真正让面试官眼前一亮的，不是你把代码写得特别长，而是你能够主动说出：

- 这段代码解决什么业务问题
- 为什么采用这个数据结构
- 边界条件是什么
- 是否会出现竞态
- 是否会产生内存泄漏
- 时间复杂度是多少
- 失败后怎么降级
- 有没有更适合生产环境的方案
