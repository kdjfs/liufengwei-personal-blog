---
title: 第八章：React Hooks、闭包陷阱与性能优化
slug: di-ba-zhang-react-hooks-bi-bao-xian-jing-yu-xing-neng-you-hua
description: 这一章只抓面试中最核心、最容易露馅的内容：
publishDate: '2026-08-02'
category: 前端
tags:
  - React
  - JavaScript
  - 浏览器
  - AI
cover: auto
draft: false
featured: false
toc: true
---
这一章只抓面试中最核心、最容易露馅的内容：

1. Hooks 为什么不能写在条件语句中
2. `useState` 的状态快照与更新队列
3. 闭包为什么会拿到旧状态
4. `useEffect` 到底在做什么
5. 依赖数组怎么写才正确
6. `useRef` 为什么不会触发渲染
7. `useMemo`、`useCallback`、`React.memo` 怎么配合
8. React 性能优化应该按什么顺序做

这些内容与你简历中的 React、WebSocket、地图实例、ECharts、长流程任务和复杂结果页高度相关。

------

# 一、先理解 Hooks 的本质

## 1. 函数组件为什么能记住状态

普通函数每次调用，局部变量都会重新创建：

```js
function normalFunction() { // 定义普通函数
  let count = 0; // 每次调用函数都会重新创建 count

  count += 1; // 将当前 count 加一

  console.log(count); // 每次调用通常都输出 1
} // 普通函数定义结束

normalFunction(); // 第一次调用函数

normalFunction(); // 第二次调用函数
```

但是 React 组件：

```jsx
import { useState } from 'react'; // 从 React 中导入 useState

function Counter() { // 定义计数组件
  const [count, setCount] = useState(0); // 创建能够跨渲染保存的状态

  return ( // 返回组件界面
    <button // 创建按钮元素
      onClick={() => { // 绑定按钮点击事件
        setCount(count + 1); // 请求 React 在下一次渲染中更新 count
      }} // 点击事件结束
    >
      {/* 展示当前计数 */}
      {count}
    </button>
  ); // JSX 返回结束
} // Counter 组件定义结束
```

`count` 能够保留，不是因为局部变量没有销毁，而是因为：

> React 把状态保存在组件对应的 Fiber 节点上，组件函数每次执行时，按照 Hooks 的调用顺序取回对应状态。

------

## 2. 可以把 Hooks 想象成一排储物柜

第一次渲染：

```text
第 1 个 Hook 柜子：count
第 2 个 Hook 柜子：name
第 3 个 Hook 柜子：effect
```

下一次渲染，React 仍然按顺序寻找：

```text
第 1 个 Hook → count
第 2 个 Hook → name
第 3 个 Hook → effect
```

所以 React 依赖的是：

> Hook 的调用顺序，而不是变量名称。

------

# 二、为什么 Hooks 不能写在条件语句中

错误代码：

```jsx
import { useState } from 'react'; // 从 React 中导入 useState

function UserPage({ isLoggedIn }) { // 定义用户页面组件
  if (isLoggedIn) { // 根据登录状态进入条件分支
    const [user, setUser] = useState(null); // 错误：条件成立时才调用第一个 Hook
  } // 条件判断结束

  const [loading, setLoading] = useState(false); // 当前 Hook 的顺序可能发生改变

  return <div>用户页面</div>; // 返回页面内容
} // UserPage 组件定义结束
```

第一次渲染 `isLoggedIn = true`：

```text
Hook 1：user
Hook 2：loading
```

第二次渲染 `isLoggedIn = false`：

```text
Hook 1：loading
```

React 会以为第一个柜子还是 `user`，但你现在却想把它当成 `loading`。

状态就乱了。

------

## 正确写法

```jsx
import { useState } from 'react'; // 从 React 中导入 useState

function UserPage({ isLoggedIn }) { // 定义用户页面组件
  const [user, setUser] = useState(null); // 每次渲染都固定调用第一个 Hook

  const [loading, setLoading] = useState(false); // 每次渲染都固定调用第二个 Hook

  if (!isLoggedIn) { // 在所有 Hook 调用完成后再判断
    return <div>请先登录</div>; // 未登录时返回提示界面
  } // 登录状态判断结束

  return <div>{user?.name}</div>; // 已登录时展示用户名
} // UserPage 组件定义结束
```

------

## Hooks 两条核心规则

### 规则一

> 只在 React 函数组件或自定义 Hook 中调用 Hook。

### 规则二

> Hook 必须在组件顶层调用，不能放在条件、循环、普通嵌套函数中。

## 🔴 面试标准答案

> React 通过 Hook 的调用顺序，将每次组件渲染中的 Hook 与 Fiber 上保存的状态节点对应起来。如果把 Hook 放进条件或循环，不同渲染中的调用顺序可能变化，React 就无法正确判断某个状态属于哪个 Hook，因此 Hooks 必须在组件顶层按固定顺序调用。

------

# 三、useState：状态不是变量，而是渲染快照

## 1. 为什么 setState 后打印的还是旧值

```jsx
import { useState } from 'react'; // 从 React 中导入 useState

function Counter() { // 定义计数组件
  const [count, setCount] = useState(0); // 创建计数状态

  function handleClick() { // 定义点击处理函数
    setCount(count + 1); // 请求下一次渲染将 count 更新为 count 加一

    console.log(count); // 当前函数仍然读取本次渲染中的旧 count
  } // handleClick 函数结束

  return ( // 返回按钮
    <button onClick={handleClick}> {/* 绑定点击事件 */}
      {count} {/* 展示当前渲染快照中的 count */}
    </button>
  ); // JSX 返回结束
} // Counter 组件结束
```

