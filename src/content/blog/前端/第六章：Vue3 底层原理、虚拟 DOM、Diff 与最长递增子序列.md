---
title: 第六章：Vue3 底层原理、虚拟 DOM、Diff 与最长递增子序列
slug: >-
  di-liu-zhang-vue3-di-ceng-yuan-li-xu-ni-dom-diff-yu-zui-chang-di-zeng-zi-xu-lie
description: 这一章是 Vue 面试中真正拉开差距的一章。
publishDate: '2026-08-02'
category: 前端
tags:
  - React
  - Vue
  - JavaScript
  - CSS
  - 浏览器
  - 算法
cover: auto
draft: false
featured: false
toc: true
---
这一章是 Vue 面试中真正拉开差距的一章。

你的简历中写了“深入理解主流框架设计原理与核心差异”，面试官看到这句话，很可能直接追问：

- Vue3 响应式是怎么实现的？
- `track` 和 `trigger` 分别做什么？
- 为什么要使用 `WeakMap`？
- 修改三次状态为什么只更新一次 DOM？
- 虚拟 DOM 一定比直接操作 DOM 快吗？
- Vue3 的 Diff 算法具体分哪几步？
- 最长递增子序列为什么能减少 DOM 移动？
- `key` 到底有什么作用？
- Vue3 比 Vue2 的 Diff 优化在哪里？
- 编译器的 `PatchFlag`、静态提升和 Block Tree 是什么？

------

# 一、本章必须建立的完整链路

先把 Vue3 从状态修改到页面更新的全过程记住：

```text
模板 template
→ 编译成 render 函数
→ render 执行生成虚拟 DOM
→ patch 将虚拟 DOM挂载成真实 DOM
→ 响应式数据被读取时收集组件更新副作用
→ 数据修改时触发副作用
→ 更新任务进入调度队列
→ 同一轮任务去重、批量执行
→ 组件重新执行 render
→ 生成新的虚拟 DOM
→ 新旧虚拟 DOM进行 Diff
→ 最小化更新真实 DOM
```

## 🔴 必背总答案

> Vue3 首先将模板编译成 render 函数。组件挂载时，render 函数执行并生成虚拟 DOM，再通过 patch 创建真实 DOM。render 执行期间会读取响应式数据，因此组件更新函数会被 track 收集为依赖。数据修改时，Proxy 的 set 触发 trigger，找到相关副作用函数并通过调度器加入更新队列。同一轮中的多次修改会被去重，随后组件重新执行 render，生成新的虚拟 DOM，通过 Diff 算法比较新旧节点，最终只更新发生变化的真实 DOM。

这段是本章最重要的一段。

------

# 二、模板是怎么变成页面的

Vue 单文件组件中写的是模板：

```html
<!-- 定义一个显示计数的按钮 -->
<button @click="count++">
  <!-- 展示当前计数 -->
  {{ count }}
</button>
```

浏览器无法直接执行 Vue 模板，所以模板必须经过编译。

## 1. 模板编译的三个主要阶段

```text
模板字符串
→ Parse 解析
→ Transform 转换
→ Generate 代码生成
→ render 函数
```

### Parse：解析

将模板解析成抽象语法树 AST。

例如：

```html
<!-- 定义一个带动态属性的 div -->
<div :class="className">
  <!-- 展示动态文本 -->
  {{ message }}
</div>
```

会被解析成类似的结构：

```text
Root
└── Element：div
    ├── Directive：bind class
    └── Interpolation：message
```

### Transform：转换

遍历 AST，对节点进行分析和优化，例如：

- 哪些节点是静态的
- 哪些属性是动态的
- 是否包含动态文本
- 是否需要创建 Block
- 应该添加什么 `PatchFlag`

### Generate：代码生成

最终生成类似的 render 函数：

```js
function render(_ctx, _cache) { // 定义组件的渲染函数
  return createElementVNode( // 创建一个元素虚拟节点
    'div', // 指定真实元素标签为 div
    { class: _ctx.className }, // 设置动态 class 属性
    toDisplayString(_ctx.message), // 将动态 message 转换为文本
    3, // 标记当前节点具有动态文本和动态 class
  ); // 虚拟节点创建结束
} // render 函数定义结束
```

实际编译结果会更加复杂，但核心思想就是：

> 模板不是运行时一行一行解释，而是提前编译成创建虚拟节点的 JavaScript 函数。

------

## 2. 为什么模板编译能带来优化

React 的 JSX 通常会被编译成创建元素的调用，但框架运行时不一定天然知道哪些内容永远不变。

Vue 模板编译器可以提前分析：

```html
<!-- 静态标题，永远不依赖响应式状态 -->
<h1>用户列表</h1>

<!-- 动态文本，依赖 userName -->
<p>{{ userName }}</p>
```

编译器能知道：

- `h1` 是静态节点
- `p` 的文本是动态的
- 更新时重点检查 `p` 即可

这就是 Vue3 的特点：

> 编译时优化与运行时响应式相结合。

## 🟡 面试加分

> Vue 不只是运行时框架，它还通过编译器提前分析模板中的静态和动态部分。运行时 Diff 并不是完全盲目地比较整棵树，而是可以结合 PatchFlag、静态提升和 Block Tree，重点处理真正动态的节点。

------

# 三、什么是虚拟 DOM

虚拟 DOM 本质上是：

> 用普通 JavaScript 对象描述真实 DOM 结构。

例如真实 DOM：

```html
<!-- 定义一个带类名的标题 -->
<h1 class="title">
  <!-- 展示文本 -->
  Vue3
</h1>
```

可以被描述为：

```js
const vnode = { // 创建一个虚拟 DOM 对象
  type: 'h1', // 表示节点类型是 h1 标签
  props: { // 定义节点属性
    class: 'title', // 设置 class 为 title
  }, // props 定义结束
  children: 'Vue3', // 设置节点文本子内容
  key: null, // 当前节点没有设置 key
  el: null, // 挂载后保存对应真实 DOM
}; // 虚拟节点定义结束
```

Vue3 中的虚拟节点通常还会包含：

- `type`
- `props`
- `children`
- `key`
- `el`
- `component`
- `shapeFlag`
- `patchFlag`
- `dynamicChildren`

------

# 四、虚拟 DOM 一定比直接操作 DOM 快吗

答案是：

> 不一定。

这是非常重要的加分点。

## 1. 极简单场景下，直接操作 DOM 可能更快

```js
const element = document.querySelector('#count'); // 获取真实 DOM 元素

element.textContent = '1'; // 直接修改元素文本
```

如果开发者已经明确知道只需要修改这一处，直接操作真实 DOM 通常更直接。

虚拟 DOM 还需要：

```text
创建新虚拟节点
→ 比较新旧虚拟节点
→ 确定变化
→ 再修改真实 DOM
```

所以不能说：

> 虚拟 DOM 比真实 DOM 快。

------

## 2. 虚拟 DOM 真正解决的问题

虚拟 DOM 的价值主要是：

### 声明式开发

开发者只描述：

```text
状态是什么
→ 界面应该是什么
```

不需要手动维护大量 DOM 更新步骤。

### 屏蔽平台差异

同一套虚拟节点可以渲染到：

- 浏览器 DOM
- 小程序
- Canvas
- 服务端字符串
- 自定义渲染器

### 统一更新模型

框架可以集中处理：

- 批量更新
- 节点复用
- 属性更新
- 组件更新
- 调度优先级
- 生命周期

### 降低复杂 UI 的维护成本

开发者不需要精确记住每个状态变化对应修改哪些 DOM。

## 🔴 满分答案

> 虚拟 DOM 不保证在所有场景中都比手动操作真实 DOM 快。开发者准确知道修改位置时，直接 DOM 操作可能更快。虚拟 DOM 的核心价值是提供声明式编程模型、跨平台抽象和可预测的更新机制，并让框架通过批处理、编译优化和 Diff 算法，在复杂应用中获得较稳定的更新性能和更好的可维护性。

