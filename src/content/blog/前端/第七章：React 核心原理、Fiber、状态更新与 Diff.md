---
title: 第七章：React 核心原理、Fiber、状态更新与 Diff
slug: di-qi-zhang-react-he-xin-yuan-li-fiber-zhuang-tai-geng-xin-yu-diff
description: 这一章先学习 React 的整体运行模型。下一章再集中深入 Hooks、闭包陷阱和性能优化。
publishDate: '2026-08-02'
category: 前端
tags:
  - React
  - Vue
  - JavaScript
  - TypeScript
  - Node.js
  - 浏览器
  - 算法
  - AI
cover: auto
draft: false
featured: false
toc: true
---
这一章先学习 React 的整体运行模型。下一章再集中深入 Hooks、闭包陷阱和性能优化。

你的简历写了 React、TypeScript、函数组件、Hooks、React Router、WebSocket、地图 API、ECharts、复杂结果页组件化，以及企业工作台 React 磁贴开发。因此面试官不仅会问 `useState` 怎么用，还可能继续追问 React 为什么重新渲染、Fiber 解决了什么、状态为什么不会立即变化、Diff 如何复用节点。

------

# 一、本章必须建立的 React 总体模型

先记住 React 最核心的公式：

```text
UI = f(state)
```

含义是：

> 当前界面是当前状态经过组件函数计算得到的结果。

React 的完整更新链路可以概括为：

```text
事件触发
→ 调用状态更新函数
→ 更新进入队列
→ React 调度组件更新
→ 执行组件函数
→ 得到新的 React Element 树
→ Reconciliation 协调新旧结构
→ Fiber render 阶段计算变更
→ commit 阶段更新 DOM
→ 浏览器绘制页面
```

## 🔴 必背总答案

> React 是声明式 UI 框架。开发者通过组件描述状态对应的界面，状态变化后 React 重新执行相关组件，生成新的 React Element 树，再通过协调算法比较新旧结构。React 使用 Fiber 保存组件树、更新信息和任务优先级，render 阶段计算需要发生的变化，commit 阶段一次性将变化应用到真实 DOM。

------

# 二、JSX 的本质

JSX 看起来像 HTML：

```jsx
// 定义一个 React 函数组件
function UserCard() {
  // 返回 JSX 描述的界面结构
  return (
    // 创建用户卡片容器
    <div className="user-card">
      {/* 展示用户姓名 */}
      <h2>刘凤伟</h2>
    </div>
  );
}
```

但浏览器不能直接执行 JSX。

JSX 会在编译阶段转换成创建 React Element 的代码。

现代 JSX 编译结果可以近似理解为：

```js
// 从 JSX 运行时中导入创建元素的方法
import { jsx as _jsx } from 'react/jsx-runtime';

// 创建一个 React Element 对象
const element = _jsx('div', {
  // 设置元素的 className 属性
  className: 'user-card',

  // 设置元素的子节点
  children: _jsx('h2', {
    // 设置标题文本
    children: '刘凤伟',
  }),
});
```

早期写法可以近似理解为：

```js
// 使用 React.createElement 创建 React Element
const element = React.createElement(
  // 第一个参数表示元素类型
  'div',

  // 第二个参数表示元素属性
  {
    className: 'user-card',
  },

  // 后续参数表示子节点
  React.createElement(
    // 创建 h2 元素
    'h2',

    // 当前元素没有额外属性
    null,

    // 设置文本子节点
    '刘凤伟',
  ),
);
```

------

# 三、React Element、组件和真实 DOM 的区别

这三个概念不能混淆。

## 1. React Element

React Element 是一个普通 JavaScript 对象，用来描述 UI。

可以近似理解为：

```js
// 创建一个用于描述界面的普通对象
const element = {
  // 表示节点类型
  type: 'div',

  // 保存 key
  key: null,

  // 保存传给节点的属性
  props: {
    // 定义 className
    className: 'card',

    // 定义子节点
    children: 'React',
  },
};
```

它不是：

- 真实 DOM
- Fiber 节点
- 组件实例

------

## 2. 组件

函数组件本质上是：

> 接收 props，返回 React Element 的函数。

```jsx
// 定义用户卡片组件
function UserCard(props) {
  // 根据 props 返回界面描述
  return (
    // 创建标题元素
    <h2>
      {/* 展示传入的用户名 */}
      {props.name}
    </h2>
  );
}
```

------

## 3. Fiber

Fiber 是 React 内部用于表示工作单元的数据结构。

它会保存：

- 节点类型
- key
- props
- state
- 父子兄弟关系
- 更新队列
- 副作用标记
- 优先级信息
- 对应真实 DOM
- 当前树与工作树的关联

------

## 4. 真实 DOM

真实 DOM 是浏览器最终显示的节点。

```text
组件函数
→ React Element
→ Fiber
→ 真实 DOM
```

## 🔴 标准答案

> JSX 会被编译成创建 React Element 的代码。React Element 是描述界面的普通对象，组件是返回 React Element 的函数，而 Fiber 是 React 内部用于调度、协调和保存组件状态的工作节点。协调完成后，commit 阶段才会创建或更新真实 DOM。

------

# 四、React 组件为什么必须保持纯粹

理想的组件应该接近纯函数：

```text
相同 props + 相同 state
→ 相同 JSX 结果
```

推荐：

```jsx
// 定义价格组件
function Price(props) {
  // 根据传入价格计算展示文本
  const displayPrice = `¥${props.value}`;

  // 返回计算后的界面
  return (
    // 展示价格文本
    <span>
      {/* 渲染计算结果 */}
      {displayPrice}
    </span>
  );
}
```

不推荐在渲染期间修改外部数据：

```jsx
// 创建组件外部数组
const records = [];

// 定义存在副作用的组件
function UserCard(props) {
  // 错误：每次渲染都会修改外部数组
  records.push(props.user);

  // 返回用户信息
  return (
    // 展示用户姓名
    <div>
      {/* 读取用户名 */}
      {props.user.name}
    </div>
  );
}
```

为什么危险？

现代 React 的 render 阶段可能：

- 被重复执行
- 被中断
- 被重新开始
- 最终被放弃
- 在开发环境中被额外检查

因此 render 中不能依赖“只执行一次”。

## render 中应避免

- 直接发送请求
- 修改 DOM
- 修改外部变量
- 启动定时器
- 注册事件
- 改写 props
- 产生不可逆副作用

这些工作应该放到：

- 用户事件
- Effect
- 专门的数据请求层

## 🔴 标准答案

> React 组件渲染应保持纯粹，因为 Fiber 的 render 阶段可能被中断、重复或放弃。组件在渲染期间应该只根据 props 和 state 计算 JSX，不应发送请求、修改 DOM 或改变外部变量。副作用应放在事件处理或 Effect 中。

------

# 五、Props：父组件给子组件的只读输入

父组件：

```jsx
// 定义父组件
function App() {
  // 返回用户卡片
  return (
    // 将 name 和 age 作为 props 传给子组件
    <UserCard
      name="刘凤伟"
      age={22}
    />
  );
}
```

子组件：

```jsx
// 定义子组件并解构 props
function UserCard({ name, age }) {
  // 返回用户信息
  return (
    // 创建用户信息容器
    <div>
      {/* 展示姓名 */}
      <p>{name}</p>

      {/* 展示年龄 */}
      <p>{age}</p>
    </div>
  );
}
```

props 是只读的。

错误：

```jsx
// 定义错误的组件
function UserCard(props) {
  // 错误：直接修改父组件传入的 props
  props.name = '新名字';

  // 返回界面
  return (
    // 展示用户名
    <div>{props.name}</div>
  );
}
```

组件需要改变数据时，应：

```text
父组件保存状态
→ 父组件把状态作为 props 传入
→ 子组件通过回调通知父组件修改
```

------

# 六、State：组件自己的记忆