第一次点击时输出 `0`。

这不是 React 更新慢，而是：

> `handleClick` 属于 `count = 0` 这一次渲染，它看到的是这一帧的状态快照。

可以把每次渲染想象成拍了一张照片：

```text
第一次照片：count = 0
第二次照片：count = 1
第三次照片：count = 2
```

旧照片中的函数，不会突然看见新照片里的数据。

------

# 四、连续更新为什么要用函数式写法

错误写法：

```jsx
function handleAddThree() { // 定义连续加三处理函数
  setCount(count + 1); // 当前 count 为 0 时，请求设置为 1

  setCount(count + 1); // 仍然读取当前快照中的 0，请求设置为 1

  setCount(count + 1); // 仍然读取当前快照中的 0，请求设置为 1
} // handleAddThree 函数结束
```

三次都是：

```text
setCount(1)
```

所以最终通常只增加一次。

------

## 正确写法

```jsx
function handleAddThree() { // 定义连续加三处理函数
  setCount((previousCount) => { // 读取更新队列中的上一个状态
    return previousCount + 1; // 第一次将 0 更新为 1
  }); // 第一次函数式更新结束

  setCount((previousCount) => { // 读取第一次更新后的状态
    return previousCount + 1; // 第二次将 1 更新为 2
  }); // 第二次函数式更新结束

  setCount((previousCount) => { // 读取第二次更新后的状态
    return previousCount + 1; // 第三次将 2 更新为 3
  }); // 第三次函数式更新结束
} // handleAddThree 函数结束
```

## 必须使用函数式更新的场景

- 新状态依赖旧状态
- WebSocket 追加消息
- 定时器持续计数
- 多次连续更新
- 异步回调更新数组
- 并发请求返回后合并数据

------

## WebSocket 正确追加消息

```jsx
socket.onmessage = (event) => { // 监听 WebSocket 消息
  const newMessage = JSON.parse(event.data); // 将消息字符串解析成对象

  setMessages((previousMessages) => { // 获取最新的消息数组
    return [ // 返回新的消息数组
      ...previousMessages, // 保留之前的全部消息
      newMessage, // 将最新消息追加到数组末尾
    ]; // 新数组定义结束
  }); // 消息状态更新结束
}; // WebSocket 消息处理结束
```

## 🔴 必背

> 新状态只要依赖旧状态，就优先使用函数式更新。它读取的是更新队列中的最新状态，而不是当前闭包中的旧状态。

------

# 五、useState 的懒初始化

错误场景：

```jsx
function UserPage() { // 定义用户页面组件
  const [user, setUser] = useState( // 创建用户状态
    JSON.parse(localStorage.getItem('user')), // 每次组件重新渲染都会执行读取和解析
  ); // useState 调用结束

  return <div>{user?.name}</div>; // 返回用户名
} // UserPage 组件结束
```

虽然 React 只使用第一次的初始值，但传入表达式仍可能每次执行。

更好：

```jsx
function UserPage() { // 定义用户页面组件
  const [user, setUser] = useState(() => { // 传入懒初始化函数
    const userText = localStorage.getItem('user'); // 只在初次初始化时读取存储

    return userText ? JSON.parse(userText) : null; // 有数据时解析，没有时返回 null
  }); // useState 懒初始化结束

  return <div>{user?.name}</div>; // 返回用户名
} // UserPage 组件结束
```

适合懒初始化的场景：

- 读取 localStorage
- 复杂数组计算
- 大对象初始化
- 较昂贵的同步计算

------

# 六、闭包陷阱：为什么定时器一直拿到旧值

这是 React 面试中的绝对高频。

```jsx
import { useEffect, useState } from 'react'; // 从 React 中导入 useEffect 和 useState

function Counter() { // 定义计数组件
  const [count, setCount] = useState(0); // 创建计数状态

  useEffect(() => { // 组件挂载后创建副作用
    const timer = setInterval(() => { // 每秒执行一次回调
      console.log(count); // 一直读取首次渲染闭包中的 count
    }, 1000); // 设置一秒执行一次

    return () => { // 返回副作用清理函数
      clearInterval(timer); // 组件卸载时清除定时器
    }; // 清理函数结束
  }, []); // 空依赖表示该 Effect 不因 count 更新而重新执行

  return ( // 返回按钮
    <button onClick={() => setCount(count + 1)}> {/* 点击时更新 count */}
      {count} {/* 展示当前计数 */}
    </button>
  ); // JSX 返回结束
} // Counter 组件结束
```

为什么一直打印 `0`？

因为这个 Effect 是在第一次渲染时创建的。

第一次渲染的照片是：

```text
count = 0
```

定时器回调一直拿着这张旧照片。

这叫：

> 闭包导致的旧状态问题，也叫 stale closure。

------

# 七、旧闭包的三种解决办法

## 方法一：函数式更新

适用于需要基于旧状态更新。

```jsx
useEffect(() => { // 组件挂载后启动计时器
  const timer = setInterval(() => { // 每秒执行一次
    setCount((previousCount) => { // 获取更新队列中的最新 count
      return previousCount + 1; // 将最新 count 加一
    }); // 函数式状态更新结束
  }, 1000); // 设置一秒执行一次

  return () => { // 返回清理函数
    clearInterval(timer); // 组件卸载时清除定时器
  }; // 清理函数结束
}, []); // 当前 Effect 不需要直接读取 count
```

------