------

# 五、VNode 中几个关键字段

## 1. type

表示节点类型：

- 字符串：原生标签
- 对象：组件
- Fragment
- Text
- Comment
- Teleport

## 2. props

表示：

- DOM 属性
- 组件 props
- 事件监听器

## 3. children

可能是：

- 字符串
- 数组
- 插槽对象
- 空值

## 4. key

用于标识节点身份，帮助 Diff 判断节点是否可以复用。

## 5. el

挂载后保存对应的真实 DOM 节点。

更新和移动节点时，Vue 可以通过 `vnode.el` 找到真实 DOM。

## 6. shapeFlag

通过位运算快速标记节点形态，例如：

- 普通元素
- 有状态组件
- 文本子节点
- 数组子节点
- 插槽子节点

为什么不用每次都做复杂类型判断？

因为位运算判断通常更直接：

```text
当前节点是否为元素？
当前节点是否有数组子节点？
当前节点是否为组件？
```

------

# 六、patch 是什么

`patch` 可以理解为 Vue 渲染器的核心入口。

它负责根据新旧虚拟节点决定：

- 创建
- 更新
- 卸载
- 替换
- 移动

简化逻辑：

```js
function patch(oldVNode, newVNode, container) { // 定义虚拟节点更新函数
  if (oldVNode === null) { // 判断是否为首次挂载
    mount(newVNode, container); // 首次挂载时创建真实节点
    return; // 结束当前 patch
  } // 首次挂载判断结束

  if (!isSameVNodeType(oldVNode, newVNode)) { // 判断新旧节点类型是否不同
    unmount(oldVNode); // 卸载旧节点
    mount(newVNode, container); // 创建新节点
    return; // 结束当前 patch
  } // 节点类型判断结束

  if (typeof newVNode.type === 'string') { // 判断是否为普通元素节点
    patchElement(oldVNode, newVNode); // 更新普通元素
  } else { // 进入组件节点处理
    patchComponent(oldVNode, newVNode); // 更新组件
  } // 节点分类处理结束
} // patch 函数定义结束
```

## 什么叫相同类型节点

Vue 判断节点是否可以复用，通常会看：

```text
type 相同
+
key 相同
```

例如：

```text
旧节点：div，key=A
新节点：div，key=A
→ 可以复用

旧节点：div，key=A
新节点：div，key=B
→ 视为不同节点

旧节点：div，key=A
新节点：span，key=A
→ 视为不同节点
```

------

# 七、元素更新主要做什么

更新一个普通元素，大致包括：

```text
复用旧真实 DOM
→ 更新 props
→ 更新 children
```

简化代码：

```js
function patchElement(oldVNode, newVNode) { // 定义元素更新函数
  const element = newVNode.el = oldVNode.el; // 复用旧虚拟节点对应的真实 DOM

  patchProps( // 更新元素属性
    element, // 传入真实 DOM
    oldVNode.props, // 传入旧属性
    newVNode.props, // 传入新属性
  ); // 属性更新结束

  patchChildren( // 更新子节点
    oldVNode, // 传入旧虚拟节点
    newVNode, // 传入新虚拟节点
    element, // 传入当前真实 DOM 容器
  ); // 子节点更新结束
} // patchElement 函数定义结束
```

------

# 八、子节点更新有哪些情况

子节点大致有三种类型：

```text
无子节点
文本子节点
数组子节点
```

新旧组合包括：

| 旧子节点 | 新子节点 | 处理方式               |
| -------- | -------- | ---------------------- |
| 无       | 文本     | 设置文本               |
| 无       | 数组     | 挂载数组               |
| 文本     | 无       | 清空文本               |
| 文本     | 数组     | 清空文本，再挂载数组   |
| 数组     | 无       | 卸载旧数组             |
| 数组     | 文本     | 卸载旧数组，再设置文本 |
| 数组     | 数组     | 执行子节点 Diff        |

最复杂的就是：

> 旧子节点是数组，新子节点也是数组。

这就进入 Vue3 的 keyed Diff。

------

# 九、Vue3 响应式系统完整结构

Vue3 响应式系统可以概括为：

```text
reactive
→ Proxy 代理对象

effect
→ 注册副作用函数

track
→ 读取数据时收集依赖

trigger
→ 修改数据时触发依赖

scheduler
→ 控制副作用何时执行
```

------

# 十、什么是副作用函数 effect

副作用函数指的是：

> 执行结果会依赖响应式状态，并且状态变化后需要重新执行的函数。

例如：

```js
let price = 100; // 定义商品价格

let quantity = 2; // 定义商品数量

function updateTotal() { // 定义更新总价的副作用函数
  document.body.textContent = String(price * quantity); // 根据价格和数量更新页面
} // updateTotal 函数定义结束
```

如果 `price` 改变，就需要重新执行 `updateTotal`。

Vue 组件的 render 函数本身就是一个重要副作用：

```text
组件 render
→ 读取组件响应式状态
→ 状态变化
→ render 需要重新执行
```

------

# 十一、依赖关系存在哪里

Vue3 中依赖结构可以近似理解为：

```text
WeakMap
  target 对象
    → Map
       key 属性
         → Set
            effect1
            effect2
```

也就是：

```text
targetMap: WeakMap<
  target,
  Map<
    key,
    Set<effect>
  >
>
```

例如：

```js
const user = reactive({ // 创建响应式用户对象
  name: '刘凤伟', // 定义姓名属性
  age: 22, // 定义年龄属性
}); // 用户对象定义结束
```

依赖可能类似：

```text
targetMap
└── user 原始对象
    ├── name
    │   └── 组件渲染 effect
    └── age
        ├── 组件渲染 effect
        └── watch effect
```

------

# 十二、为什么最外层使用 WeakMap

这是高频追问。

## WeakMap 的优势

WeakMap 的键必须是对象，并且对键是弱引用。

如果一个响应式原始对象在业务中已经没有其他引用，WeakMap 不会因为自己保存了它，就强行阻止垃圾回收。

如果使用普通 Map：

```text
targetMap 一直强引用所有响应式对象
→ 即使组件卸载、对象不再使用
→ 仍然可能无法被垃圾回收
```

## 🔴 必背答案

> Vue3 的依赖桶最外层使用 WeakMap，以响应式原始对象作为键。WeakMap 对键是弱引用，当对象在其他地方不再被使用时，不会因为依赖桶的引用而阻止垃圾回收，有利于减少内存泄漏风险。属性层和副作用集合则分别使用 Map 与 Set。

------

# 十三、简化版 reactive、effect、track 和 trigger

下面用简化源码理解核心原理。