```jsx
// 从 React 中导入 useState
import { useState } from 'react';

// 定义计数组件
function Counter() {
  // 创建 count 状态和更新函数
  const [count, setCount] = useState(0);

  // 定义点击处理函数
  function handleClick() {
    // 请求 React 将 count 更新为下一个值
    setCount(count + 1);
  }

  // 返回按钮界面
  return (
    // 点击按钮时更新状态
    <button onClick={handleClick}>
      {/* 展示当前计数 */}
      {count}
    </button>
  );
}
```

调用：

```js
// 请求更新状态
setCount(count + 1);
```

不是直接修改当前变量，而是：

```text
向 React 提交一次状态更新
→ React 安排下一次渲染
→ 下一次组件执行时得到新状态
```

------

# 七、状态是一次渲染的“快照”

这是 React 最重要的思想之一。

每次组件函数执行，都会得到该次渲染对应的：

- props 快照
- state 快照
- 事件处理函数
- 局部变量

例如：

```jsx
// 从 React 中导入 useState
import { useState } from 'react';

// 定义计数组件
function Counter() {
  // 创建计数状态
  const [count, setCount] = useState(0);

  // 定义点击事件
  function handleClick() {
    // 请求下一次状态变为 count + 1
    setCount(count + 1);

    // 当前函数中的 count 仍属于本次渲染快照
    console.log(count);
  }

  // 返回按钮
  return (
    // 绑定点击事件
    <button onClick={handleClick}>
      {/* 展示当前状态 */}
      {count}
    </button>
  );
}
```

第一次点击时，控制台通常仍输出：

```text
0
```

不是因为 React “更新慢”，而是：

> 当前事件处理函数捕获的是本次渲染中的 count 快照。

下一次组件重新执行时，才能获得新 `count`。

## 📌 一句话记忆

> setState 改变的是下一次渲染，不会修改当前这一次渲染中的变量。

------

# 八、为什么连续三次 setCount 可能只加一次

```jsx
// 定义点击处理函数
function handleClick() {
  // 三次都基于当前渲染中的同一个 count
  setCount(count + 1);

  // 仍然请求设置成同一个结果
  setCount(count + 1);

  // 仍然请求设置成同一个结果
  setCount(count + 1);
}
```

假设当前 `count = 0`。

三次实际都是：

```text
setCount(1)
setCount(1)
setCount(1)
```

最终通常得到 `1`，不是 `3`。

------

## 使用函数式更新

```jsx
// 定义点击处理函数
function handleClick() {
  // 基于上一个队列状态加一
  setCount((previousCount) => {
    // 返回新的状态
    return previousCount + 1;
  });

  // 基于前一次更新结果继续加一
  setCount((previousCount) => {
    // 返回新的状态
    return previousCount + 1;
  });

  // 再次基于前一次结果加一
  setCount((previousCount) => {
    // 返回新的状态
    return previousCount + 1;
  });
}
```

状态队列近似处理为：

```text
初始值 0
→ 0 + 1 = 1
→ 1 + 1 = 2
→ 2 + 1 = 3
```

## 什么时候优先使用函数式更新

当新状态依赖旧状态时，例如：

- 计数器
- 数组追加
- 状态切换
- 并发回调
- 定时器更新
- WebSocket 消息追加

## 🔴 标准答案

> React 的 state 是当前渲染的快照。连续调用 `setCount(count + 1)` 时，多次更新读取的是同一个旧 count，因此可能都设置成相同值。新状态依赖旧状态时，应使用函数式更新，让 React 按更新队列依次计算每一步结果。

------

# 九、批处理 Batching

React 会尽量将同一批次中的多个状态更新合并，减少重复渲染。

```jsx
// 定义提交处理函数
function handleSubmit() {
  // 更新表单状态
  setFormData(nextFormData);

  // 关闭弹窗
  setVisible(false);

  // 清空错误信息
  setErrorMessage('');
}
```

React 通常不会机械地执行：

```text
更新 formData → 渲染一次
更新 visible → 再渲染一次
更新 errorMessage → 再渲染一次
```

而会尽量：

```text
收集本批次状态更新
→ 统一计算
→ 执行一次渲染
```

## 批处理的价值

- 减少组件函数执行
- 减少 Reconciliation
- 减少 DOM 提交
- 避免中间不一致界面

## ⚠️ 不要把 batching 理解成异步定时器

批处理是一种更新策略，不代表简单地：

```text
setTimeout 后再修改 state
```

------

# 十、状态相等时为什么可能跳过更新

React 判断新旧 state 时，会使用类似 `Object.is` 的比较语义。

```jsx
// 当前 count 已经是 1
setCount(1);
```

如果新值与旧值相同，React 可能跳过后续更新。

对于对象：

```jsx
// 创建用户状态
const [user, setUser] = useState({
  // 定义初始姓名
  name: '刘凤伟',
});

// 错误：直接修改原对象
user.name = '小刘';

// 仍然传入原对象引用
setUser(user);
```

因为引用仍然相同，React 很难从引用层面识别你修改了对象内部。

正确：

```jsx
// 使用函数式更新用户状态
setUser((previousUser) => {
  // 返回一个全新的对象
  return {
    // 复制旧用户字段
    ...previousUser,

    // 覆盖需要更新的字段
    name: '小刘',
  };
});
```

------

# 十一、为什么 React 强调不可变数据

不可变更新不是说对象永远不能修改，而是：

> 不直接修改 React 当前正在使用的状态对象，而是创建新引用表示新状态。

## 1. 便于识别变化

```text
旧引用 !== 新引用
→ 数据可能发生变化
```

这是浅比较、`React.memo`、依赖比较等优化的基础。

## 2. 保留历史快照

旧渲染中的事件函数仍可能持有旧状态。

不直接修改旧对象，可以保证：

```text
旧渲染看到旧数据
新渲染看到新数据
```

## 3. 支持中断和并发计算

React 可能同时维护：

- 当前已经显示的树
- 正在计算的新树

共享可变对象会破坏不同渲染之间的隔离。

## 4. 便于调试和回滚

不可变状态更适合：

- 时间旅行
- 撤销
- 状态快照
- 日志比较

## 🔴 满分答案

> React 强调不可变更新，不只是为了触发重新渲染。新引用便于浅比较判断变化，同时能保护不同渲染快照之间的隔离。Fiber 可能同时保留当前树和正在构建的工作树，如果直接修改共享状态，会破坏历史快照和并发渲染的一致性。

------

# 十二、数组状态的正确更新

## 添加元素

```jsx
// 使用函数式更新数组
setUsers((previousUsers) => {
  // 返回包含新用户的新数组
  return [
    // 保留原有用户
    ...previousUsers,

    // 添加新用户
    newUser,
  ];
});
```

## 删除元素

```jsx
// 使用函数式更新用户数组
setUsers((previousUsers) => {
  // 筛选出不需要删除的用户
  return previousUsers.filter((user) => {
    // 保留 ID 不匹配的用户
    return user.id !== deleteId;
  });
});
```

## 修改某个元素

```jsx
// 使用函数式更新用户数组
setUsers((previousUsers) => {
  // 映射生成新数组
  return previousUsers.map((user) => {
    // 判断是否为目标用户
    if (user.id !== targetId) {
      // 非目标用户保留原对象引用
      return user;
    }

    // 为目标用户创建新对象
    return {
      // 复制旧用户字段
      ...user,

      // 更新目标字段
      name: '新名字',
    };
  });
});
```

## 排序

```jsx
// 使用函数式更新数组
setUsers((previousUsers) => {
  // 先复制数组，避免 sort 修改原数组
  return [...previousUsers].sort((firstUser, secondUser) => {
    // 按年龄升序排列
    return firstUser.age - secondUser.age;
  });
});
```

------

# 十三、State 由组件在树中的位置决定

这是非常容易漏掉的深度知识。

React 并不是把状态简单存放在函数里。

状态实际与以下信息相关：

```text
组件类型
+
组件在 UI 树中的位置
+
key
```

例如：