## 方法二：将状态放入依赖数组

```jsx
useEffect(() => { // count 变化后重新执行 Effect
  console.log('最新 count：', count); // 读取当前渲染对应的最新 count
}, [count]); // count 变化时重新执行
```

适合：

- 状态变化后执行副作用
- 记录日志
- 同步外部系统
- 根据状态请求接口

------

## 方法三：使用 ref 保存最新值

```jsx
import { useEffect, useRef, useState } from 'react'; // 导入 React Hooks

function Counter() { // 定义计数组件
  const [count, setCount] = useState(0); // 创建计数状态

  const latestCountRef = useRef(count); // 创建保存最新 count 的可变容器

  useEffect(() => { // count 变化后同步最新值
    latestCountRef.current = count; // 将最新 count 保存到 ref
  }, [count]); // count 变化时执行同步

  useEffect(() => { // 组件挂载后启动定时器
    const timer = setInterval(() => { // 每秒执行一次
      console.log(latestCountRef.current); // 通过 ref 读取最新 count
    }, 1000); // 设置执行间隔

    return () => { // 返回清理函数
      clearInterval(timer); // 卸载时清除定时器
    }; // 清理函数结束
  }, []); // 定时器只创建一次

  return ( // 返回按钮
    <button onClick={() => setCount(count + 1)}> {/* 点击更新状态 */}
      {count} {/* 展示当前计数 */}
    </button>
  ); // JSX 返回结束
} // Counter 组件结束
```

## 📌 记忆

> state 是照片，ref 是可以随时修改的小纸条。

旧函数拿着旧照片，但仍然可以查看同一个 `ref` 小纸条上的最新内容。

------

# 八、useEffect 的真正含义

很多人回答：

> `useEffect` 是生命周期函数。

不够准确。

更好的理解是：

> `useEffect` 用来将 React 组件与外部系统同步。

外部系统包括：

- 网络请求
- WebSocket
- 定时器
- DOM 事件
- 地图实例
- ECharts 实例
- 本地存储
- 第三方 SDK

------

## 不需要 Effect 的场景

可以直接计算的数据，不要用 Effect。

错误：

```jsx
import { useEffect, useState } from 'react'; // 导入 React Hooks

function Price({ price, quantity }) { // 定义价格组件
  const [totalPrice, setTotalPrice] = useState(0); // 多保存了一份派生状态

  useEffect(() => { // 监听价格和数量变化
    setTotalPrice(price * quantity); // 通过 Effect 同步派生状态
  }, [price, quantity]); // 依赖价格和数量

  return <div>{totalPrice}</div>; // 展示总价
} // Price 组件结束
```

更好：

```jsx
function Price({ price, quantity }) { // 定义价格组件
  const totalPrice = price * quantity; // 渲染时直接计算派生数据

  return <div>{totalPrice}</div>; // 展示计算结果
} // Price 组件结束
```

## 🔴 高分结论

> Effect 不是用来处理所有逻辑的。能在渲染期间通过 props 和 state 计算出来的数据，应直接计算；只有需要与 React 外部系统同步时才使用 Effect。

------

# 九、Effect 的完整生命周期

假设：

```jsx
useEffect(() => { // 定义副作用
  connect(userId); // 根据 userId 建立外部连接

  return () => { // 返回清理函数
    disconnect(userId); // 清理当前 userId 对应的连接
  }; // 清理函数结束
}, [userId]); // userId 变化时重新同步
```

执行过程：

## 首次挂载

```text
组件提交到 DOM
→ 执行 Effect
→ connect(1)
```

## userId 从 1 变成 2

```text
先执行上一次清理
→ disconnect(1)

再执行新的 Effect
→ connect(2)
```

## 组件卸载

```text
执行最后一次清理
→ disconnect(2)
```

## 📌 一句话记忆

> Effect 更新时不是直接覆盖旧副作用，而是先打扫旧房间，再搬进新房间。

------

# 十、请求 Effect 的正确写法

```jsx
import { useEffect, useState } from 'react'; // 从 React 中导入 Hooks

function UserPage({ userId }) { // 定义用户页面组件
  const [user, setUser] = useState(null); // 保存用户数据

  const [loading, setLoading] = useState(false); // 保存加载状态

  const [error, setError] = useState(null); // 保存错误状态

  useEffect(() => { // userId 变化时重新请求
    const controller = new AbortController(); // 创建本次请求的取消控制器

    async function loadUser() { // 定义异步加载函数
      setLoading(true); // 请求开始前开启 loading

      setError(null); // 清空上一次错误

      try { // 开始捕获请求异常
        const response = await fetch( // 发起用户请求
          `/api/users/${userId}`, // 拼接当前用户 ID
          {
            signal: controller.signal, // 将取消信号传给 fetch
          }, // fetch 配置结束
        ); // fetch 请求结束

        if (!response.ok) { // 判断 HTTP 响应是否成功
          throw new Error('获取用户信息失败'); // 主动抛出业务异常
        } // 响应状态判断结束

        const userData = await response.json(); // 解析响应 JSON

        setUser(userData); // 保存最新用户数据
      } catch (requestError) { // 捕获请求异常
        if (requestError.name === 'AbortError') { // 判断是否属于主动取消
          return; // 主动取消时不展示错误
        } // 取消类型判断结束

        setError(requestError); // 保存真实请求异常
      } finally { // 无论成功失败都会执行
        if (!controller.signal.aborted) { // 仅在请求未取消时更新 loading
          setLoading(false); // 关闭加载状态
        } // 请求取消判断结束
      } // 异常处理结束
    } // loadUser 函数定义结束

    loadUser(); // 启动用户请求

    return () => { // 返回副作用清理函数
      controller.abort(); // userId 变化或组件卸载时取消旧请求
    }; // 清理函数结束
  }, [userId]); // userId 变化时重新请求

  return <div>{user?.name}</div>; // 返回用户姓名
} // UserPage 组件结束
```