```js
const targetMap = new WeakMap(); // 创建保存全部依赖关系的 WeakMap

let activeEffect = null; // 保存当前正在执行的副作用函数

function effect(effectFunction) { // 定义注册副作用函数的方法
  const wrappedEffect = () => { // 创建包装后的副作用函数
    activeEffect = wrappedEffect; // 将当前副作用设置为正在收集的副作用

    const result = effectFunction(); // 执行原副作用并读取响应式数据

    activeEffect = null; // 副作用执行结束后清空当前副作用

    return result; // 返回副作用函数执行结果
  }; // 包装函数定义结束

  wrappedEffect(); // 注册时先执行一次以完成依赖收集

  return wrappedEffect; // 返回包装后的副作用函数
} // effect 函数定义结束

function track(target, key) { // 定义依赖收集函数
  if (activeEffect === null) { // 判断当前是否存在正在执行的副作用
    return; // 没有副作用时无需收集依赖
  } // activeEffect 判断结束

  let dependenciesMap = targetMap.get(target); // 获取当前对象对应的属性依赖表

  if (!dependenciesMap) { // 判断当前对象是否还没有依赖表
    dependenciesMap = new Map(); // 创建新的属性依赖表

    targetMap.set(target, dependenciesMap); // 将属性依赖表保存到 WeakMap
  } // 依赖表创建结束

  let dependencySet = dependenciesMap.get(key); // 获取当前属性对应的副作用集合

  if (!dependencySet) { // 判断当前属性是否还没有副作用集合
    dependencySet = new Set(); // 创建新的副作用集合

    dependenciesMap.set(key, dependencySet); // 保存当前属性的副作用集合
  } // 副作用集合创建结束

  dependencySet.add(activeEffect); // 将当前副作用加入属性依赖集合
} // track 函数定义结束

function trigger(target, key) { // 定义依赖触发函数
  const dependenciesMap = targetMap.get(target); // 获取当前对象的依赖表

  if (!dependenciesMap) { // 判断当前对象是否存在依赖
    return; // 没有依赖时无需继续执行
  } // 依赖表判断结束

  const dependencySet = dependenciesMap.get(key); // 获取当前属性的副作用集合

  if (!dependencySet) { // 判断当前属性是否有副作用
    return; // 没有副作用时直接结束
  } // 副作用集合判断结束

  dependencySet.forEach((effectFunction) => { // 遍历当前属性关联的副作用
    effectFunction(); // 重新执行副作用函数
  }); // 副作用遍历结束
} // trigger 函数定义结束

function reactive(target) { // 定义创建响应式对象的方法
  return new Proxy(target, { // 使用 Proxy 代理原对象
    get(currentTarget, key, receiver) { // 拦截属性读取操作
      track(currentTarget, key); // 收集当前属性与副作用之间的关系

      return Reflect.get(currentTarget, key, receiver); // 返回真实属性值
    }, // get 拦截结束

    set(currentTarget, key, value, receiver) { // 拦截属性写入操作
      const oldValue = currentTarget[key]; // 保存属性修改前的旧值

      const result = Reflect.set( // 使用 Reflect 完成属性赋值
        currentTarget, // 传入原始对象
        key, // 传入属性名
        value, // 传入新属性值
        receiver, // 传入代理接收者
      ); // Reflect.set 执行结束

      if (!Object.is(oldValue, value)) { // 判断新旧值是否真正发生变化
        trigger(currentTarget, key); // 触发当前属性相关副作用
      } // 值变化判断结束

      return result; // 返回属性设置结果
    }, // set 拦截结束
  }); // Proxy 创建结束
} // reactive 函数定义结束
```

测试：

```js
const state = reactive({ // 创建响应式状态
  count: 0, // 定义计数属性
}); // 状态对象定义结束

effect(() => { // 注册副作用函数
  console.log('当前计数：', state.count); // 读取 count 并自动收集依赖
}); // effect 注册结束

state.count += 1; // 修改 count 并触发副作用重新执行
```

------

# 十四、上面的简化实现还缺什么

真实 Vue3 响应式远比上面复杂，至少还需要处理：

- 嵌套 effect
- 分支依赖切换
- 依赖清理
- effect 停止
- computed
- watch
- scheduler
- 数组特殊行为
- Map、Set
- 新增和删除属性
- 遍历依赖
- readonly
- shallowReactive
- ref 自动解包
- 防止重复触发
- 递归触发保护

面试中主动说明：

> 我写的是帮助理解的简化实现，不是完整生产级 Vue 源码。

这样更加严谨。

------

# 十五、为什么需要依赖清理

看下面的分支：

```js
const state = reactive({ // 创建响应式状态
  enabled: true, // 控制当前使用哪个分支
  text: 'Vue3', // 定义文本数据
}); // 状态对象定义结束

effect(() => { // 注册副作用函数
  const result = state.enabled // 读取 enabled 并决定分支
    ? state.text // enabled 为 true 时读取 text
    : '关闭'; // enabled 为 false 时不再需要 text

  console.log(result); // 输出当前结果
}); // effect 注册结束
```

第一次执行时：

```text
读取 enabled
读取 text
→ effect 同时被 enabled 和 text 收集
```

后来：

```js
state.enabled = false; // 切换到不再使用 text 的分支
```

此后 effect 只应该依赖 `enabled`，不应该再依赖 `text`。

如果不清理旧依赖：

```js
state.text = 'React'; // 当前页面已经不使用 text，但仍然会错误触发 effect
```

这叫：

> 分支切换导致的遗留依赖。

------

## 正确思想

每次 effect 重新执行前：

```text
先把 effect 从旧依赖集合中移除
→ 再执行 effect
→ 根据本次真实读取重新收集依赖
```

简化代码：

```js
function cleanup(effectFunction) { // 定义副作用清理函数
  effectFunction.dependencies.forEach((dependencySet) => { // 遍历旧依赖集合
    dependencySet.delete(effectFunction); // 从每个依赖集合中删除当前副作用
  }); // 旧依赖遍历结束

  effectFunction.dependencies.length = 0; // 清空副作用记录的依赖列表
} // cleanup 函数定义结束
```

## 🟡 面试加分答案

> 响应式依赖不是收集一次后永久不变。模板中可能存在条件分支，某次 render 读取了某个状态，下一次 render 可能不再读取。如果不在 effect 重新执行前清理旧依赖，就会产生无效触发。因此 Vue 会维护 effect 与依赖集合的双向关系，在重新执行时清理并重新收集。

------

# 十六、为什么使用 Set 保存副作用

同一个 effect 在一次执行过程中可能多次读取同一属性：

```js
effect(() => { // 注册副作用
  console.log(state.count); // 第一次读取 count
  console.log(state.count); // 第二次读取 count
}); // effect 注册结束
```

如果用数组保存：

```text
同一个 effect 可能被加入两次
→ 修改 count 时重复执行
```

使用 `Set` 可以自动去重。

------

# 十七、嵌套 effect 为什么需要栈

可能出现：

```text
组件 render effect
→ 内部读取 computed
→ computed 自己也有 effect
```

如果只有一个全局 `activeEffect`：

```text
外层 effect 执行
→ 内层 effect 覆盖 activeEffect
→ 内层结束后 activeEffect 被清空
→ 外层后续读取无法正确收集
```

因此完整实现需要：

```text
effectStack
```

进入 effect 时入栈，结束时出栈，并恢复上一个 activeEffect。

## 🔴 加分表达

> 单个 activeEffect 只能处理最简单场景。computed、组件嵌套等情况会形成嵌套副作用，因此真实实现需要 effect 栈保存执行上下文，内层结束后恢复外层副作用。

------

# 十八、computed 底层为什么有缓存

computed 可以理解为：

> 带懒执行、缓存和脏标记的特殊 effect。

核心状态：

```text
dirty = true
```

第一次读取：

```text
dirty 为 true
→ 执行 getter
→ 保存结果
→ dirty 改为 false
```

再次读取：

```text
dirty 为 false
→ 直接返回缓存结果
```

依赖变化：

```text
computed 内部依赖触发
→ scheduler 不立即重新计算
→ 只把 dirty 改为 true
```

下一次再读取：

```text
dirty 为 true
→ 重新计算
```

------

## 简化版 computed

```js
function computed(getter) { // 定义简化版计算属性函数
  let cachedValue; // 保存上一次计算结果

  let dirty = true; // 标记当前缓存是否已经失效

  const computedEffect = effect( // 创建计算属性内部副作用
    getter, // 传入计算函数
    {
      lazy: true, // 设置为懒执行
      scheduler() { // 定义依赖变化时的调度器
        dirty = true; // 只标记缓存失效而不立即重新计算
      }, // scheduler 定义结束
    }, // effect 配置结束
  ); // computedEffect 创建结束

  return { // 返回类似 ref 的对象
    get value() { // 定义 value 读取器
      if (dirty) { // 判断缓存是否已经失效
        cachedValue = computedEffect(); // 重新执行 getter 获取最新结果

        dirty = false; // 标记当前缓存已经有效
      } // 脏值判断结束

      return cachedValue; // 返回缓存的计算结果
    }, // value 读取器结束
  }; // 返回对象结束
} // computed 函数定义结束
```