```jsx
// 定义父组件
function App({ isAdmin }) {
  // 根据条件渲染组件
  return (
    // 创建页面容器
    <div>
      {/* 两个分支在相同位置使用相同组件类型 */}
      {isAdmin
        ? <UserForm role="admin" />
        : <UserForm role="user" />}
    </div>
  );
}
```

虽然 props 从 `admin` 变为 `user`，但当前位置仍然是相同的 `UserForm`。

React 可能保留组件状态。

------

## 使用 key 强制重置状态

```jsx
// 定义父组件
function App({ currentUserId }) {
  // 根据用户 ID 渲染表单
  return (
    // 使用用户 ID 作为 key
    <UserForm
      key={currentUserId}
      userId={currentUserId}
    />
  );
}
```

当 `currentUserId` 改变：

```text
key 改变
→ React 认为旧组件与新组件身份不同
→ 卸载旧组件
→ 创建新组件
→ 内部 state 被重置
```

## 🔴 标准答案

> React 的状态与组件在渲染树中的位置相关。相同位置、相同组件类型且 key 相同时，React 通常会保留状态；组件类型或 key 改变时，React 会将其视为新组件并重置状态。key 不只用于列表，也可以显式控制组件身份和状态重置。

------

# 十四、受控组件和非受控组件

## 1. 受控组件

输入框的值由 React state 控制。

```jsx
// 从 React 导入 useState
import { useState } from 'react';

// 定义搜索组件
function SearchInput() {
  // 创建关键词状态
  const [keyword, setKeyword] = useState('');

  // 定义输入事件处理函数
  function handleChange(event) {
    // 使用输入框最新值更新状态
    setKeyword(event.target.value);
  }

  // 返回输入框
  return (
    // 通过 state 控制 value
    <input
      value={keyword}
      onChange={handleChange}
    />
  );
}
```

数据流：

```text
state
→ input value
→ 用户输入
→ onChange
→ setState
→ 新 state
→ input value 更新
```

优点：

- 容易做实时校验
- 容易联动其他组件
- 容易统一提交
- 数据源明确

缺点：

- 每次输入都会触发状态更新
- 大型表单需要合理拆分

------

## 2. 非受控组件

表单值主要保存在 DOM 中，通过 ref 读取。

```jsx
// 从 React 导入 useRef
import { useRef } from 'react';

// 定义非受控表单
function SearchForm() {
  // 创建输入框 DOM 引用
  const inputRef = useRef(null);

  // 定义提交处理函数
  function handleSubmit(event) {
    // 阻止浏览器默认提交行为
    event.preventDefault();

    // 从真实 DOM 中读取当前值
    console.log(inputRef.current.value);
  }

  // 返回表单
  return (
    // 绑定提交事件
    <form onSubmit={handleSubmit}>
      {/* 使用 defaultValue 设置初始值 */}
      <input
        ref={inputRef}
        defaultValue=""
      />

      {/* 创建提交按钮 */}
      <button type="submit">
        提交
      </button>
    </form>
  );
}
```

适合：

- 简单表单
- 一次性读取
- 文件上传
- 第三方非 React 表单库
- 不需要实时联动的场景

## 🔴 标准答案

> 受控组件的表单值由 React state 作为唯一数据源，通过 value 和 onChange 同步；非受控组件主要由 DOM 保存值，通过 ref 在需要时读取。受控组件适合实时校验和联动，非受控组件适合简单表单、文件输入或第三方 DOM 集成。

------

# 十五、组件通信方式

| 场景            | 推荐方式                  |
| --------------- | ------------------------- |
| 父传子          | props                     |
| 子通知父        | 回调 props                |
| 兄弟组件        | 状态提升到共同父组件      |
| 跨层共享        | Context                   |
| 复杂全局状态    | 状态管理库                |
| 路由状态        | params、query、路由 state |
| 父操作 DOM 能力 | ref                       |
| 跨 DOM 层级浮层 | Portal                    |

------

## 子组件通知父组件

父组件：

```jsx
// 定义父组件
function App() {
  // 定义提交处理函数
  function handleSubmit(formData) {
    // 输出子组件提交的数据
    console.log(formData);
  }

  // 返回子组件
  return (
    // 将回调函数传给子组件
    <UserForm onSubmit={handleSubmit} />
  );
}
```

子组件：

```jsx
// 定义子组件
function UserForm({ onSubmit }) {
  // 定义点击处理函数
  function handleClick() {
    // 调用父组件传入的回调
    onSubmit({
      // 传递用户姓名
      name: '刘凤伟',
    });
  }

  // 返回按钮
  return (
    // 点击后通知父组件
    <button onClick={handleClick}>
      提交
    </button>
  );
}
```

React 不叫 `emit`，本质是：

> 父组件将函数作为 props 传入，子组件调用这个函数。

------

# 十六、状态提升

两个兄弟组件需要共享状态时，通常将状态提升到最近的共同父组件。

```jsx
// 从 React 导入 useState
import { useState } from 'react';

// 定义父组件
function TemperaturePage() {
  // 在共同父组件中保存温度状态
  const [temperature, setTemperature] = useState('');

  // 返回两个共享状态的子组件
  return (
    // 创建页面容器
    <div>
      {/* 摄氏度组件读取和更新共同状态 */}
      <CelsiusInput
        value={temperature}
        onChange={setTemperature}
      />

      {/* 结果组件读取相同状态 */}
      <TemperatureResult value={temperature} />
    </div>
  );
}
```

## ⚠️ 不要过度提升

所有状态都提升到最顶层会导致：

- 父组件庞大
- props 层层传递
- 更新范围扩大
- 组件耦合加重

原则：

> 状态放在能够满足共享需求的最低公共层级。

------

# 十七、Context 的核心原理和问题

Context 用于跨层级共享数据：

- 主题
- 国际化
- 当前用户
- 权限
- 全局配置

创建 Context：

```jsx
// 从 React 导入 createContext
import { createContext } from 'react';

// 创建用户上下文
export const UserContext = createContext(null);
```

提供数据：

```jsx
// 定义应用组件
function App() {
  // 创建当前用户对象
  const currentUser = {
    // 定义用户姓名
    name: '刘凤伟',
  };

  // 使用 Provider 提供数据
  return (
    // 向后代组件提供用户数据
    <UserContext.Provider value={currentUser}>
      {/* 渲染页面组件 */}
      <ProfilePage />
    </UserContext.Provider>
  );
}
```

读取数据：

```jsx
// 从 React 导入 useContext
import { useContext } from 'react';

// 定义用户信息组件
function UserName() {
  // 读取最近的 UserContext 值
  const user = useContext(UserContext);

  // 返回用户名
  return (
    // 展示用户姓名
    <span>{user.name}</span>
  );
}
```

------

## Context 的性能问题

Provider 的 `value` 变化时，消费该 Context 的组件需要重新计算。

错误：

```jsx
// 每次 App 渲染都会创建新对象
<UserContext.Provider
  value={{
    // 设置用户名
    name: '刘凤伟',
  }}
>
  {/* 渲染子组件 */}
  <ProfilePage />
</UserContext.Provider>
```

即使内容相同，对象引用每次都不同。

复杂项目应考虑：

- 拆分 Context
- 稳定 Provider value
- 区分状态和 dispatch
- 使用专门的状态管理方案
- 避免一个巨型 Context 保存所有数据

## 🔴 标准答案

> Context 适合主题、用户和国际化等跨层共享，但它不是无成本的全局状态方案。Provider value 发生引用变化时，相关消费者会重新参与渲染。大型状态应拆分 Context 或使用支持细粒度订阅的状态管理方案。

------

# 十八、React 的事件系统

JSX 事件写法：

```jsx
// 定义按钮组件
function SubmitButton() {
  // 定义点击处理函数
  function handleClick(event) {
    // 输出事件目标
    console.log(event.currentTarget);
  }

  // 返回按钮
  return (
    // 使用驼峰形式绑定事件
    <button onClick={handleClick}>
      提交
    </button>
  );
}
```

与原生 DOM 的主要区别：