## 这个实现解决了什么

- 用户快速切换时取消旧请求
- 组件卸载后不继续处理旧请求
- 防止旧请求覆盖新数据
- 清晰管理 loading 和 error

------

# 十一、依赖数组到底怎么写

## 1. 没有依赖数组

```jsx
useEffect(() => { // 定义副作用
  console.log('每次组件提交后都可能执行'); // 输出执行信息
}); // 没有依赖数组
```

通常每次组件提交后都会重新执行。

------

## 2. 空依赖数组

```jsx
useEffect(() => { // 定义只与挂载相关的副作用
  console.log('建立一次连接'); // 执行初始化逻辑

  return () => { // 返回清理函数
    console.log('断开连接'); // 卸载时清理
  }; // 清理函数结束
}, []); // 当前 Effect 不读取组件中的响应式值
```

不要机械理解成“永远只执行一次”。

开发环境的严格检查可能执行：

```text
执行 Effect
→ 清理
→ 再次执行 Effect
```

目的是检查清理逻辑是否完整。

------

## 3. 带依赖

```jsx
useEffect(() => { // 定义用户同步副作用
  document.title = `用户：${userName}`; // 将用户名同步到浏览器标题
}, [userName]); // userName 变化时重新同步
```

------

# 十二、依赖为什么不能故意少写

错误：

```jsx
useEffect(() => { // 定义搜索副作用
  requestSearch(keyword); // Effect 中读取了 keyword
}, []); // 错误：依赖数组没有声明 keyword
```

这个 Effect 永远拿着首次渲染的 `keyword`。

正确：

```jsx
useEffect(() => { // 定义搜索副作用
  requestSearch(keyword); // 使用当前最新关键词
}, [keyword]); // keyword 变化时重新请求
```

## 依赖数组不是“我希望什么时候执行”

而是：

> Effect 使用了哪些来自组件渲染作用域的值。

这句话非常重要。

## 🔴 面试高分答案

> 依赖数组不是人为选择执行频率的开关，而是对 Effect 所使用响应式值的声明。Effect 中读取了 props、state 或组件内部函数，通常就应该将它们作为依赖。故意漏依赖虽然可能减少执行次数，但容易产生旧闭包和状态不同步问题。

------

# 十三、对象依赖为什么容易重复执行

```jsx
function UserList({ status }) { // 定义用户列表组件
  const query = { // 每次渲染都会创建新对象
    status, // 保存查询状态
    pageSize: 20, // 设置每页数量
  }; // query 对象定义结束

  useEffect(() => { // 监听 query 变化
    requestUsers(query); // 根据 query 请求用户
  }, [query]); // 每次 render 的 query 引用都不同

  return <div>用户列表</div>; // 返回页面内容
} // UserList 组件结束
```

即使 `status` 没变，`query` 也是一个新对象。

React 依赖比较主要看引用：

```text
旧 query !== 新 query
```

Effect 就会重新执行。

------

## 更好的写法：在 Effect 内创建对象

```jsx
function UserList({ status }) { // 定义用户列表组件
  useEffect(() => { // status 变化时执行请求
    const query = { // 在 Effect 内创建本次查询参数
      status, // 使用当前查询状态
      pageSize: 20, // 设置每页数量
    }; // query 对象定义结束

    requestUsers(query); // 发起用户请求
  }, [status]); // 只依赖真正会变化的原始值

  return <div>用户列表</div>; // 返回页面内容
} // UserList 组件结束
```

原则：

> 能移进 Effect 的对象和函数，就不要为了稳定引用急着使用 useMemo、useCallback。

------

# 十四、useEffect 和 useLayoutEffect

## useEffect

通常在浏览器完成页面绘制后执行，不阻塞用户看到页面。

适合：

- 网络请求
- 日志
- WebSocket
- 定时器
- 本地存储同步

## useLayoutEffect

在 DOM 更新后、浏览器绘制前同步执行。

适合：

- 测量 DOM
- 根据测量结果立即修正布局
- 避免用户看到界面闪动

------

## DOM 测量例子

```jsx
import { useLayoutEffect, useRef, useState } from 'react'; // 导入需要的 Hooks

function Tooltip() { // 定义提示框组件
  const tooltipRef = useRef(null); // 保存提示框 DOM 引用

  const [height, setHeight] = useState(0); // 保存测量到的高度

  useLayoutEffect(() => { // DOM 更新后、绘制前同步执行
    const rect = tooltipRef.current.getBoundingClientRect(); // 获取提示框尺寸

    setHeight(rect.height); // 保存提示框真实高度
  }, []); // 挂载时完成初次测量

  return ( // 返回提示框结构
    <div // 创建提示框元素
      ref={tooltipRef} // 将真实 DOM 保存到 ref
      style={{ // 设置提示框样式
        transform: `translateY(-${height}px)`, // 根据测量高度调整位置
      }} // 样式配置结束
    >
      提示内容
    </div>
  ); // JSX 返回结束
} // Tooltip 组件结束
```

## ⚠️ 不要滥用 useLayoutEffect

它会阻塞浏览器绘制。

大量耗时逻辑放进去，会让页面更晚显示。

## 📌 记忆