这只是思想模型，真实源码还会处理：

- computed 自身依赖收集
- readonly
- 可写 computed
- 服务端渲染
- effect 标记
- 递归警告

## 🔴 标准答案

> computed 本质上是带懒执行和缓存机制的特殊响应式副作用。它内部通过 dirty 标记判断缓存是否有效。依赖变化时不会立刻重新计算，只通过 scheduler 将 dirty 设为 true；下一次读取 computed.value 时才重新执行 getter，因此既能缓存，又避免无意义计算。

------

# 十九、组件为什么不是数据一改就立即更新

假设：

```js
count.value += 1; // 第一次修改响应式状态

count.value += 1; // 第二次修改响应式状态

count.value += 1; // 第三次修改响应式状态
```

如果每次修改都立即执行 render：

```text
修改一次
→ render
→ patch

再修改一次
→ render
→ patch

再修改一次
→ render
→ patch
```

会产生大量重复工作。

Vue 会给组件更新 effect 设置 scheduler：

```text
状态变化
→ 不直接立即执行组件 render
→ 将组件更新任务放进队列
→ 使用 Set 或任务 ID 去重
→ 当前同步代码执行结束后统一更新
```

最终通常只更新一次。

------

# 二十、简化版调度器

```js
const jobQueue = new Set(); // 使用 Set 保存并自动去重更新任务

let isFlushing = false; // 标记当前是否已经安排队列刷新

const resolvedPromise = Promise.resolve(); // 创建一个已成功的 Promise

function queueJob(job) { // 定义更新任务入队函数
  jobQueue.add(job); // 将任务加入 Set 并自动去重

  if (isFlushing) { // 判断是否已经安排刷新
    return; // 已安排时无需重复创建微任务
  } // 刷新状态判断结束

  isFlushing = true; // 标记当前已经安排刷新

  resolvedPromise.then(() => { // 将队列刷新安排到微任务
    try { // 开始任务执行保护
      jobQueue.forEach((currentJob) => { // 遍历全部更新任务
        currentJob(); // 执行当前更新任务
      }); // 更新任务遍历结束
    } finally { // 无论任务是否报错都执行清理
      jobQueue.clear(); // 清空更新任务队列

      isFlushing = false; // 重置刷新状态
    } // 清理逻辑结束
  }); // 微任务注册结束
} // queueJob 函数定义结束
```

## 为什么用微任务

因为微任务可以：

- 等待当前同步修改全部完成
- 在下一个宏任务前尽快更新
- 合并同一轮状态变化

但真实 Vue 调度器还会处理：

- 父子组件更新顺序
- 任务 ID 排序
- 更新前回调
- 更新后回调
- 递归更新限制
- 任务失效
- 错误处理

------

# 二十一、nextTick 底层是什么

`nextTick` 可以近似理解为：

> 返回当前调度队列刷新完成对应的 Promise。

简化思想：

```js
function nextTick(callback) { // 定义简化版 nextTick
  const promise = currentFlushPromise || Promise.resolve(); // 获取当前刷新任务对应 Promise

  return callback // 判断是否传入回调
    ? promise.then(callback) // 有回调时在队列刷新后执行回调
    : promise; // 没有回调时直接返回 Promise
} // nextTick 函数定义结束
```

所以：

```js
count.value += 1; // 修改响应式状态并安排组件更新

await nextTick(); // 等待 Vue 当前更新队列执行完成

console.log(element.textContent); // 此时读取更新后的 DOM
```

## ⚠️ 重要区别

`nextTick` 等待的是：

```text
Vue 当前批次更新完成
```

不保证：

- 浏览器已经绘制到屏幕
- 图片已经加载
- CSS 动画已经结束
- 网络请求已经完成
- 下一帧已经到来

------

# 二十二、Vue3 Diff 算法完整流程

现在进入本章最核心部分。

假设旧子节点：

```text
A B C D E
```

新子节点：

```text
A C D B E
```

Vue3 不会立即暴力比较全部节点，而是分阶段处理。

## Diff 核心步骤

```text
第一步：从头同步相同节点
第二步：从尾同步相同节点
第三步：处理纯新增或纯删除
第四步：处理未知乱序区间
第五步：建立 key 到新索引映射
第六步：建立新节点与旧节点关系
第七步：判断是否发生移动
第八步：求最长递增子序列
第九步：从后向前挂载和移动节点
```

这九步需要理解，不需要死背所有源码变量名。

------

# 二十三、第一步：从头同步相同节点

旧：

```text
A B C D E
```

新：

```text
A C D B E
```

从头比较：

```text
旧 A 与新 A
→ type 相同、key 相同
→ patch A
→ 继续向后
```

接着：

```text
旧 B 与新 C
→ 不同
→ 停止头部同步
```

处理完后：

```text
已确认 A 可以原地复用
```

------

# 二十四、第二步：从尾同步相同节点

从尾部比较：

```text
旧 E 与新 E
→ 相同
→ patch E
```

再向前：

```text
旧 D 与新 B
→ 不同
→ 停止尾部同步
```

剩余未知区间：

```text
旧：B C D
新：C D B
```

------

# 二十五、第三步：处理纯新增和纯删除

有些情况在头尾同步后，某一边已经遍历结束。

## 1. 新节点还有剩余

旧：

```text
A B
```

新：

```text
A B C D
```

A、B 同步完成后，旧节点已经结束，新节点还剩 C、D。

此时直接挂载 C、D。

## 2. 旧节点还有剩余

旧：

```text
A B C D
```

新：

```text
A B
```

A、B 同步完成后，新节点已经结束，旧节点还剩 C、D。

此时直接卸载 C、D。

只有两边都还有剩余时，才进入最复杂的乱序 Diff。

------

# 二十六、第四步：建立新节点 key 映射

剩余区间：

```text
旧：B C D
新：C D B
```

建立：

```text
C → 新索引 1
D → 新索引 2
B → 新索引 3
```

真实源码中索引可能是完整数组索引，这里只关注思想。

为什么以新节点为基准建立映射？

因为最终页面要变成新节点顺序，需要知道每个旧节点在新数组中应该去哪里。

------

# 二十七、第五步：遍历旧节点，寻找新位置

依次处理旧节点：

## 旧 B

在新节点映射中找到：

```text
B → 新索引 3
```

说明 B 仍然存在，可以 patch，不应删除。

## 旧 C

找到：

```text
C → 新索引 1
```

## 旧 D

找到：

```text
D → 新索引 2
```

同时建立一个数组，记录新节点对应的旧节点位置：

```text
新顺序：C D B
旧位置：3 4 2
```

为什么是 `3、4、2` 而不是 `2、3、1`？

真实 Vue 实现通常保存：

```text
旧索引 + 1
```

因为数组中的 `0` 会被用来表示：

> 当前新节点在旧节点中不存在，需要新建。

所以：

```text
C 的旧索引是 2，保存 3
D 的旧索引是 3，保存 4
B 的旧索引是 1，保存 2
```

最终：

```text
newIndexToOldIndexMap = [3, 4, 2]
```

------

# 二十八、如何判断节点有没有移动

遍历旧节点时，记录：

```text
maxNewIndexSoFar
```

表示目前见过的最大新索引。

旧节点顺序：

```text
B → 新索引 3
C → 新索引 1
D → 新索引 2
```

处理 B：

```text
新索引 3
maxNewIndexSoFar = 3
```

处理 C：

```text
新索引 1 < 3
→ 说明相对顺序发生倒退
→ 存在节点移动
```

只要后面出现的新索引小于之前最大索引，就说明新旧相对顺序发生变化。

------

# 二十九、为什么不能把所有节点都移动

对于：

```text
旧：B C D
新：C D B
```

最简单的做法是：