- 使用驼峰命名，如 `onClick`
- 传入函数，而不是字符串
- React 提供统一的事件对象
- 现代 React 通常通过根容器层的事件代理处理大部分事件

------

## 1. target 与 currentTarget

```jsx
// 定义带子元素的按钮
function Button() {
  // 定义点击处理函数
  function handleClick(event) {
    // target 表示实际触发事件的最深层元素
    console.log(event.target);

    // currentTarget 表示当前绑定处理函数的元素
    console.log(event.currentTarget);
  }

  // 返回按钮
  return (
    // 在按钮上绑定事件
    <button onClick={handleClick}>
      {/* 点击 span 时，target 可能是 span */}
      <span>提交</span>
    </button>
  );
}
```

------

## 2. 阻止默认行为

```jsx
// 定义提交处理函数
function handleSubmit(event) {
  // 阻止表单默认刷新页面
  event.preventDefault();

  // 执行业务提交逻辑
  submitForm();
}
```

------

## 3. 阻止冒泡

```jsx
// 定义子元素点击处理函数
function handleChildClick(event) {
  // 阻止事件继续向父元素传播
  event.stopPropagation();

  // 执行子元素逻辑
  console.log('点击子元素');
}
```

------

## 4. 为什么使用事件代理

假设列表中有一万个按钮。

如果每个按钮都单独注册原生事件，管理成本更高。

事件代理通过冒泡统一处理，可以：

- 减少大量底层监听注册
- 统一事件行为
- 更方便适配 React 渲染树
- 支持优先级调度和批处理

## 🟡 深度回答

> React 的事件处理不仅是简单封装原生事件。事件属于用户更新入口，React 可以根据事件类型赋予不同更新优先级，例如输入和点击通常比非紧急渲染更需要及时响应。

------

# 十九、React 的渲染流程

React 的更新过程通常分成两个主要阶段：

```text
Render 阶段
+
Commit 阶段
```

这是面试必考。

------

# 二十、Render 阶段做什么

Render 阶段也可以叫：

- Reconciliation 阶段
- 协调阶段
- 计算阶段

主要工作包括：

- 执行函数组件
- 处理状态更新队列
- 计算新的 React Element
- 构建或复用 Fiber
- 比较新旧子节点
- 标记新增、更新、删除、移动
- 收集需要提交的副作用

Render 阶段的特点：

- 主要进行计算
- 不应该产生用户可见副作用
- 可能被中断
- 可能被重新开始
- 可能被放弃
- 不保证一定进入 commit

## 📌 记忆

> Render 阶段是在内存中算“应该怎么改”，不是立即修改页面。

------

# 二十一、Commit 阶段做什么

Commit 阶段将 render 阶段计算出的变化真正应用到页面。

主要工作包括：

- 插入 DOM
- 删除 DOM
- 更新 DOM 属性
- 更新 ref
- 执行相关生命周期
- 处理布局副作用
- 安排普通副作用

Commit 阶段的特点：

- 会修改真实 DOM
- 通常不可随意中断
- 必须保持页面结果一致
- 应尽量快速完成

## 📌 记忆

> Commit 阶段是把计算结果真正落到页面。

------

## 🔴 Render 与 Commit 标准答案

> Render 阶段负责执行组件、处理状态更新、构建 Fiber 和计算 DOM 变更，它主要是内存计算，可以被中断或重做，因此必须保持纯粹。Commit 阶段负责把变更一次性应用到真实 DOM，并处理 ref 和相关副作用，通常需要同步连续完成，避免用户看到不完整界面。

------

# 二十二、为什么需要 Fiber

早期的递归协调过程一旦开始，就可能持续执行到整棵组件树处理完成。

假设组件树很大：

```text
开始更新
→ 连续计算 100ms
→ 主线程一直被占用
→ 用户点击无法处理
→ 输入卡顿
→ 动画掉帧
```

Fiber 的目标是：

> 将渲染工作拆分成多个可以调度的工作单元。

每个 Fiber 可以代表：

- 一个组件
- 一个原生元素
- 一个文本节点
- 一个 Fragment
- 其他 React 节点

处理完一个 Fiber 后，React 可以判断：

```text
当前是否还有时间
是否有更高优先级任务
是否应该暂停当前工作
```

------

# 二十三、Fiber 是一种数据结构，也是架构

Fiber 不只是“链表”。

它同时代表：

## 1. 工作单元

每个节点可以被单独处理。

## 2. 组件实例记录

保存组件的：

- props
- state
- update queue
- hooks
- DOM
- effect 标记

## 3. 可遍历的树结构

主要通过以下指针组织：

```text
return：父 Fiber
child：第一个子 Fiber
sibling：下一个兄弟 Fiber
```

近似结构：

```js
// 创建一个帮助理解的 Fiber 对象
const fiber = {
  // 保存节点类型
  type: UserCard,

  // 保存节点 key
  key: null,

  // 指向父 Fiber
  return: parentFiber,

  // 指向第一个子 Fiber
  child: childFiber,

  // 指向下一个兄弟 Fiber
  sibling: siblingFiber,

  // 保存当前使用的 props
  memoizedProps: currentProps,

  // 保存当前使用的 state
  memoizedState: currentState,

  // 保存本次更新的新 props
  pendingProps: nextProps,

  // 指向真实 DOM 或组件相关实例
  stateNode: domElement,

  // 保存本次需要执行的 DOM 操作标记
  flags: updateFlag,

  // 连接当前树和工作树
  alternate: anotherFiber,
};
```

这只是概念模型，不是完整源码结构。

------

# 二十四、Fiber 如何实现可中断

传统递归：

```js
// 递归处理当前节点
function walk(node) {
  // 处理当前节点
  processNode(node);

  // 递归处理所有子节点
  node.children.forEach((child) => {
    // 进入子节点递归
    walk(child);
  });
}
```

递归调用开始后，不容易在任意节点暂停并保存完整执行位置。

Fiber 将树转换成带指针的工作结构：

```text
处理当前 Fiber
→ 有 child 就进入 child
→ 没有 child 就寻找 sibling
→ 没有 sibling 就返回父节点
```

每完成一个工作单元，都可以把下一节点记录下来。

这样 React 可以：

- 暂停低优先级任务
- 保存当前进度
- 先处理用户输入
- 再继续或重新开始工作

------

# 二十五、Current Tree 与 WorkInProgress Tree

React 内部可以近似理解为维护两棵 Fiber 树：

## Current Tree

当前已经提交到页面、用户正在看到的树。

## WorkInProgress Tree

React 正在内存中计算的新树。

两棵树通过：

```text
alternate
```

相互关联。

更新过程：

```text
Current Tree
→ 基于 current 构建 WorkInProgress Tree
→ render 阶段计算完成
→ commit 阶段切换根指针
→ WorkInProgress 成为新的 Current
```

## 为什么这样设计

- 用户始终看到完整的旧页面
- 新页面可以在内存中逐步计算
- render 中断不会破坏当前页面
- 完成后一次性提交

## 🔴 加分答案

> Fiber 通过 current 与 workInProgress 双缓冲树，将“当前已显示的页面”和“正在计算的新页面”隔离。render 阶段即使被中断或放弃，也不会直接破坏用户当前看到的 DOM；只有计算完成后，commit 才切换并应用结果。

------

# 二十六、优先级和调度

不同更新的紧急程度不同。

例如：

## 高优先级

- 用户输入
- 点击反馈
- 光标移动
- 表单交互

## 较低优先级

- 大列表筛选结果
- 非关键图表更新
- 后台内容刷新
- 非紧急页面过渡

React 内部会给更新分配优先级信息，并决定：

- 哪个更新先处理
- 当前工作是否需要让步
- 多个更新能否合并
- 低优先级任务是否重新计算

面试不必死背全部内部优先级位图，但必须理解：

> Fiber 解决任务拆分，调度系统负责决定先处理谁。

------

# 二十七、Fiber 是否让 DOM 更新也可中断