> `useEffect` 是页面先亮灯，再做事情；`useLayoutEffect` 是亮灯前先把桌椅摆正。

------

# 十五、useRef：不会触发渲染的可变盒子

## 1. 保存 DOM

```jsx
import { useRef } from 'react'; // 从 React 中导入 useRef

function SearchInput() { // 定义搜索输入组件
  const inputRef = useRef(null); // 创建保存输入框 DOM 的引用

  function focusInput() { // 定义聚焦输入框的方法
    inputRef.current?.focus(); // 调用真实 DOM 的 focus 方法
  } // focusInput 函数结束

  return ( // 返回组件界面
    <div> {/* 创建外层容器 */}
      <input ref={inputRef} /> {/* 将输入框 DOM 保存到 ref */}

      <button onClick={focusInput}> {/* 点击时聚焦输入框 */}
        聚焦
      </button>
    </div>
  ); // JSX 返回结束
} // SearchInput 组件结束
```

------

## 2. 保存第三方实例

```jsx
import { useEffect, useRef } from 'react'; // 从 React 中导入 Hooks

function MapPanel() { // 定义地图组件
  const containerRef = useRef(null); // 保存地图容器 DOM

  const mapInstanceRef = useRef(null); // 保存地图实例

  useEffect(() => { // 组件挂载后初始化地图
    mapInstanceRef.current = createMap( // 创建地图实例
      containerRef.current, // 传入地图容器 DOM
    ); // 地图实例创建结束

    return () => { // 返回地图清理函数
      mapInstanceRef.current?.destroy(); // 销毁地图实例

      mapInstanceRef.current = null; // 清空实例引用
    }; // 清理函数结束
  }, []); // 地图实例只在挂载阶段创建

  return <div ref={containerRef} />; // 返回地图容器
} // MapPanel 组件结束
```

------

## 3. useRef 和 useState 的区别

| 对比项               | useState   | useRef     |
| -------------------- | ---------- | ---------- |
| 修改后是否触发渲染   | 是         | 否         |
| 是否跨渲染保存       | 是         | 是         |
| 是否适合展示数据     | 是         | 通常不适合 |
| 是否适合实例和定时器 | 一般不适合 | 适合       |
| 访问方式             | 状态变量   | `.current` |

## 🔴 必背

> 会影响页面显示的数据放 state；只需要跨渲染保存、但变化后不需要重新渲染的数据放 ref。

适合 ref：

- DOM
- 地图实例
- ECharts 实例
- WebSocket 实例
- 定时器 ID
- AbortController
- 最新状态值
- 上一次数据

------

# 十六、useMemo：缓存计算结果

假设有十万条数据：

```jsx
import { useMemo } from 'react'; // 从 React 中导入 useMemo

function UserList({ users, keyword }) { // 定义用户列表组件
  const filteredUsers = useMemo(() => { // 缓存筛选后的用户数组
    return users.filter((user) => { // 遍历用户进行筛选
      return user.name.includes(keyword); // 保留姓名包含关键词的用户
    }); // filter 筛选结束
  }, [users, keyword]); // users 或 keyword 变化时重新计算

  return ( // 返回用户列表
    <div> {/* 创建列表容器 */}
      {filteredUsers.map((user) => { // 遍历筛选后的用户
        return ( // 返回用户节点
          <div key={user.id}> {/* 使用稳定用户 ID 作为 key */}
            {user.name} {/* 展示用户姓名 */}
          </div>
        ); // 用户节点返回结束
      })} {/* 用户列表遍历结束 */}
    </div>
  ); // JSX 返回结束
} // UserList 组件结束
```

## useMemo 适合

- 昂贵计算
- 大数据筛选
- 图表配置计算
- 复杂树结构转换
- 为 memo 子组件提供稳定对象

## 不适合

```jsx
const fullName = useMemo(() => { // 对极简单字符串拼接使用缓存
  return `${firstName}${lastName}`; // 返回完整姓名
}, [firstName, lastName]); // 声明依赖
```

简单计算直接写：

```jsx
const fullName = `${firstName}${lastName}`; // 直接计算完整姓名
```

## ⚠️ useMemo 不是免费的

它也需要：

- 保存缓存
- 比较依赖
- 增加代码复杂度
- 占用内存

## 🔴 标准答案

> useMemo 用于在依赖未变化时复用上一次计算结果。它适合真正昂贵的计算或需要保持引用稳定的场景，但自身也有依赖比较和缓存成本，因此不应该为简单计算滥用。

------

# 十七、useCallback：缓存函数引用

每次组件重新执行，普通函数都会重新创建：

```jsx
function Parent() { // 定义父组件
  function handleSubmit() { // 每次 Parent 渲染都会创建新的函数
    console.log('提交'); // 执行提交逻辑
  } // handleSubmit 函数结束

  return <Child onSubmit={handleSubmit} />; // 将函数传给子组件
} // Parent 组件结束
```

使用 `useCallback`：

```jsx
import { useCallback } from 'react'; // 从 React 中导入 useCallback

function Parent() { // 定义父组件
  const handleSubmit = useCallback(() => { // 缓存提交函数引用
    console.log('提交'); // 执行提交逻辑
  }, []); // 当前函数不依赖组件中的变化值

  return <Child onSubmit={handleSubmit} />; // 将稳定函数传给子组件
} // Parent 组件结束
```

------

## useCallback 等价思想

可以近似理解：

```js
useCallback(callback, dependencies); // 缓存函数引用
```

类似于：

```js
useMemo(() => callback, dependencies); // 缓存并返回函数本身
```