```text
把 C 移动
把 D 移动
把 B 移动
```

但这会产生不必要的 DOM 操作。

观察：

```text
C D
```

在旧数组和新数组中，相对顺序一直没有变化。

真正需要移动的只有 B。

所以要寻找：

> 哪一组节点在新顺序下仍然保持旧顺序，可以不移动。

这就是最长递增子序列。

------

# 三十、什么是最长递增子序列

对数组：

```text
[3, 4, 2]
```

递增子序列包括：

```text
[3]
[4]
[2]
[3, 4]
```

最长的是：

```text
[3, 4]
```

它对应：

```text
C、D
```

说明 C、D 的旧位置是递增的：

```text
C 原来在 D 前面
新数组中 C 仍然在 D 前面
```

因此 C、D 可以保留，不移动。

B 不在最长递增子序列中，所以移动 B。

## 📌 一句话理解

> 最长递增子序列代表新数组中仍然保持旧相对顺序的最大节点集合，这些节点不需要移动，其他节点再进行移动。

------

# 三十一、最长递增子序列不是连续子数组

这是一个常见误区。

数组：

```text
[2, 5, 3, 4]
```

最长递增子序列可以是：

```text
[2, 3, 4]
```

它在原数组中不是连续的，但保持原来的先后顺序。

因此：

- 子数组要求连续
- 子序列不要求连续
- 但必须保持原顺序

------

# 三十二、为什么最长递增子序列能减少 DOM 移动

目标是：

```text
尽可能保留原有节点位置
```

假设一共有 `m` 个可复用节点：

```text
最长递增子序列长度为 k
```

则：

```text
k 个节点可以不移动
m - k 个节点需要移动
```

最长递增子序列越长，保留的节点越多，需要移动的真实 DOM 越少。

这不是为了减少虚拟 DOM 比较次数，而是：

> 减少真实 DOM 移动次数。

------

# 三十三、为什么采用 O(n log n) 的最长递增子序列

简单动态规划求 LIS 的复杂度通常是：

```text
O(n²)
```

Vue3 使用类似：

```text
贪心 + 二分查找
```

将复杂度降低到：

```text
O(n log n)
```

对于大量列表更新，这比 O(n²) 更稳定。

------

# 三十四、最长递增子序列核心代码

下面是接近 Vue3 思路的简化实现。返回的是递增子序列对应的索引，而不是元素本身。

```js
function getLongestIncreasingSubsequence(array) { // 定义获取最长递增子序列索引的函数
  const predecessors = array.slice(); // 复制数组并用于记录每个元素的前驱索引

  const resultIndexes = []; // 保存当前最长递增子序列的索引

  for (let currentIndex = 0; currentIndex < array.length; currentIndex += 1) { // 遍历输入数组
    const currentValue = array[currentIndex]; // 获取当前元素值

    if (currentValue === 0) { // 判断当前值是否表示新增节点
      continue; // 新增节点不参与最长递增子序列计算
    } // 新增节点判断结束

    const lastResultIndex = resultIndexes[resultIndexes.length - 1]; // 获取当前结果中最后一个索引

    if ( // 判断当前元素是否可以直接接在递增序列末尾
      resultIndexes.length === 0 || // 当前结果为空时可以直接加入
      array[lastResultIndex] < currentValue // 当前值大于末尾值时可以直接加入
    ) { // 直接追加条件结束
      if (resultIndexes.length > 0) { // 判断当前序列是否已有前驱
        predecessors[currentIndex] = lastResultIndex; // 记录当前元素的前驱索引
      } // 前驱记录结束

      resultIndexes.push(currentIndex); // 将当前索引加入递增序列结果

      continue; // 继续处理下一个元素
    } // 直接追加逻辑结束

    let left = 0; // 定义二分查找左边界

    let right = resultIndexes.length - 1; // 定义二分查找右边界

    while (left < right) { // 开始二分查找替换位置
      const middle = Math.floor((left + right) / 2); // 计算中间位置

      const middleValue = array[resultIndexes[middle]]; // 获取中间索引对应的值

      if (middleValue < currentValue) { // 判断中间值是否小于当前值
        left = middle + 1; // 当前值应该放到右半部分
      } else { // 当前值应放到左半部分
        right = middle; // 收缩右边界
      } // 二分条件判断结束
    } // 二分查找结束

    if (currentValue < array[resultIndexes[left]]) { // 判断当前值能否优化该位置的结尾值
      if (left > 0) { // 判断当前元素是否存在前驱
        predecessors[currentIndex] = resultIndexes[left - 1]; // 记录当前元素的前驱索引
      } // 前驱记录结束

      resultIndexes[left] = currentIndex; // 使用更小的当前值替换当前序列位置
    } // 结果替换结束
  } // 输入数组遍历结束

  let resultLength = resultIndexes.length; // 保存最终最长递增子序列长度

  let currentResultIndex = resultIndexes[resultLength - 1]; // 获取最终序列最后一个元素索引

  while (resultLength > 0) { // 从后向前还原真实子序列索引
    resultLength -= 1; // 将当前写入位置向前移动

    resultIndexes[resultLength] = currentResultIndex; // 保存当前真实序列索引

    currentResultIndex = predecessors[currentResultIndex]; // 移动到当前元素的前驱索引
  } // 序列还原结束

  return resultIndexes; // 返回最长递增子序列对应的原数组索引
} // 函数定义结束
```

测试：

```js
const source = [3, 4, 2]; // 定义新旧节点映射数组

const result = getLongestIncreasingSubsequence(source); // 计算最长递增子序列索引

console.log(result); // 输出类似 [0, 1]，对应值 3 和 4
```

------

# 三十五、LIS 算法中“替换”是什么意思

对：

```text
[2, 5, 3, 4]
```

处理过程可以近似理解：

```text
看到 2
→ 当前候选结尾 [2]

看到 5
→ 比 2 大
→ 当前候选结尾 [2, 5]

看到 3
→ 不能接在 5 后面
→ 用 3 替换 5
→ 当前候选结尾 [2, 3]

看到 4
→ 可以接在 3 后面
→ 当前候选结尾 [2, 3, 4]
```

为什么可以用 3 替换 5？

因为对于长度为 2 的递增序列：

```text
以 3 结尾
```

比：

```text
以 5 结尾
```

更容易在后面接入更多数字。

这是一种贪心思想：

> 在相同长度下，尽量让递增序列结尾更小，为后续增长留下更多空间。

------

# 三十六、为什么最终从后向前处理节点

在完成映射和 LIS 后，Vue 通常从新节点区间的后面向前处理。

原因是：

> 向后处理时，可以利用已经确定位置的后一个节点作为锚点 anchor。

例如最终要得到：

```text
C D B
```

从后向前：

```text
先确定 B 应该放在哪里
再确定 D
再确定 C
```

插入节点时可以使用：

```text
下一个节点的真实 DOM
```

作为插入参照。

简化：

```js
container.insertBefore( // 将节点插入到指定锚点之前
  currentElement, // 传入当前需要移动或创建的元素
  anchorElement, // 传入下一个节点对应的真实 DOM
); // DOM 插入操作结束
```

如果从前向后处理，后面的锚点可能还没有完成定位。

------

# 三十七、完整 Diff 例子

旧节点：

```text
A B C D E
```

新节点：

```text
A C D B E F
```

## 第一步：头部同步

```text
A 与 A 相同
→ 复用 A
```

## 第二步：尾部同步

旧尾部 E，新尾部 F，不同，暂时不能同步。

## 第三步：未知区域

旧：

```text
B C D E
```

新：

```text
C D B E F
```

建立新 key 映射：

```text
C → 1
D → 2
B → 3
E → 4
F → 5
```

遍历旧节点，得到映射：

```text
新：C D B E F
旧：3 4 2 5 0
```

其中：

```text
0 代表 F 是新节点，需要挂载
```

最长递增子序列可以对应：