不是。

需要严格区分：

```text
Render 阶段可以中断
Commit 阶段通常不可中断
```

因为 commit 阶段如果更新一半停下来：

```text
一部分 DOM 是新状态
另一部分 DOM 是旧状态
```

用户会看到不一致界面。

所以 React 会：

```text
先在内存中计算完整结果
→ 再连续完成 DOM 提交
```

## 🔴 高频标准答案

> Fiber 主要让 render 阶段的计算可以拆分、暂停和重做，并不意味着真实 DOM 修改可以随意中断。Commit 阶段通常需要同步完成，以保证用户不会看到一半新、一半旧的不一致页面。

------

# 二十八、Reconciliation 协调算法

Reconciliation 负责判断：

```text
新的 React Element 树
与
旧 Fiber 树
之间如何复用
```

如果对任意两棵树使用精确树编辑距离算法，复杂度可能非常高。

React 基于两个主要假设，将复杂度近似控制在 O(n)。

## 假设一：不同类型的元素会产生不同的树

旧节点：

```jsx
// 旧结构是 div
<div>
  {/* 渲染用户卡片 */}
  <UserCard />
</div>
```

新节点：

```jsx
// 新结构是 section
<section>
  {/* 渲染用户卡片 */}
  <UserCard />
</section>
```

根类型从 `div` 变成 `section`。

React 通常会认为：

```text
旧 div 子树不能整体复用
→ 卸载旧子树
→ 创建新 section 子树
```

即使内部都有 `UserCard`，状态也可能被重置。

------

## 假设二：开发者通过 key 表示稳定节点身份

列表中 React 通过 key 判断：

```text
哪些节点仍然存在
哪些节点被删除
哪些节点被新增
哪些节点改变位置
```

------

# 二十九、相同类型与不同类型如何处理

## 1. 相同原生元素类型

旧：

```jsx
// 旧节点
<div className="old">
  旧文本
</div>
```

新：

```jsx
// 新节点
<div className="new">
  新文本
</div>
```

React 通常会：

- 复用原 `div` DOM
- 更新 `className`
- 更新文本内容

------

## 2. 不同原生元素类型

旧：

```jsx
// 旧节点是 div
<div />
```

新：

```jsx
// 新节点是 span
<span />
```

React 会：

- 删除旧 `div`
- 创建新 `span`
- 旧子树状态被销毁

------

## 3. 相同组件类型

旧：

```jsx
// 旧组件
<UserCard userId="1" />
```

新：

```jsx
// 新组件，类型仍为 UserCard
<UserCard userId="2" />
```

React 通常复用组件身份：

- 保留内部 state
- 更新 props
- 重新执行组件函数

------

## 4. 不同组件类型

旧：

```jsx
// 旧组件类型
<UserCard />
```

新：

```jsx
// 新组件类型
<AdminCard />
```

React 会卸载旧组件，创建新组件。

------

# 三十、React 列表 Diff

旧列表：

```text
A B C D
```

新列表：

```text
A C D B
```

React 会先从前向后比较。

## 1. 前部相同节点复用

```text
旧 A 与新 A
→ type、key 相同
→ 复用
```

## 2. 遇到不匹配后

React 会为剩余旧节点建立映射，便于按 key 查找：

```text
B → 旧位置 1
C → 旧位置 2
D → 旧位置 3
```

遍历新节点：

```text
C → 找到旧 C
D → 找到旧 D
B → 找到旧 B
```

React 会根据旧位置与当前移动基准，判断节点是否需要移动。

------

# 三十一、React Diff 与 Vue3 Diff 的重要区别

Vue3 在 keyed 中间区域会使用最长递增子序列，尽量减少 DOM 移动。

React 的列表协调通常不会使用 Vue3 相同的 LIS 优化方式。

React 更接近维护一个：

```text
lastPlacedIndex
```

表示目前已确认节点在旧列表中的最大位置。

简化理解：

旧：

```text
A B C D
```

新：

```text
A C D B
```

A：

```text
旧位置 0
lastPlacedIndex = 0
→ 不移动
```

C：

```text
旧位置 2 >= 0
lastPlacedIndex = 2
→ 不移动
```

D：

```text
旧位置 3 >= 2
lastPlacedIndex = 3
→ 不移动
```

B：

```text
旧位置 1 < 3
→ 相对位置倒退
→ 标记移动
```

这个例子只移动 B，结果很好。

但某些复杂倒序场景中，React 可能产生比 LIS 更多的移动。

## 🔴 高分回答

> React 和 Vue 都基于 type 与 key 进行同层协调，但具体列表优化不同。Vue3 对乱序 keyed children 会构建新旧索引映射并求最长递增子序列，以保留最大的不移动节点集合。React 通常通过顺序遍历、旧节点 Map 和 lastPlacedIndex 判断节点是否移动，实现更通用的运行时协调，但不采用 Vue3 相同的 LIS 策略。

------

# 三十二、为什么 React 不跨层级寻找节点

假设旧结构：

```jsx
// 旧结构
<div>
  {/* 用户组件在 div 下 */}
  <UserCard />
</div>
```

新结构：

```jsx
// 新结构
<section>
  {/* 内部再增加一层 div */}
  <div>
    {/* 用户组件移动到更深层级 */}
    <UserCard />
  </div>
</section>
```

React 通常不会进行昂贵的全树搜索：

```text
这个 UserCard 会不会是其他层级移动过来的？
```

而是按照当前层级进行协调。

原因：

- 全树精确匹配成本过高
- 大部分 UI 更新遵循局部结构变化
- key 主要在同层列表中表达身份

因此 React Diff 的核心规则之一是：

> 同层比较。

------

# 三十三、Key 的真正作用

## 1. key 标识兄弟节点身份

```jsx
// 渲染用户列表
users.map((user) => {
  // 返回用户卡片
  return (
    // 使用稳定用户 ID 作为 key
    <UserCard
      key={user.id}
      user={user}
    />
  );
});
```

key 主要在同一组兄弟节点中需要稳定唯一。

------

## 2. key 不会作为普通 props 传入

```jsx
// 渲染用户卡片
<UserCard
  key={user.id}
  user={user}
/>
```

子组件中不能通过：

```js
// 错误：key 不会出现在普通 props 中
props.key;
```

需要业务 ID 时必须单独传入：

```jsx
// 同时传入 key 和 userId
<UserCard
  key={user.id}
  userId={user.id}
  user={user}
/>
```

------

## 3. 为什么不能使用 index

旧：

```text
索引0：用户A
索引1：用户B
索引2：用户C
```

删除 A 后：

```text
索引0：用户B
索引1：用户C
```

使用 index 作为 key 时：

```text
旧 key=0 是用户A
新 key=0 是用户B
```

React 可能复用原用户 A 对应的组件状态给用户 B。

容易出问题的场景：

- 输入框
- checkbox
- 子组件内部 state
- 动画
- 焦点
- 第三方实例

------

## 4. 什么时候 index 勉强可用

- 列表完全静态
- 不会插入
- 不会删除
- 不会排序
- 子项没有内部状态
- 没有稳定业务 ID

## 🔴 标准答案

> key 用于标识同层兄弟节点的稳定身份，帮助 React 复用 Fiber 和组件状态。动态列表使用 index，增删排序后同一个 key 可能对应不同业务数据，从而导致组件状态错误复用。key 不会作为普通 props 传入，需要业务 ID 时必须额外传递。

------

# 三十四、随机 key 为什么严重错误

```jsx
// 错误：每次渲染都生成全新的 key
<UserCard
  key={Math.random()}
  user={user}
/>
```

每次父组件重新渲染：

```text
旧 key 与新 key 不同
→ React 认为不是同一组件
→ 卸载旧组件
→ 创建新组件
→ state 重置
→ Effect 重新执行
→ DOM 重新创建
```

这不是“避免复用”，而是破坏 React 的协调能力。

------

# 三十五、条件渲染中的状态复用陷阱