------

# 十八、React.memo：缓存组件渲染结果

```jsx
import { memo } from 'react'; // 从 React 中导入 memo

const UserCard = memo(function UserCard({ user, onSelect }) { // 创建带 memo 的用户卡片
  console.log('UserCard 重新渲染'); // 观察组件渲染次数

  return ( // 返回用户卡片
    <button // 创建用户按钮
      onClick={() => { // 绑定点击事件
        onSelect(user.id); // 通知父组件选择当前用户
      }} // 点击事件结束
    >
      {user.name} {/* 展示用户姓名 */}
    </button>
  ); // JSX 返回结束
}); // memo 包装结束
```

`React.memo` 会对 props 做浅比较。

如果新旧 props 在浅比较下相同，可以跳过该子组件的重新执行。

------

# 十九、三种优化怎么配合

父组件：

```jsx
import { memo, useCallback, useMemo, useState } from 'react'; // 导入需要的 React API

const UserList = memo(function UserList({ users, onSelect }) { // 创建 memo 子组件
  console.log('UserList 渲染'); // 观察子组件执行次数

  return ( // 返回用户列表
    <div> {/* 创建列表容器 */}
      {users.map((user) => { // 遍历用户数组
        return ( // 返回用户按钮
          <button // 创建按钮
            key={user.id} // 使用用户 ID 作为 key
            onClick={() => onSelect(user.id)} // 点击时选择当前用户
          >
            {user.name} {/* 展示用户姓名 */}
          </button>
        ); // 用户按钮返回结束
      })} {/* 用户数组遍历结束 */}
    </div>
  ); // JSX 返回结束
}); // memo 子组件定义结束

function Parent({ allUsers }) { // 定义父组件
  const [keyword, setKeyword] = useState(''); // 保存搜索关键词

  const [count, setCount] = useState(0); // 保存无关计数状态

  const filteredUsers = useMemo(() => { // 缓存筛选后的用户数组
    return allUsers.filter((user) => { // 遍历全部用户
      return user.name.includes(keyword); // 筛选符合关键词的用户
    }); // 用户筛选结束
  }, [allUsers, keyword]); // 用户数据或关键词变化时重新筛选

  const handleSelect = useCallback((userId) => { // 缓存选择函数引用
    console.log('选择用户：', userId); // 输出当前用户 ID
  }, []); // 当前函数没有变化依赖

  return ( // 返回父组件界面
    <div> {/* 创建页面容器 */}
      <button onClick={() => setCount(count + 1)}> {/* 更新无关状态 */}
        {count} {/* 展示计数 */}
      </button>

      <UserList // 渲染用户列表组件
        users={filteredUsers} // 传入稳定的筛选结果
        onSelect={handleSelect} // 传入稳定的回调函数
      />
    </div>
  ); // JSX 返回结束
} // Parent 组件结束
```

三者关系：

```text
React.memo
→ 子组件 props 没变时跳过渲染

useMemo
→ 稳定对象、数组或计算结果

useCallback
→ 稳定函数引用
```

------

# 二十、为什么只写 useCallback 可能没有意义

```jsx
const handleClick = useCallback(() => { // 缓存函数引用
  console.log('点击'); // 执行点击逻辑
}, []); // 声明空依赖

return <Child onClick={handleClick} />; // 将函数传给普通子组件
```

如果 `Child` 没有被 `React.memo` 包装：

> 父组件重新渲染时，Child 仍然会正常执行。

所以 `useCallback` 并不会自动阻止子组件渲染。

## 🔴 面试高分答案

> useCallback 只保证依赖未变化时复用函数引用，不会自动减少渲染。它通常需要配合 React.memo，或者用于 Effect 依赖、第三方订阅等确实关心函数引用稳定性的场景。对普通内联函数无脑使用 useCallback，可能只增加复杂度。

------

# 二十一、React.memo 为什么也可能失效

```jsx
const Child = memo(function Child({ config }) { // 创建 memo 子组件
  return <div>{config.title}</div>; // 展示配置标题
}); // Child 组件定义结束

function Parent() { // 定义父组件
  const config = { // 每次父组件渲染都创建新对象
    title: '用户列表', // 设置标题
  }; // config 对象定义结束

  return <Child config={config} />; // 将新对象传给 memo 子组件
} // Parent 组件结束
```

虽然内容相同，但每次引用不同：

```text
旧 config !== 新 config
```

所以 memo 浅比较认为 props 变化。

解决：

```jsx
const config = useMemo(() => { // 缓存配置对象
  return { // 返回配置对象
    title: '用户列表', // 设置标题
  }; // 配置对象定义结束
}, []); // 配置内容不会变化
```

但更简单的方式可能是：

```jsx
return <Child title="用户列表" />; // 直接传递基础类型属性
```

## 📌 优化原则

> 先让 props 结构简单稳定，再考虑缓存对象。

------

# 二十二、性能优化最正确的顺序

不要一上来就在所有函数上写 `useCallback`。

正确顺序是：

## 第一步：先定位问题

使用：

- React DevTools Profiler
- 浏览器 Performance
- 实际用户体验
- 渲染日志
- 性能指标

## 第二步：优化状态设计

- 状态靠近使用组件
- 不保存重复派生状态
- 不把所有数据放全局
- 避免父组件保存无关局部状态

## 第三步：拆分组件

把频繁变化区域和稳定区域分开。

## 第四步：减少不必要更新

- `React.memo`
- 稳定 props
- `useMemo`
- `useCallback`
- Context 拆分