```text
3 4 5
```

即：

```text
C D E
```

保留：

```text
C、D、E
```

操作：

- 创建 F
- 移动 B
- C、D、E 不移动
- A 已经头部复用

------

# 三十八、key 到底有什么作用

## 1. key 表示节点身份

key 不是为了：

- 消除控制台警告
- 单纯提高性能
- 让每个节点绝对唯一于整个应用

它主要用于同一层级的子节点比较。

Vue 使用：

```text
type + key
```

判断新旧节点是否是同一个可复用节点。

------

## 2. 没有 key 会怎样

无 key 列表通常采用更偏向“就地复用”的策略。

例如：

旧：

```text
用户 A 输入框
用户 B 输入框
用户 C 输入框
```

删除用户 A 后，新列表：

```text
用户 B
用户 C
```

如果没有稳定 key，Vue 可能：

```text
把第一个旧 DOM 改成用户 B
把第二个旧 DOM 改成用户 C
删除第三个 DOM
```

对于纯文本可能看不出问题，但如果子项包含：

- 输入框临时值
- 组件内部状态
- 焦点
- 动画
- 第三方实例

就可能错误复用。

------

## 3. 为什么 index 不稳定

旧数组：

```text
索引0：A
索引1：B
索引2：C
```

删除 A 后：

```text
索引0：B
索引1：C
```

如果 key 使用 index：

```text
旧 key 0 对应 A
新 key 0 对应 B
```

Vue 会认为它们是同一个节点，但业务身份已经变化。

## 🔴 满分答案

> key 为虚拟节点提供稳定的业务身份，Vue 通过 type 和 key 判断节点是否可以复用。在动态列表中使用 index，插入、删除或排序后 index 会变化，可能导致 DOM、表单值和组件内部状态被错误复用。稳定唯一的业务 ID 能让 Diff 更准确地识别节点，并进行正确的复用、移动、创建和卸载。

------

# 三十九、key 是不是一定能提高性能

不一定。

稳定 key 的首要价值是：

> 保证节点身份和更新正确性。

在某些简单静态列表中，无 key 的就地更新可能反而修改更少 DOM。

但对于包含状态的动态列表，稳定 key 更重要。

不要说：

> 加 key 一定更快。

更严谨地说：

> key 让框架获得更准确的节点身份信息，从而进行可靠复用和移动；是否更快取决于具体更新场景，但正确性通常是首要原因。

------

# 四十、为什么不能用随机数作为 key

```html
<!-- 错误：每次渲染都会产生全新的 key -->
<div
  v-for="user in users"
  :key="Math.random()"
>
  <!-- 展示用户名 -->
  {{ user.name }}
</div>
```

每次 render：

```text
旧节点 key 全部失效
→ Vue 认为全部节点都是新的
→ 旧组件全部卸载
→ 新组件全部创建
```

结果：

- 无法复用 DOM
- 组件状态丢失
- 输入框焦点丢失
- 生命周期反复执行
- 性能变差

------

# 四十一、Vue2 和 Vue3 Diff 的主要区别

Vue2 的双端 Diff 会通过四组比较：

```text
旧头 vs 新头
旧尾 vs 新尾
旧头 vs 新尾
旧尾 vs 新头
```

匹配不到时再通过 key 映射寻找节点。

Vue3 对数组子节点的优化流程更偏向：

```text
头部同步
→ 尾部同步
→ 纯新增或纯删除
→ 中间区域 key 映射
→ 新旧索引映射
→ 最长递增子序列减少移动
```

## 🔴 标准答案

> Vue2 的 keyed children Diff 主要采用双端比较，通过旧头、新头、旧尾、新尾之间的匹配尽量复用节点。Vue3 先同步相同前缀和后缀，再处理纯新增、纯删除和未知中间区间；对于乱序中间区域建立 key 映射，并通过最长递增子序列找出不需要移动的最大节点集合，从而减少真实 DOM 移动。

------

# 四十二、Vue3 不只是改进了 Diff

真正让 Vue3 更新高效的，不只是 LIS。

还包括编译器优化：

- 静态提升
- PatchFlag
- Block Tree
- 动态节点收集
- 事件处理函数缓存
- 静态属性预字符串化
- Tree Shaking

面试中只说“Vue3 用最长递增子序列”，深度仍然不够。

------

# 四十三、静态提升 Static Hoisting

模板：

```html
<!-- 静态标题 -->
<h1>用户列表</h1>

<!-- 动态用户名 -->
<p>{{ userName }}</p>
```

如果每次 render 都重新创建静态 `h1` 的 VNode，会产生无意义开销。

Vue 编译器可以将静态节点提升到 render 函数外：

```js
const staticVNode = createElementVNode( // 在 render 外创建静态虚拟节点
  'h1', // 设置节点标签
  null, // 当前节点没有属性
  '用户列表', // 设置静态文本
  -1, // 标记当前节点为静态提升节点
); // 静态节点创建结束

function render(_ctx) { // 定义组件渲染函数
  return createElementBlock( // 创建当前组件根节点
    Fragment, // 使用 Fragment 包裹多个根节点
    null, // 当前 Fragment 没有属性
    [
      staticVNode, // 直接复用静态虚拟节点
      createElementVNode( // 创建动态段落节点
        'p', // 设置标签为 p
        null, // 当前节点没有属性
        toDisplayString(_ctx.userName), // 设置动态用户名文本
        1, // 标记当前节点只有文本是动态的
      ), // 动态节点创建结束
    ], // 子节点数组结束
  ); // 根节点创建结束
} // render 函数定义结束
```

效果：

> 静态节点不随每次组件更新重复创建和完整比较。

------

# 四十四、PatchFlag 是什么

PatchFlag 是编译器给虚拟节点添加的动态标记。

例如：

```html
<!-- 文本内容是动态的 -->
<p>{{ message }}</p>
```

编译器知道：

```text
这个节点只有文本可能变化
```

更新时不需要：

- 重新比较所有属性
- 重新分析 class
- 重新分析 style
- 完整遍历所有子节点

只需要更新文本。

常见思想标记包括：

- 动态文本
- 动态 class
- 动态 style
- 动态 props
- 完整 props 比较
- 需要片段比较

## 🔴 加分回答

> PatchFlag 是 Vue3 编译器给动态节点添加的更新提示。运行时可以根据标记直接知道文本、class、style 或某些 props 发生动态变化，避免对节点进行完整属性比较。它体现了 Vue3 编译时和运行时协同优化的特点。

------

# 四十五、Block Tree 是什么

传统虚拟 DOM Diff 可能需要递归遍历整棵子树。

但模板中大量节点其实是静态的。

Vue3 编译器会将动态节点收集到 Block 的：

```text
dynamicChildren
```

更新时可以重点遍历动态节点数组，而不是完整遍历所有静态节点。

例如：

```html
<!-- 创建静态容器 -->
<div>
  <!-- 静态标题 -->
  <h1>用户信息</h1>

  <!-- 动态姓名 -->
  <p>{{ user.name }}</p>

  <!-- 动态年龄 -->
  <p>{{ user.age }}</p>
</div>
```

动态节点主要是两个 `p`。

Block Tree 可以近似理解为：

```text
当前 Block
└── dynamicChildren
    ├── 姓名 p
    └── 年龄 p
```

更新时：

```text
重点更新两个动态 p
```

而不是对全部节点进行无差别递归。

------

# 四十六、事件处理函数缓存

模板：

```html
<!-- 点击按钮时执行 submit -->
<button @click="submit">
  <!-- 显示提交文本 -->
  提交
</button>
```

如果每次 render 都创建新的事件包装函数，可能导致事件属性被认为变化。

Vue 编译器可以通过缓存机制复用事件处理函数，减少不必要更新。

这类似于 React 中稳定函数引用的目标，但实现方式和整体更新模型不同。

------

# 四十七、组件更新发生在哪一层