```jsx
// 定义登录表单页面
function LoginPage({ usePhone }) {
  // 根据登录模式渲染输入框
  return (
    // 创建表单容器
    <div>
      {/* 两个分支都在相同位置渲染 input */}
      {usePhone
        ? <input placeholder="请输入手机号" />
        : <input placeholder="请输入邮箱" />}
    </div>
  );
}
```

两个分支在相同位置，类型都是 `input`。

React 可能复用同一个 DOM，因此切换后输入值可能被保留。

需要重置时：

```jsx
// 根据登录方式设置不同 key
{usePhone
  ? (
    // 手机号输入框使用 phone key
    <input
      key="phone"
      placeholder="请输入手机号"
    />
  )
  : (
    // 邮箱输入框使用 email key
    <input
      key="email"
      placeholder="请输入邮箱"
    />
  )}
```

## 加分结论

> key 不只是列表优化提示，也是组件身份的一部分，可以主动控制状态保留还是重置。

------

# 三十六、Fragment

React 组件需要返回单个顶层结构，但可以使用 Fragment 避免额外 DOM。

```jsx
// 定义用户信息组件
function UserInfo() {
  // 使用 Fragment 包裹多个兄弟节点
  return (
    // Fragment 不会额外生成真实 DOM
    <>
      {/* 展示用户姓名 */}
      <h2>刘凤伟</h2>

      {/* 展示用户学校 */}
      <p>广东金融学院</p>
    </>
  );
}
```

带 key 的 Fragment 需要显式写法：

```jsx
// 从 React 中导入 Fragment
import { Fragment } from 'react';

// 渲染分组列表
groups.map((group) => {
  // 返回带 key 的 Fragment
  return (
    // 使用业务 ID 作为 Fragment 的 key
    <Fragment key={group.id}>
      {/* 展示分组标题 */}
      <h2>{group.title}</h2>

      {/* 展示分组内容 */}
      <p>{group.content}</p>
    </Fragment>
  );
});
```

------

# 三十七、Portal

Portal 可以将 React 子树渲染到当前 DOM 层级之外。

```jsx
// 从 react-dom 导入 createPortal
import { createPortal } from 'react-dom';

// 定义弹窗组件
function Dialog({ children }) {
  // 将弹窗内容渲染到 body 下的容器
  return createPortal(
    // 创建弹窗结构
    <div className="dialog">
      {/* 渲染外部传入内容 */}
      {children}
    </div>,

    // 指定真实 DOM 挂载容器
    document.body,
  );
}
```

适合：

- Modal
- Tooltip
- Toast
- Drawer
- 全局 Loading

## Portal 改变什么

改变：

- 真实 DOM 挂载位置

不改变：

- React 组件父子关系
- Context 继承
- React 事件传播关系
- props 数据流

这与 Vue 的 Teleport 思想类似。

------

# 三十八、React Error Boundary

普通 `try/catch` 不能直接捕获所有子组件渲染错误。

Error Boundary 用于捕获子树中的：

- 渲染错误
- 生命周期错误
- 部分组件逻辑错误

传统类组件示例：

```jsx
// 从 React 导入 Component
import { Component } from 'react';

// 定义错误边界组件
class ErrorBoundary extends Component {
  // 初始化组件状态
  state = {
    // 标记是否发生错误
    hasError: false,
  };

  // 当子组件抛错时更新降级状态
  static getDerivedStateFromError() {
    // 返回新的错误状态
    return {
      // 标记已经发生错误
      hasError: true,
    };
  }

  // 捕获错误并进行日志上报
  componentDidCatch(error, errorInfo) {
    // 输出错误信息
    console.error(error, errorInfo);
  }

  // 渲染错误边界内容
  render() {
    // 判断是否发生错误
    if (this.state.hasError) {
      // 返回降级界面
      return (
        // 展示错误提示
        <div>页面出现异常，请稍后重试</div>
      );
    }

    // 正常情况下渲染子组件
    return this.props.children;
  }
}
```

## Error Boundary 通常不能自动捕获

- 事件处理器中的错误
- 自己内部的错误
- 普通异步回调错误
- 服务端渲染阶段的部分错误

事件处理器应自行：

```jsx
// 定义事件处理函数
async function handleSubmit() {
  // 开始捕获业务异常
  try {
    // 执行异步提交
    await submitData();
  } catch (error) {
    // 处理提交异常
    showError(error);
  }
}
```

## 🟢 项目表达

复杂行程结果页可以按模块设置错误边界：

```text
地图模块报错
→ 地图模块降级
→ 行程正文仍然可用

知识图谱报错
→ 隐藏图谱
→ 不影响预算和日程
```

这比整个页面白屏更稳健。

------

# 三十九、StrictMode 为什么可能重复调用

开发环境中，StrictMode 可能额外调用某些函数或执行清理检查，以帮助发现：

- render 中存在副作用
- Effect 没有正确清理
- 依赖外部可变状态
- 组件无法安全重新挂载

因此开发环境看到：

- 日志出现多次
- 请求发送多次
- Effect 执行、清理、再执行

不应该第一反应是：

> React 有 Bug。

而应该检查：

- 请求是否放错位置
- Effect 是否有清理
- 是否缺少请求去重
- 组件逻辑是否纯粹

## 🔴 高分答案

> StrictMode 的额外执行主要用于开发阶段暴露不纯渲染和副作用清理问题。生产环境不会简单照搬这些开发检查。组件和 Effect 应设计成可以安全地执行、清理和重新执行，而不是依赖“只运行一次”。

------

# 四十、React 与 Vue 更新模型的核心差异

## Vue

更接近：

```text
响应式读取时收集依赖
→ 数据变化
→ 精确知道哪些组件或副作用受影响
```

模板编译器还能提供：

- PatchFlag
- 静态提升
- Block Tree

## React

更接近：

```text
显式调用状态更新函数
→ 从更新组件开始重新计算
→ 通过 Fiber 和协调算法判断哪些子树可以复用
```

React 函数组件本身通常会重新执行。

但：

> 组件函数重新执行，不等于真实 DOM 全部重建。

中间还有：

- React Element
- Fiber 复用
- Diff
- memo 优化
- commit 最小更新

------

## 🔴 Vue 与 React 满分对比

> Vue 和 React 都采用声明式组件化与虚拟 DOM，但更新触发机制不同。Vue 通过响应式依赖收集知道哪些组件受状态影响，并结合编译器标记缩小更新范围；React 通过显式状态更新安排组件重新计算，再依靠 Fiber 协调和组件边界复用。React 函数组件重新执行不代表 DOM 全部重建，真实 DOM 只在 commit 阶段按协调结果更新。

------

# 四十一、React 重新渲染不等于 DOM 重新创建

父组件状态变化：

```text
父组件函数重新执行
→ 产生新的 React Element
→ 子组件可能重新参与协调
```

但只要：

- 节点类型相同
- key 相同
- DOM 属性未变化

React 可以复用原真实 DOM。

例如：

```jsx
// 定义计数组件
function Counter({ count }) {
  // 返回固定结构的按钮
  return (
    // div 节点通常可以复用
    <div>
      {/* 只更新发生变化的文本 */}
      {count}
    </div>
  );
}
```

从 `count=1` 变成 `count=2`：

```text
组件函数重新执行
→ 生成新 React Element
→ 复用原 div
→ 只更新文本节点
```

## 📌 一句话记忆

> Render 是重新计算界面描述，commit 才是真正修改 DOM。

------

# 四十二、什么时候子组件会重新渲染

默认情况下，父组件重新执行时，父组件 JSX 中直接创建的普通子组件通常也会重新参与渲染。

```jsx
// 定义父组件
function Parent() {
  // 创建父组件状态
  const [count, setCount] = useState(0);

  // 返回父子结构
  return (
    // 创建容器
    <div>
      {/* 更新父组件状态 */}
      <button onClick={() => setCount(count + 1)}>
        {count}
      </button>

      {/* 子组件也会重新参与渲染 */}
      <Child />
    </div>
  );
}
```