## 第五步：解决真正的大头

- 虚拟列表
- 分页
- 懒加载
- 代码分割
- 降低 Markdown 解析频率
- 合并 WebSocket 流式更新
- Web Worker
- 图片优化

## 🔴 眼前一亮的回答

> React 性能优化首先是状态和组件边界设计问题，其次才是 memo 化问题。如果一个大列表一次渲染一万项，仅靠 useMemo 和 useCallback 很难解决，真正有效的方式通常是分页或虚拟列表。

------

# 二十三、状态下沉为什么能优化性能

错误结构：

```text
App 保存输入框状态
├── Header
├── LargeChart
├── Map
└── SearchInput
```

每输入一个字符：

```text
App 更新
→ LargeChart 重新参与渲染
→ Map 重新参与渲染
→ Header 重新参与渲染
```

如果关键词只在搜索框使用，可以将状态下沉：

```text
App
├── Header
├── LargeChart
├── Map
└── SearchInput 自己保存 keyword
```

这样输入时只更新 `SearchInput`。

## 📌 记忆

> 状态放得越高，波及范围越大；状态放到最低必要公共层级，更新范围更小。

------

# 二十四、Context 为什么容易引起大范围更新

```jsx
const AppContext = createContext(null); // 创建应用全局 Context

function AppProvider({ children }) { // 定义 Context Provider
  const [user, setUser] = useState(null); // 保存用户状态

  const [theme, setTheme] = useState('light'); // 保存主题状态

  const [messages, setMessages] = useState([]); // 保存消息状态

  const value = { // 每次任意状态变化都会创建新对象
    user, // 提供用户状态
    theme, // 提供主题状态
    messages, // 提供消息状态
  }; // Context value 定义结束

  return ( // 返回 Provider
    <AppContext.Provider value={value}> {/* 提供全局数据 */}
      {children} {/* 渲染后代组件 */}
    </AppContext.Provider>
  ); // JSX 返回结束
} // AppProvider 组件结束
```

当消息每秒更新时，使用该 Context 的大量组件都可能重新参与渲染。

更好的思路：

```text
UserContext
ThemeContext
MessageContext
```

将更新频率和业务领域不同的数据拆开。

------

# 二十五、自定义 Hook

自定义 Hook 不是新的 React 能力，而是：

> 将多个 Hooks 组合成可复用业务逻辑。

命名必须以 `use` 开头。

------

## 示例：封装窗口宽度

```jsx
import { useEffect, useState } from 'react'; // 从 React 中导入 Hooks

function useWindowWidth() { // 定义窗口宽度自定义 Hook
  const [width, setWidth] = useState(() => { // 创建窗口宽度状态
    return window.innerWidth; // 初次读取浏览器窗口宽度
  }); // width 状态初始化结束

  useEffect(() => { // 组件挂载后注册窗口事件
    function handleResize() { // 定义窗口变化处理函数
      setWidth(window.innerWidth); // 保存最新窗口宽度
    } // handleResize 函数结束

    window.addEventListener('resize', handleResize); // 注册 resize 事件

    return () => { // 返回副作用清理函数
      window.removeEventListener('resize', handleResize); // 移除同一个事件函数
    }; // 清理函数结束
  }, []); // 事件监听只需要注册一次

  return width; // 返回当前窗口宽度
} // useWindowWidth 自定义 Hook 结束
```

使用：

```jsx
function ResponsivePage() { // 定义响应式页面组件
  const width = useWindowWidth(); // 获取当前窗口宽度

  const isMobile = width < 768; // 判断当前是否为移动端

  return ( // 返回页面内容
    <div> {/* 创建容器 */}
      {isMobile ? '移动端' : '桌面端'} {/* 根据宽度展示布局类型 */}
    </div>
  ); // JSX 返回结束
} // ResponsivePage 组件结束
```

## 自定义 Hook 共享什么

共享的是：

- 状态逻辑
- Effect 逻辑
- 业务流程

不共享同一份状态实例。

两个组件分别调用 `useWindowWidth`，会分别拥有自己的 Hook 状态和 Effect。

------

# 二十六、你的项目中怎么用 Hooks

## 1. WebSocket 任务进度

需要考虑：

- socket 实例放 `useRef`
- 连接建立放 `useEffect`
- 消息追加使用函数式更新
- 卸载时关闭连接
- 重连定时器需要清理
- 高频消息应批量更新
- 消息要按 `taskId` 和序号去重

面试表达：

> WebSocket 实例本身不影响 UI，因此保存在 ref 中；连接和断开属于外部系统同步，放在 Effect 中。消息状态使用函数式更新，避免旧闭包覆盖；组件卸载时关闭连接并清理重连定时器。

------

## 2. 地图和 ECharts

```text
DOM 容器
→ useRef

地图或图表实例
→ useRef

初始化和销毁
→ useEffect

尺寸测量
→ 必要时 useLayoutEffect

图表配置计算
→ 真正昂贵时 useMemo
```

------

## 3. AI 流式聊天

不要每收到一个字符就：

```text
更新整个 messages 数组
→ 重新解析所有 Markdown
→ 重新渲染全部历史消息
```

更合理：

- 历史消息对象保持引用稳定
- 只更新最后一条消息
- 字符流先暂存在 ref
- 每帧或每几十毫秒批量提交到 state
- 历史消息分页加载
- 消息组件用稳定 ID 作为 key
- 昂贵 Markdown 结果按消息缓存

------

# 二十七、面试官高频追问

## 1. Hooks 为什么不能放条件里？