一个组件通常拥有自己的 render effect。

父组件更新时，并不代表所有子组件一定重新渲染。

Vue 会判断：

- 子组件 props 是否变化
- 插槽是否稳定
- PatchFlag
- 动态属性
- 是否需要强制更新

因此：

```text
父组件 render 执行
```

不等于：

```text
所有子组件无条件完整更新
```

------

# 四十八、为什么 props 稳定很重要

例如：

```html
<!-- 每个子组件都接收 active 布尔值 -->
<UserItem
  v-for="user in users"
  :key="user.id"
  :user="user"
  :active="activeUserId === user.id"
/>
```

当 `activeUserId` 改变时：

- 原 active 项的 `active` 从 true 变 false
- 新 active 项从 false 变 true
- 其他项的 `active` 没变

如果 props 设计合理，Vue 可以减少无关子项更新。

反之，如果给所有子组件传入一个不断变化的大对象，可能扩大更新范围。

------

# 四十九、v-once 和 v-memo

## v-once

用于只渲染一次、后续不再更新的内容。

```html
<!-- 当前节点只在首次渲染时计算 -->
<div v-once>
  <!-- 后续状态变化也不会更新这段内容 -->
  {{ initialMessage }}
</div>
```

适合真正不会再变化的内容。

## v-memo

根据依赖数组决定是否跳过子树更新。

```html
<!-- 只有 user.id 和 user.selected 变化时才更新当前子树 -->
<div
  v-for="user in users"
  :key="user.id"
  v-memo="[user.id, user.selected]"
>
  <!-- 展示用户名称 -->
  {{ user.name }}
</div>
```

不要为了优化随意使用，错误依赖会导致界面不更新。

------

# 五十、Vue 响应式与虚拟 DOM的关系

这是很容易混淆的问题。

## 响应式系统负责

```text
知道哪些状态被谁使用
知道状态变化后应该通知谁
```

## 虚拟 DOM和 Diff 负责

```text
组件重新渲染后
如何将新 UI 高效同步到真实 DOM
```

所以：

```text
响应式系统
→ 确定哪个组件需要更新

虚拟 DOM Diff
→ 确定组件内部哪些 DOM 需要更新
```

## 🔴 满分答案

> 响应式和虚拟 DOM解决的是不同层次的问题。响应式系统通过依赖收集确定哪些副作用或组件受状态影响；状态变化后触发对应组件重新执行 render。虚拟 DOM和 Diff 则负责比较组件的新旧渲染结果，确定真实 DOM 的最小更新范围。

------

# 五十一、为什么 Vue3 仍然需要虚拟 DOM

Vue3 已经有精确响应式依赖，为什么不直接更新某个 DOM？

因为响应式系统通常只能知道：

```text
哪个组件的渲染依赖发生了变化
```

但模板中状态变化可能影响：

- 节点是否存在
- 节点顺序
- 组件类型
- 属性
- 子节点
- 插槽
- 列表结构

重新执行 render 生成新的 UI 描述，再通过 Diff 处理，模型更统一。

不过 Vue3 编译器通过 PatchFlag 和 Block Tree，使虚拟 DOM更新更加接近：

> 只处理动态部分。

------

# 五十二、Vue 为什么不是完全细粒度 DOM更新

有些框架会为每个表达式建立更细粒度的 DOM绑定。

Vue3 采用的是混合策略：

```text
组件级响应式更新
+
虚拟 DOM
+
编译器动态标记
```

优点：

- 保持虚拟 DOM的跨平台和声明式能力
- 编译器可以减少无效 Diff
- 运行模型统一

代价：

- 仍然需要执行组件 render
- 仍然存在 VNode 创建和比较成本

这是一种工程权衡，不是绝对最优或最差。

------

# 五十三、项目中如何体现这些原理

## 1. ECharts 和地图实例

不要使用深度 `reactive`：

```js
import { onUnmounted, shallowRef } from 'vue'; // 导入生命周期和浅层响应式 API

const chartInstance = shallowRef(null); // 使用 shallowRef 保存 ECharts 实例

function initializeChart(container) { // 定义图表初始化函数
  chartInstance.value = echarts.init(container); // 创建并保存图表实例
} // 初始化函数结束

onUnmounted(() => { // 组件卸载时执行清理
  chartInstance.value?.dispose(); // 销毁 ECharts 实例并释放资源

  chartInstance.value = null; // 清空实例引用
}); // 卸载生命周期结束
```

面试表达：

> ECharts、地图和 WebSocket 实例内部结构复杂，不需要深度响应式。我会使用 shallowRef 保存实例，只追踪实例整体替换，并在卸载时销毁，减少无意义代理和资源泄漏。

------

## 2. 大列表使用稳定 key

```html
<!-- 使用稳定订单 ID 作为 key -->
<OrderCard
  v-for="order in orders"
  :key="order.id"
  :order="order"
/>
```

不要用：

```html
<!-- 不推荐：列表变化后索引不再代表稳定业务身份 -->
<OrderCard
  v-for="(order, index) in orders"
  :key="index"
  :order="order"
/>
```

------

## 3. 多次状态更新被批量处理

```js
function updateOrder(orderData) { // 定义订单更新方法
  currentOrder.value = orderData; // 更新当前订单

  loading.value = false; // 关闭加载状态

  errorMessage.value = ''; // 清空错误提示
} // 更新方法结束
```

这三个响应式修改通常不会导致三次完整 DOM更新，而会被 Vue 调度器批量处理。

------

## 4. 长会话分层加载

消息列表追加时必须使用稳定消息 ID：

```html
<!-- 使用稳定消息 ID 维护消息节点身份 -->
<MessageItem
  v-for="message in messages"
  :key="message.id"
  :message="message"
/>
```

如果流式输出时每次都替换全部消息对象，要注意：

- 不必要的新对象创建
- Markdown 高频解析
- 组件重复更新
- 滚动测量频繁触发

可以：

- 仅更新最后一条消息
- 批量合并字符
- 使用 `requestAnimationFrame` 或节流更新
- 对历史消息组件进行缓存
- 保持 key 稳定

------

# 五十四、面试官连续追问模拟

## 问题一：Vue3 响应式原理是什么？

推荐回答：

> Vue3 使用 Proxy 代理对象，通过 get 拦截读取，通过 set、deleteProperty 等拦截修改。副作用执行时会设置 activeEffect，读取属性时 track 将 target、key 和当前 effect 建立关联，依赖关系保存在 WeakMap、Map、Set 组成的结构中。修改属性时 trigger 找到相关 effect。组件更新 effect 不会直接同步执行，而是通过 scheduler 加入任务队列，实现去重和批量更新。

------

## 问题二：为什么依赖桶是 WeakMap、Map、Set？

推荐回答：

> WeakMap 以原始对象作为键，并且是弱引用，避免依赖桶阻止对象垃圾回收；Map 用于建立属性 key 到依赖集合的映射；Set 用于保存 effect，并自动避免同一 effect 重复收集。

------

## 问题三：为什么需要清理依赖？

推荐回答：

> 因为 render 和 effect 中可能有条件分支。上一次执行读取了某个状态，下一次执行可能不再读取。如果不清理旧依赖，该状态后续变化仍会触发无效更新。Vue 会在 effect 重新执行时清理旧依赖，再按本次真实读取重新收集。

------

## 问题四：computed 为什么有缓存？

推荐回答：

> computed 内部是带 lazy 和 scheduler 的特殊 effect。第一次读取时执行 getter 并缓存结果，之后依赖未变化时直接返回缓存。依赖变化时 scheduler 只把 dirty 标记为 true，不立即重新计算；下次读取时才重新执行。

------

## 问题五：修改三次数据为什么只更新一次 DOM？

推荐回答：

> 组件 render effect 配置了 scheduler。状态变化后不会立即连续执行 render，而是把组件更新任务放入队列，并通过任务去重。同一轮同步代码完成后，在微任务阶段统一刷新，因此多次状态变化通常合并成一次组件更新。