即使 `Child` 没有接收变化的 props，它的函数也可能重新执行。

这不一定是严重问题。

React 的原则是：

> 先保证正确，再对确实存在的性能热点进行优化。

下一章会深入：

- `React.memo`
- `useMemo`
- `useCallback`
- 状态下沉
- children 模式
- Context 拆分

------

# 四十三、React 组件设计原则

## 1. 单一职责

星途智旅行程结果页不应该写成一个三千行组件。

可以拆分：

```text
TripResultPage
├── TripOverview
├── DailyPlanList
├── AttractionCard
├── WeatherPanel
├── HotelPanel
├── RestaurantPanel
├── BudgetSummary
├── RouteMap
├── KnowledgeGraph
└── AIChatAssistant
```

------

## 2. 数据组件和展示组件适度分离

数据组件负责：

- 请求
- 状态
- 权限
- 错误
- 加载

展示组件负责：

- 接收 props
- 渲染 UI
- 触发回调

不必机械地拆成两套，但复杂页面中很有价值。

------

## 3. 状态尽量靠近使用位置

地图缩放级别只在地图组件使用：

> 放在地图组件内部。

用户信息被全局使用：

> 放 Context 或状态管理层。

表单中一个输入框的临时状态：

> 不要直接塞进全局 Store。

------

## 4. 避免重复状态

错误：

```jsx
// 保存原始价格
const [price, setPrice] = useState(100);

// 保存数量
const [quantity, setQuantity] = useState(2);

// 错误：总价可以计算，却又单独保存
const [totalPrice, setTotalPrice] = useState(200);
```

推荐：

```jsx
// 保存原始价格
const [price, setPrice] = useState(100);

// 保存商品数量
const [quantity, setQuantity] = useState(2);

// 直接根据当前状态计算总价
const totalPrice = price * quantity;
```

原则：

> 能从现有 props 和 state 计算出来的数据，通常不需要再保存成 state。

------

# 四十四、你的星途智旅项目怎么讲 React 架构

可以这样回答：

> 星途智旅结果页包含行程概览、每日安排、景点、天气、酒店餐饮、预算、地图、知识图谱和 AI 问答。我没有把所有逻辑堆在单个组件，而是先通过 TypeScript 建模 TripPlan、DayPlan 和 Budget，再按业务区域拆分组件。页面容器负责请求状态、WebSocket 任务进度和模块降级，展示组件主要通过 props 接收数据。地图和 ECharts 实例由各自组件管理，避免全局状态膨胀；共享的行程上下文只保存确实需要跨模块消费的数据。

------

# 四十五、项目拷打：WebSocket 消息怎么更新 React 状态

错误写法：

```jsx
// 假设 messages 是当前渲染快照
socket.onmessage = (event) => {
  // 错误：可能基于旧闭包中的 messages 追加
  setMessages([
    // 展开旧快照
    ...messages,

    // 添加新消息
    JSON.parse(event.data),
  ]);
};
```

更稳妥：

```jsx
// 监听 WebSocket 消息
socket.onmessage = (event) => {
  // 解析服务器消息
  const nextMessage = JSON.parse(event.data);

  // 使用函数式更新避免旧闭包覆盖
  setMessages((previousMessages) => {
    // 返回包含新消息的新数组
    return [
      // 保留之前所有消息
      ...previousMessages,

      // 添加最新消息
      nextMessage,
    ];
  });
};
```

但流式消息每个字符都更新一次也可能性能差。

可以：

- 缓冲一小段内容
- 按帧或固定间隔批量更新
- 只更新最后一条消息
- 保持其他消息对象引用稳定
- 长历史消息分页或分层加载

------

# 四十六、项目拷打：地图实例为什么不用 state

错误思路：

```jsx
// 不推荐：将地图实例保存为 state
const [mapInstance, setMapInstance] = useState(null);
```

地图实例改变并不一定需要触发界面渲染。

更适合：

```jsx
// 从 React 导入 useRef
import { useRef } from 'react';

// 创建地图实例引用
const mapInstanceRef = useRef(null);

// 初始化地图
function initializeMap(container) {
  // 保存地图实例，但不会触发渲染
  mapInstanceRef.current = createMap(container);
}
```

原因：

- 地图实例是可变对象
- 修改实例不应触发 React render
- 生命周期内需要稳定保存
- 需要在卸载时销毁
- 避免第三方对象进入状态比较

下一章会深入 `useRef`。

------

# 四十七、项目拷打：复杂结果页如何降级

假设地图接口失败，不应该让整个行程页白屏。

可以按模块设计：

```text
主行程接口失败
→ 整体错误页

天气接口失败
→ 天气模块显示暂无数据

地图加载失败
→ 显示静态景点列表和降级提示

知识图谱失败
→ 隐藏图谱，不影响日程

WebSocket 断开
→ 回退到轮询查询任务状态
```

React 层可以结合：

- 独立 loading
- 独立 error
- Error Boundary
- Suspense 边界
- 模块级重试
- 接口 `allSettled`

## 面试加分

> 复杂页面不应该只有一个全局 loading 和一个全局 error。不同模块的重要性和降级策略不同，需要按业务边界拆分状态和错误边界。

------

# 四十八、React 中常见的低级错误

## 1. 直接修改 state

```jsx
// 错误：直接修改状态对象
user.name = '新名字';

// 错误：仍然传入原引用
setUser(user);
```

## 2. 在 render 中发送请求

```jsx
// 错误：组件每次渲染都可能发请求
function UserPage() {
  // 不应在渲染期间发送网络请求
  requestUser();

  // 返回页面
  return <div>用户页面</div>;
}
```

## 3. 将函数调用结果传给事件

错误：

```jsx
// 错误：渲染时立即调用 handleSubmit
<button onClick={handleSubmit()}>
  提交
</button>
```

正确：

```jsx
// 正确：传入函数引用
<button onClick={handleSubmit}>
  提交
</button>
```

需要参数：

```jsx
// 使用包装函数延迟执行并传参
<button
  onClick={() => {
    // 点击时才调用删除函数
    handleDelete(user.id);
  }}
>
  删除
</button>
```

## 4. 使用随机 key

会导致组件反复卸载和重建。

## 5. 将所有数据都放 state

例如地图实例、定时器 ID、请求控制器不一定需要触发渲染，更适合 ref。

## 6. 保存可以计算出来的派生状态

容易导致多份状态不一致。

## 7. 使用旧状态进行异步追加

应该使用函数式更新。

------

# 四十九、面试官连续追问模拟

## 问题一：JSX 的本质是什么？

> JSX 是 JavaScript 的语法扩展，会在编译阶段转换成创建 React Element 的函数调用。React Element 是描述 UI 的普通对象，不是真实 DOM，也不是 Fiber。React 后续会根据 Element 创建或复用 Fiber，并在 commit 阶段更新真实 DOM。

------

## 问题二：调用 setState 后，状态为什么没有立即变？

> State 是一次渲染的快照。事件处理函数捕获的是当前渲染对应的状态值，调用 setState 是把更新加入队列，影响下一次渲染，不会修改当前函数中的变量。新状态依赖旧状态时应该使用函数式更新。

------

## 问题三：为什么 React 要求不可变更新？

> React 会通过引用比较识别变化，memo 和依赖比较也依赖稳定引用。更重要的是，不可变数据能保护不同渲染快照之间的隔离。Fiber 可能同时保留当前树和正在构建的工作树，直接修改共享对象会破坏历史状态和并发计算的一致性。

------

## 问题四：Fiber 解决了什么问题？

> Fiber 将原本连续的树递归工作拆成可调度的工作单元，每个 Fiber 保存节点、状态、父子兄弟关系、优先级和副作用信息。Render 阶段可以在工作单元之间暂停、恢复或重新开始，让高优先级用户交互先执行，避免大型更新长时间独占主线程。

------

## 问题五：Render 和 Commit 有什么区别？