> React 根据 Hook 调用顺序将函数组件中的 Hook 与 Fiber 上保存的状态节点对应。条件调用会导致不同渲染中的顺序变化，因此状态会错位。

## 2. useEffect 是生命周期吗？

> 它可以覆盖部分生命周期场景，但更准确的理解是将组件状态与外部系统同步。每次依赖变化时，React 会先清理上一次同步，再建立新的同步关系。

## 3. 为什么会出现旧闭包？

> 每次渲染都有独立的 props、state 和事件函数。旧异步回调保存的是创建时那次渲染的状态快照，所以可能读取旧值。

## 4. 如何解决旧闭包？

> 根据场景选择函数式更新、补全依赖或使用 ref 保存最新值。不能为了避免重复执行而故意删依赖。

## 5. useRef 为什么不触发渲染？

> ref 是跨渲染保存的普通可变容器，修改 current 不会进入 React 状态更新队列。它适合保存 DOM、第三方实例、定时器和最新值，不适合作为需要展示的 UI 状态。

## 6. useMemo 和 useCallback 有什么区别？

> useMemo 缓存计算结果，useCallback 缓存函数引用。useCallback 可以近似理解为缓存函数本身的 useMemo。

## 7. useCallback 一定能优化性能吗？

> 不一定。它只稳定函数引用，通常需要配合 React.memo，或者用于依赖稳定性。它本身也有缓存和依赖比较成本。

## 8. React.memo 为什么可能失效？

> React.memo 默认浅比较 props。如果父组件每次都创建新对象、新数组或新函数，即使内容一样，引用仍然变化，memo 仍会认为 props 发生变化。

------

# 二十八、本章最容易犯的错误

1. 在条件语句中调用 Hook。
2. 把 state 当成可立即修改的变量。
3. 新状态依赖旧状态却不用函数式更新。
4. 定时器回调一直读取旧闭包。
5. 故意漏写 Effect 依赖。
6. 用 Effect 计算普通派生数据。
7. Effect 没有清理事件、定时器和连接。
8. 对象作为依赖，但每次渲染都重新创建。
9. 把地图和 WebSocket 实例放进 state。
10. 修改 ref 后期待页面重新渲染。
11. 无脑使用 `useMemo` 和 `useCallback`。
12. 使用 `useCallback`，但子组件没有 memo。
13. 使用 `React.memo`，却每次传新对象。
14. 把所有状态放进一个巨大 Context。
15. 性能问题没有测量就开始优化。

------

# 二十九、本章五分钟必背答案

> React Hooks 的状态保存在组件对应的 Fiber 上，React 根据 Hooks 的调用顺序，将每次渲染中的 useState、useEffect 等与之前保存的 Hook 节点对应。因此 Hook 必须在组件顶层按固定顺序调用，不能放在条件和循环中。
>
> React 的 state 是一次渲染的快照。调用 setState 是将更新加入队列，影响下一次渲染，不会修改当前函数里的状态变量。新状态依赖旧状态时，应该使用函数式更新，尤其是计数器、定时器、WebSocket 消息追加等场景。
>
> 每次渲染都会产生独立的函数闭包，所以异步回调可能保存旧状态。解决方案包括函数式更新、补全 Effect 依赖，或者使用 ref 保存最新值。不能通过故意漏依赖来逃避 Effect 重新执行。
>
> useEffect 的核心作用是将 React 组件与外部系统同步，例如请求、WebSocket、定时器和第三方实例。依赖变化时，React 会先执行上一次清理，再执行新的 Effect；组件卸载时执行最后一次清理。能够通过 props 和 state 直接计算的数据，不应该额外使用 Effect 和 state。
>
> useRef 用于保存跨渲染稳定、但修改后不需要触发渲染的数据，例如 DOM、地图实例、WebSocket、定时器和最新状态。useMemo 缓存计算结果，useCallback 缓存函数引用，React.memo 根据 props 浅比较决定是否跳过子组件渲染。它们都有成本，应该针对真实性能热点使用。
>
> React 性能优化应先优化状态位置和组件边界，再考虑 memo 化。状态应放在最低必要公共层级，复杂页面应拆分频繁变化和稳定区域；大列表真正有效的优化通常是分页或虚拟列表，而不是给每个函数都加 useCallback。

------

# 三十、本章自测

1. React 如何保存函数组件的 Hook 状态？
2. 为什么 Hooks 不能放在条件语句中？
3. 为什么调用 `setCount` 后打印的还是旧值？
4. 三次 `setCount(count + 1)` 为什么可能只加一次？
5. 什么情况下必须使用函数式更新？
6. 什么是状态快照？
7. 什么是旧闭包？
8. 定时器获取旧状态有哪三种解决方案？
9. `useEffect` 的真正作用是什么？
10. 哪些数据不应该通过 Effect 计算？
11. Effect 依赖变化时，清理和执行顺序是什么？
12. 为什么不能故意少写依赖？
13. 对象依赖为什么容易重复变化？
14. `useEffect` 和 `useLayoutEffect` 有什么区别？
15. `useRef` 和 `useState` 有什么区别？
16. 地图实例为什么适合放 ref？
17. `useMemo` 缓存什么？
18. `useCallback` 缓存什么？
19. `React.memo` 如何判断 props 是否变化？
20. 为什么 useCallback 可能毫无作用？
21. Context 为什么可能导致大范围更新？
22. 自定义 Hook 共享的是状态还是状态逻辑？
23. React 性能优化应该按什么顺序进行？
24. 长聊天流式输出应该如何减少渲染压力？