------

## 问题六：虚拟 DOM一定比真实 DOM快吗？

推荐回答：

> 不一定。已知精确修改位置时，直接 DOM操作可能更快。虚拟 DOM的价值在于声明式编程、跨平台抽象、统一更新模型和复杂 UI 的可维护性。Vue3 再通过编译器的 PatchFlag、静态提升和 Block Tree 缩小运行时 Diff 范围。

------

## 问题七：Vue3 Diff 具体流程是什么？

推荐回答：

> Vue3 会先同步相同前缀和后缀；如果一侧遍历结束，就直接处理剩余新增或删除；否则进入未知中间区域，为新节点建立 key 到索引映射，再遍历旧节点建立新旧索引关系，同时判断是否发生移动。发生移动时，对映射数组求最长递增子序列，序列中的节点保持原相对顺序，不需要移动，最后从后向前挂载新节点并移动不在序列中的节点。

------

## 问题八：最长递增子序列为什么能减少移动？

推荐回答：

> 映射数组表示新节点在旧数组中的位置。递增部分说明这些节点在新旧数组中的相对顺序一致，可以保留原位。最长递增子序列找到可保留的最大节点集合，因此剩余节点移动数量最少。Vue3 使用 O(n log n) 的贪心加二分算法计算它。

------

## 问题九：key 为什么不能用 index？

推荐回答：

> index 代表位置而不是业务身份。列表插入、删除或排序后，同一个 index 可能对应不同数据，导致 DOM、输入框值或子组件状态被错误复用。稳定业务 ID 才能让 Vue 正确识别节点身份。

------

## 问题十：Vue3 相比 Vue2 只优化了 Diff 吗？

推荐回答：

> 不是。Vue3 的性能提升还包括 Proxy 响应式、静态提升、PatchFlag、Block Tree、动态子节点收集、事件缓存以及更好的 Tree Shaking。Diff 中的最长递增子序列只是运行时优化的一部分。

------

# 五十五、本章最容易答错的 20 个点

1. 虚拟 DOM不是绝对比真实 DOM快。
2. Vue 模板会被编译成 render 函数。
3. render 函数返回的是 VNode，不是直接返回真实 DOM。
4. 响应式负责确定谁更新，Diff 负责确定 DOM怎么更新。
5. Proxy 代理的是对象，不是单个属性。
6. track 发生在读取时，trigger 发生在修改时。
7. 最外层依赖结构使用 WeakMap 是为了弱引用对象键。
8. Set 可以防止同一个 effect 重复收集。
9. 条件分支变化时需要清理旧依赖。
10. 嵌套 effect 需要 effect 栈。
11. computed 是带懒执行和 dirty 标记的特殊 effect。
12. scheduler 用于控制 effect 何时执行。
13. 多次状态修改通常会被批量更新。
14. nextTick 等待 Vue 更新队列，不等于浏览器完成绘制。
15. Diff 会先处理相同前缀和后缀。
16. LIS 处理的是乱序可复用节点，不是所有列表都一定执行。
17. LIS 是子序列，不要求连续。
18. key 的首要作用是稳定节点身份，不是单纯提高性能。
19. 随机 key 会导致节点每次都被重新创建。
20. Vue3 的性能优化来自编译器和运行时共同协作。

------

# 五十六、本章必背五分钟答案

下面这段要能连续讲出来：

> Vue3 的渲染流程可以分为编译、响应式触发和虚拟 DOM更新三部分。模板首先经过 Parse、Transform 和 Generate，编译成 render 函数。render 执行后生成虚拟 DOM，再由 patch 挂载成真实 DOM。
>
> 组件 render 会作为响应式 effect 执行。render 中读取 reactive 或 ref 数据时，通过 Proxy 的 get 触发 track，把当前组件更新 effect 收集到 WeakMap、Map、Set 组成的依赖结构里。数据修改时，set 触发 trigger，找到相关 effect。组件 effect 通过 scheduler 进入任务队列，同一轮中的重复更新会被去重，最后统一执行，因此多次状态修改通常只触发一次 DOM更新。
>
> 组件重新 render 后会生成新的虚拟 DOM，patch 比较新旧节点。普通元素会复用旧 DOM，再更新属性和子节点。数组子节点更新时，Vue3 先同步相同的前缀和后缀，再处理纯新增或纯删除。对于中间乱序区域，先建立新节点 key 到索引的映射，再遍历旧节点建立新旧索引关系。
>
> 如果发现节点顺序变化，Vue3 会对新旧索引映射数组计算最长递增子序列。递增子序列代表在新旧数组中仍保持相对顺序的节点，这些节点不需要移动；不在序列中的节点才移动，从而减少真实 DOM操作。最后从后向前处理节点，利用后一个节点作为插入锚点。
>
> Vue3 的性能优化不只有 Diff。编译器还会通过静态提升复用静态 VNode，通过 PatchFlag 标记动态文本和属性，通过 Block Tree 收集动态子节点，让运行时重点更新真正变化的部分。因此 Vue3 是响应式系统、虚拟 DOM、调度器和编译器协同工作的结果。

------

# 五十七、本章自测题

## 基础口述

1. Vue 模板如何变成真实 DOM？
2. AST 是什么？
3. VNode 通常包含哪些字段？
4. 虚拟 DOM一定更快吗？
5. patch 的主要职责是什么？
6. 相同 VNode 类型如何判断？
7. 响应式和虚拟 DOM分别解决什么问题？

## 响应式原理

1. `effect` 是什么？
2. `track` 什么时候执行？
3. `trigger` 什么时候执行？
4. 依赖关系为什么使用 WeakMap、Map、Set？
5. 为什么需要 activeEffect？
6. 为什么需要 effect 栈？
7. 为什么需要清理旧依赖？
8. computed 为什么有缓存？
9. scheduler 解决了什么问题？
10. 为什么修改三次数据通常只更新一次？

## Diff 算法

1. Vue3 Diff 为什么先比较头部和尾部？
2. 什么情况可以直接新增剩余节点？
3. 什么情况可以直接删除剩余节点？
4. 为什么需要 key 到新索引的 Map？
5. `newIndexToOldIndexMap` 中的 0 表示什么？
6. 如何判断节点发生了移动？
7. 最长递增子序列表示什么？
8. LIS 为什么能减少 DOM移动？
9. 为什么从后向前处理节点？
10. Vue2 和 Vue3 Diff 有什么区别？

## 编译优化

1. 静态提升是什么？
2. PatchFlag 是什么？
3. Block Tree 是什么？
4. dynamicChildren 的作用是什么？
5. 为什么说 Vue3 是编译时和运行时共同优化？

------

# 五十八、本章最终查漏补缺清单

下面全部能回答，才说明这一章基本过关：

```text
□ 能讲清模板到 render 函数的过程
□ 能说明虚拟 DOM不一定比直接 DOM快
□ 能区分响应式系统和 Diff 的职责
□ 能画出 WeakMap → Map → Set 依赖结构
□ 能讲清 track 和 trigger
□ 能解释分支依赖清理
□ 能解释 computed 的 dirty 缓存
□ 能解释 scheduler 和批量更新
□ 能说明 nextTick 等待什么
□ 能完整说出 Vue3 Diff 九步流程
□ 能通过具体数组讲清新旧索引映射
□ 能解释最长递增子序列
□ 能说明为什么从后向前移动节点
□ 能解释稳定 key 和 index key 的区别
□ 能说清 Vue2 和 Vue3 Diff 差异
□ 能解释静态提升
□ 能解释 PatchFlag
□ 能解释 Block Tree
□ 能结合 ECharts、地图和长列表讲项目应用
```

下一章进入 **React 核心知识：JSX、组件、状态更新、Fiber、render/commit、React Diff 与 Vue/React 核心差异**。