> Render 阶段执行组件、处理状态队列、构建 Fiber 并计算变化，主要是内存计算，可以中断或放弃，所以必须保持纯粹。Commit 阶段将变化真正应用到 DOM，并处理 ref 和相关副作用，通常需要连续同步完成，以保证页面一致。

------

## 问题六：Fiber 可以中断 DOM 更新吗？

> 不可以这样理解。Fiber 主要让 render 计算可中断，commit 阶段的 DOM 更新通常不可中断，否则用户可能看到一半新、一半旧的界面。

------

## 问题七：React Diff 的核心规则是什么？

> React 主要基于同层比较、节点类型和 key 进行协调。相同类型且 key 相同的节点可以复用，不同类型通常重建子树；列表中通过 key 识别稳定节点，再使用旧节点映射和位置判断处理复用、移动、新增和删除。

------

## 问题八：React 和 Vue3 的 Diff 有什么不同？

> 两者都使用 type 和 key 识别节点，但 Vue3 对 keyed 中间乱序区会使用最长递增子序列减少移动；React 更偏向通用运行时协调，通过顺序遍历、旧节点 Map 和 lastPlacedIndex 判断移动，不采用相同的 LIS 优化。Vue3 还有 PatchFlag 和 Block Tree 等模板编译优化。

------

## 问题九：为什么不能使用 index 作为 key？

> index 是位置而不是业务身份。列表发生插入、删除和排序后，同一个 index 可能对应不同数据，导致 Fiber、DOM 和子组件状态错误复用。稳定业务 ID 才能表达节点真实身份。

------

## 问题十：父组件更新，子组件一定更新吗？

> 默认情况下，父组件重新执行后，其 JSX 中直接创建的普通子组件通常也会重新参与渲染。但重新渲染不代表 DOM 重建。React 仍会通过 Fiber 复用和 Diff 判断真实变化，也可以通过状态下沉、React.memo 和稳定 props 优化无意义渲染。

------

# 五十、本章最容易漏掉的 20 个点

1. JSX 生成的是 React Element，不是真实 DOM。
2. React Element 和 Fiber 不是同一个东西。
3. 函数组件是根据 props、state 返回 UI 描述的函数。
4. Render 阶段可能被重复、暂停或放弃。
5. 组件渲染必须保持纯粹。
6. State 是渲染快照，不是普通可变变量。
7. `setState` 更新的是下一次渲染。
8. 新状态依赖旧状态时使用函数式更新。
9. React 会尽量批处理同批次更新。
10. 不可变更新不仅是为了触发 render，也是为了保护快照。
11. 状态与组件树位置、类型和 key 相关。
12. key 可以主动控制状态保留和重置。
13. key 不会作为普通 props 传入。
14. Render 计算变化，commit 修改 DOM。
15. Fiber 让 render 可调度，不是让 commit 随意中断。
16. React 同时维护 current 和 workInProgress 树。
17. 不同类型的节点通常会重建子树。
18. React Diff 主要进行同层比较。
19. React 列表 Diff 不使用 Vue3 相同的 LIS 策略。
20. 组件重新执行不等于真实 DOM 全部重建。

------

# 五十一、本章五分钟必背答案

> React 是声明式 UI 框架，可以用 UI 等于状态函数来理解。JSX 会被编译成创建 React Element 的代码，Element 是界面描述对象，不是真实 DOM。状态变化后，React 调度组件重新执行，得到新的 Element 树，再通过 Fiber 协调新旧结构。
>
> React 的 state 是一次渲染的快照。调用状态更新函数只是把更新加入队列，影响下一次渲染，不会修改当前事件函数中的状态变量。多个更新可以被批处理，新状态依赖旧状态时应使用函数式更新。对象和数组状态应采用不可变更新，通过新引用表示新状态，这既便于浅比较，也能保护不同渲染快照和并发计算之间的隔离。
>
> Fiber 是 React 的内部工作单元和数据结构，每个 Fiber 保存节点类型、props、state、父子兄弟关系、更新队列、优先级和副作用标记。React 通过 current 和 workInProgress 双缓冲树，将当前页面与正在计算的新页面隔离。Render 阶段执行组件、处理更新和计算变化，可以暂停、重做或放弃；commit 阶段才真正修改 DOM，通常需要连续完成。
>
> React 的协调算法主要基于同层比较、节点类型和 key。类型或 key 不同通常会创建新节点并重置状态；类型和 key 相同时可以复用 Fiber 和组件状态。动态列表应该使用稳定业务 ID，不能随意使用 index 或随机 key。
>
> React 和 Vue 都使用虚拟 DOM，但更新模型不同。Vue 通过响应式依赖收集确定受影响组件，并结合模板编译器的 PatchFlag 和 Block Tree 优化；React 通过显式状态更新安排组件重新计算，再由 Fiber 和运行时协调算法复用子树。React 列表 Diff 通常通过旧节点映射和 lastPlacedIndex 判断移动，而 Vue3 会对乱序 keyed children 使用最长递增子序列减少 DOM 移动。

------

# 五十二、本章自测

## 核心概念

1. JSX 最终会编译成什么？
2. React Element、Fiber、DOM 有什么区别？
3. 为什么组件渲染必须保持纯粹？
4. Props 和 State 的区别是什么？
5. 为什么 State 是渲染快照？
6. 为什么连续三次 `setCount(count + 1)` 可能只加一次？
7. 函数式更新解决什么问题？
8. React 为什么强调不可变数据？
9. 什么叫状态由树中位置决定？
10. key 如何控制状态重置？

## Fiber

1. Fiber 解决了什么问题？
2. Fiber 节点为什么使用 child、sibling、return？
3. Current Tree 和 WorkInProgress Tree 分别是什么？
4. `alternate` 有什么作用？
5. Render 阶段做什么？
6. Commit 阶段做什么？
7. 为什么 Render 可以中断，Commit 通常不能？
8. Fiber 与任务优先级是什么关系？
9. Fiber 是不是单纯的一条链表？
10. Fiber 是否会让 DOM 操作变成多线程？

## Diff

1. React 为什么不使用精确树编辑算法？
2. React Diff 的两个核心假设是什么？
3. 不同类型节点为什么通常重建？
4. key 的真正作用是什么？
5. 为什么 key 不会出现在 props 里？
6. 为什么 index key 会导致状态错乱？
7. 随机 key 会造成什么后果？
8. React 如何判断列表节点移动？
9. React Diff 和 Vue3 Diff 的区别是什么？
10. 组件重新渲染为什么不等于 DOM 重建？

## 项目场景

1. WebSocket 追加消息为什么使用函数式更新？
2. 地图实例为什么使用 ref 而不是 state？
3. 复杂结果页如何划分状态边界？
4. 地图模块失败为什么不应导致全页白屏？
5. 如何设计星途智旅的组件树？
6. 哪些数据应该放全局状态，哪些留在组件内部？

------

# 五十三、本章查漏补缺清单

```text
□ 能讲清 JSX、Element、Fiber 和 DOM 的关系
□ 能解释组件为什么必须纯粹
□ 能解释 State 快照
□ 能正确使用函数式更新
□ 能解释 React 不可变更新的深层原因
□ 能解释批处理
□ 能解释状态与组件位置、类型、key 的关系
□ 能区分受控和非受控组件
□ 能讲清状态提升和 Context
□ 能讲清 Render 与 Commit
□ 能完整解释 Fiber 解决的问题
□ 能讲清 current 与 workInProgress 双缓冲
□ 能说明 Render 可中断、Commit 不可随意中断
□ 能解释 React Diff 的两条核心假设
□ 能解释稳定 key、index key 和随机 key
□ 能说明 React 列表 Diff 的 lastPlacedIndex 思想
□ 能比较 React Diff 和 Vue3 Diff
□ 能说明重新渲染不等于 DOM 重建
□ 能结合 WebSocket、地图和复杂结果页回答项目问题
```

下一章是 **第八章：React Hooks 原理、闭包陷阱、Effect 生命周期与 React 性能优化**。
