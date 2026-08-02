---
title: 第五章：Vue3 核心知识查漏补缺
slug: di-wu-zhang-vue3-he-xin-zhi-shi-cha-lou-bu-que
description: 这一章先解决 Vue 面试中最常见的使用层问题：
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
cover: auto
draft: false
featured: false
toc: true
---
这一章先解决 Vue 面试中最常见的使用层问题：

- Vue2 和 Vue3 的区别
- Composition API
- `ref`、`reactive`
- `computed`、`watch`、`watchEffect`
- 生命周期
- 组件通信
- `v-model`
- `v-if`、`v-show`、`v-for`
- `nextTick`
- 插槽
- `KeepAlive`
- `Teleport`
- 异步组件
- Pinia
- Vue Router

你的简历中写了 Vue3、Composition API、Pinia、路由守卫、动态 TabBar、多角色权限和状态持久化，所以这些不仅要会用，还必须能说明为什么这样设计。

------

# 一、Vue2 和 Vue3 的区别

这是 Vue 面试最常见的开场题。

不要只回答：

> Vue2 用 `Object.defineProperty`，Vue3 用 Proxy。

这只是其中一部分。

## 1. 响应式实现不同

### Vue2

Vue2 主要通过 `Object.defineProperty` 劫持对象已有属性。

局限包括：

- 新增对象属性不能自动监听
- 删除对象属性不能自动监听
- 数组索引修改和 `length` 修改处理受限
- 初始化时需要递归遍历对象属性
- 需要通过 `$set`、`$delete` 解决部分问题

### Vue3

Vue3 主要使用 `Proxy` 代理整个对象。

优势包括：

- 可以监听属性新增
- 可以监听属性删除
- 可以监听 `in`、`Object.keys` 等操作
- 数组支持更加自然
- 可以按访问进行深层代理
- 不需要提前递归劫持所有属性

注意：

> Proxy 代理的是对象，不是某个具体属性。

------

## 2. API 组织方式不同

Vue2 常用 Options API：

```js
export default { // 导出 Vue 组件配置对象
  data() { // 定义组件响应式数据
    return { // 返回组件状态对象
      keyword: '', // 定义搜索关键词
      loading: false, // 定义加载状态
    }; // 状态对象返回结束
  }, // data 方法结束

  methods: { // 定义组件方法集合
    search() { // 定义搜索方法
      console.log(this.keyword); // 通过 this 访问组件状态
    }, // search 方法结束
  }, // methods 配置结束
}; // 组件配置结束
```

Vue3 常用 Composition API：

```js
import { ref } from 'vue'; // 从 Vue 中导入 ref

const keyword = ref(''); // 创建搜索关键词响应式状态

const loading = ref(false); // 创建加载状态

function search() { // 定义搜索函数
  console.log(keyword.value); // 在 JavaScript 中通过 value 访问 ref
} // search 函数结束
```

Composition API 的核心优势不是“代码更短”，而是：

> 可以把同一业务逻辑的状态、计算属性、监听和方法组织在一起，并通过组合函数复用。

------

## 3. Vue3 其他主要升级

- 更好的 TypeScript 支持
- 支持多个根节点 Fragment
- 支持 Teleport
- 支持 Suspense
- 支持 Composition API
- 支持更细粒度的 Tree Shaking
- 编译器优化更强
- Diff 算法优化
- 生命周期名称变化
- `v-model` 能力增强
- 更好的逻辑复用方式

## 🔴 标准答案

> Vue2 和 Vue3 的主要区别包括响应式系统、组件 API、编译优化和框架能力。Vue2 主要使用 Object.defineProperty 劫持已有属性，新增属性和数组索引存在限制；Vue3 使用 Proxy 代理整个对象，可以监听新增、删除和更多对象操作。Vue3 还引入 Composition API，改善复杂组件的逻辑组织和复用，同时在 TypeScript、Tree Shaking、Fragment、Teleport 和编译优化方面进行了升级。

------

# 二、Options API 和 Composition API

## 1. Options API 的特点

按照选项分类：

```text
data
computed
watch
methods
生命周期
```

优点：

- 结构固定
- 对初学者直观
- 小组件容易阅读
- Vue2 项目兼容性好

问题：

> 同一个业务功能的代码可能分散在 data、computed、watch、methods 和生命周期中。

------

## 2. Composition API 的特点

按照业务逻辑组织：

```text
搜索功能
→ keyword
→ searchResult
→ search
→ watch(keyword)

上传功能
→ files
→ progress
→ upload
→ retry
```

它更适合：

- 大型复杂组件
- TypeScript
- 逻辑抽取
- 自定义组合函数
- 多个业务模块共存

------

## 3. 组合函数 composable

例如封装请求状态：

```js
import { ref } from 'vue'; // 从 Vue 中导入 ref

export function useRequest(requestFunction) { // 定义通用请求组合函数
  const data = ref(null); // 保存请求成功数据

  const loading = ref(false); // 保存请求加载状态

  const error = ref(null); // 保存请求异常

  async function execute(...args) { // 定义请求执行函数
    loading.value = true; // 请求开始前开启 loading

    error.value = null; // 清空上一次错误

    try { // 开始捕获异步异常
      const result = await requestFunction(...args); // 执行传入的请求函数

      data.value = result; // 保存请求结果

      return result; // 将结果返回给调用方
    } catch (requestError) { // 捕获请求异常
      error.value = requestError; // 保存异常信息

      throw requestError; // 继续向上抛出异常
    } finally { // 无论成功失败都会执行
      loading.value = false; // 请求结束后关闭 loading
    } // 异常处理结束
  } // execute 函数结束

  return { // 返回组合函数暴露的内容
    data, // 暴露请求数据
    loading, // 暴露加载状态
    error, // 暴露错误状态
    execute, // 暴露请求方法
  }; // 返回对象结束
} // useRequest 组合函数结束
```

## ⚠️ 易错点

Composition API 不等于：

> 所有代码全部放到 `setup` 里。

如果把一个组件几百行代码全部堆在 `setup` 中，仍然难维护。

正确做法是：

> 按业务能力拆分成多个 composable。

## 🔴 标准答案

> Options API 按 data、methods、computed 等选项组织代码，适合简单组件；Composition API 按业务关注点组织逻辑，更适合复杂组件、TypeScript 和逻辑复用。Composition API 的价值不是简单替换写法，而是将状态和相关行为封装成 composable，降低组件内部逻辑分散的问题。

------

# 三、ref 和 reactive

这是 Vue3 最常考的问题之一。

------

## 1. ref

`ref` 可以包装：

- 基本类型
- 对象
- 数组

```js
import { ref } from 'vue'; // 从 Vue 中导入 ref

const count = ref(0); // 创建数字类型响应式状态

count.value += 1; // 在 JavaScript 中通过 value 修改状态
```

模板中会自动解包，通常不需要写 `.value`。

------

## 2. reactive

`reactive` 主要用于对象、数组、Map、Set 等对象类型。

```js
import { reactive } from 'vue'; // 从 Vue 中导入 reactive

const user = reactive({ // 创建响应式用户对象
  name: '刘凤伟', // 定义姓名
  age: 22, // 定义年龄
}); // 用户对象结束

user.age += 1; // 直接修改响应式对象属性
```

不能直接包装基本类型：

```js
import { reactive } from 'vue'; // 从 Vue 中导入 reactive

const count = reactive(0); // 错误：reactive 不能有效代理基本类型
```

原因是：

> Proxy 只能代理对象，不能代理一个独立的基本类型值。

------

## 3. ref 包装对象时发生什么

```js
import { ref } from 'vue'; // 导入 ref

const user = ref({ // 使用 ref 包装对象
  name: '刘凤伟', // 定义姓名
}); // 对象定义结束
```

对于普通对象，Vue 会将 `user.value` 进一步转换成响应式对象。

因此：

```js
user.value.name = '小刘'; // 修改对象内部属性仍能触发响应式更新
```

------

## 4. reactive 解构会丢失响应式

```js
import { reactive } from 'vue'; // 导入 reactive

const user = reactive({ // 创建响应式对象
  name: '刘凤伟', // 定义姓名
  age: 22, // 定义年龄
}); // 对象定义结束

const { name, age } = user; // 将属性值解构成普通变量

user.name = '小刘'; // 修改原响应式对象

console.log(name); // 解构后的普通变量不会自动更新
```

原因：

> 解构拿到的是当前属性值，而不是继续连接原代理对象的访问过程。

------

## 5. toRefs 解决解构问题

```js
import { reactive, toRefs } from 'vue'; // 导入 reactive 和 toRefs

const user = reactive({ // 创建响应式用户对象
  name: '刘凤伟', // 定义姓名
  age: 22, // 定义年龄
}); // 对象结束

const { name, age } = toRefs(user); // 将每个属性转换成保持关联的 ref

user.name = '小刘'; // 修改原对象属性

console.log(name.value); // 输出更新后的姓名
```

------

## 6. toRef

只转换某一个属性：

```js
import { reactive, toRef } from 'vue'; // 导入 reactive 和 toRef

const user = reactive({ // 创建响应式对象
  name: '刘凤伟', // 定义姓名
  age: 22, // 定义年龄
}); // 对象结束

const name = toRef(user, 'name'); // 创建与 user.name 双向关联的 ref

name.value = '小刘'; // 修改 ref 的值

console.log(user.name); // 原对象属性也同步变化
```

------

## 7. ref 和 reactive 怎么选择

推荐实际开发中：

- 独立状态优先 `ref`
- 结构稳定的一组对象状态可用 `reactive`
- 需要整体替换时更适合 `ref`
- 组合函数返回值通常更适合返回多个 `ref`

例如接口数据可能整体替换：

```js
import { ref } from 'vue'; // 导入 ref

const user = ref(null); // 创建可整体替换的用户状态

user.value = { // 将整个用户对象替换为接口结果
  name: '刘凤伟', // 定义姓名
}; // 新对象结束
```

`reactive` 不能通过直接重新赋值保持原引用关系：

```js
import { reactive } from 'vue'; // 导入 reactive

let user = reactive({ // 创建响应式对象
  name: '', // 定义初始姓名
}); // 对象结束

user = { // 重新赋值成普通对象
  name: '刘凤伟', // 定义新姓名
}; // 此时变量指向新的普通对象，原代理关系丢失
```

可以使用：

```js
Object.assign(user, { // 将新字段合并到原代理对象
  name: '刘凤伟', // 更新姓名
}); // 合并结束
```

## 🔴 标准答案

> ref 可以包装基本类型和对象，JavaScript 中通过 value 访问；reactive 主要代理对象类型，可以直接访问属性。reactive 解构后容易丢失响应式，需要配合 toRefs 或 toRef。需要独立状态或整体替换时我通常优先使用 ref，管理结构稳定的对象集合时可以使用 reactive。

------

# 四、shallowRef、shallowReactive 和 markRaw

这是普通候选人容易漏掉的优化点。

## 1. shallowRef

只追踪 `.value` 本身的替换，不深度追踪内部对象变化。

```js
import { shallowRef } from 'vue'; // 导入 shallowRef

const chartInstance = shallowRef(null); // 保存第三方图表实例

chartInstance.value = createChart(); // 替换实例时触发更新
```

适合保存：

- ECharts 实例
- 地图实例
- 编辑器实例
- WebSocket 实例
- 大型不可变对象

为什么？

> 这些第三方实例内部结构复杂，没有必要被 Vue 深度转换成响应式对象。

------

## 2. markRaw

明确告诉 Vue 不要将对象转换成响应式对象。

```js
import { markRaw, reactive } from 'vue'; // 导入 markRaw 和 reactive

const state = reactive({ // 创建响应式状态对象
  chart: markRaw(createChart()), // 将图表实例标记为非响应式
}); // 状态对象结束
```

## 🟢 项目表达

星途智旅中的地图实例、ECharts 图谱实例，通常不应深度响应式：

> 我会使用 `shallowRef` 保存地图或 ECharts 实例，只在实例整体创建、替换和销毁时管理它，避免 Vue 对第三方实例内部的大量属性进行无意义代理。

------

# 五、computed

## 1. computed 是派生状态

```js
import { computed, ref } from 'vue'; // 导入 computed 和 ref

const firstName = ref('凤伟'); // 创建名字状态

const lastName = ref('刘'); // 创建姓氏状态

const fullName = computed(() => { // 创建计算属性
  return `${lastName.value}${firstName.value}`; // 根据依赖返回完整姓名
}); // 计算属性结束
```

原则：

> 能根据已有状态计算出来的值，尽量不要再单独存一份状态。

错误设计：

```js
const firstName = ref('凤伟'); // 保存名字

const lastName = ref('刘'); // 保存姓氏

const fullName = ref('刘凤伟'); // 又单独保存完整姓名，容易出现状态不一致
```

------

## 2. computed 有缓存

计算属性只有在依赖发生变化时才重新计算。

```js
import { computed, ref } from 'vue'; // 导入 computed 和 ref

const price = ref(100); // 创建商品价格

const quantity = ref(2); // 创建商品数量

const totalPrice = computed(() => { // 创建总价计算属性
  console.log('重新计算总价'); // 观察计算执行次数

  return price.value * quantity.value; // 返回总价
}); // 计算属性结束
```

多次读取 `totalPrice.value`，只要依赖没有变化，就复用缓存。

------

## 3. computed 不适合执行副作用

不推荐：

```js
const result = computed(() => { // 创建计算属性
  requestData(); // 错误：在 computed 中发送请求副作用

  loading.value = true; // 错误：修改其他状态副作用

  return keyword.value.trim(); // 返回计算值
}); // 计算属性结束
```

computed 应尽量保持：

> 纯计算、无副作用。

------

## 4. 可写 computed

```js
import { computed, ref } from 'vue'; // 导入 computed 和 ref

const firstName = ref('凤伟'); // 保存名字

const lastName = ref('刘'); // 保存姓氏

const fullName = computed({ // 创建可读写计算属性
  get() { // 定义读取逻辑
    return `${lastName.value}${firstName.value}`; // 返回完整姓名
  }, // get 结束

  set(newValue) { // 定义写入逻辑
    lastName.value = newValue.slice(0, 1); // 保存姓氏部分

    firstName.value = newValue.slice(1); // 保存名字部分
  }, // set 结束
}); // computed 配置结束
```

## 🔴 标准答案

> computed 用于声明派生状态，具有依赖追踪和缓存能力。依赖未变化时，多次读取会复用上次结果；依赖变化后才重新计算。computed 应保持纯计算，不适合发送请求或修改其他状态等副作用。

------

# 六、watch 和 watchEffect

## 1. watch

特点：

- 明确指定监听源
- 可以获得新值和旧值
- 默认不会立即执行
- 支持 `immediate`
- 支持深度监听
- 适合明确的副作用逻辑

```js
import { ref, watch } from 'vue'; // 导入 ref 和 watch

const keyword = ref(''); // 创建搜索关键词

watch(keyword, (newKeyword, oldKeyword) => { // 监听关键词变化
  console.log('新关键词：', newKeyword); // 输出新值

  console.log('旧关键词：', oldKeyword); // 输出旧值
}); // watch 结束
```

------

## 2. 监听 reactive 的某个属性

错误：

```js
import { reactive, watch } from 'vue'; // 导入 reactive 和 watch

const user = reactive({ // 创建响应式用户对象
  age: 22, // 定义年龄
}); // 用户对象结束

watch(user.age, () => { // 错误：传入的是普通数字 22
  console.log('年龄变化'); // 监听逻辑
}); // watch 结束
```

正确：

```js
watch( // 调用 watch
  () => user.age, // 使用 getter 返回需要监听的属性
  (newAge, oldAge) => { // 接收新值和旧值
    console.log(newAge, oldAge); // 输出年龄变化
  }, // 回调结束
); // watch 结束
```

------

## 3. watchEffect

`watchEffect` 会自动收集回调执行过程中读取的响应式依赖。

```js
import { ref, watchEffect } from 'vue'; // 导入 ref 和 watchEffect

const keyword = ref('Vue'); // 创建搜索关键词

const pageIndex = ref(1); // 创建页码状态

watchEffect(() => { // 创建自动依赖追踪副作用
  console.log(keyword.value); // 读取 keyword，自动成为依赖

  console.log(pageIndex.value); // 读取 pageIndex，自动成为依赖
}); // watchEffect 结束
```

特点：

- 创建后立即执行一次
- 自动收集同步阶段读取的依赖
- 不直接提供传统意义上的旧值
- 依赖不够显式

------

## 4. watch 与 watchEffect 的选择

使用 `watch`：

- 明确知道监听谁
- 需要新旧值
- 需要精确控制触发
- 不希望回调中其他读取意外成为依赖

使用 `watchEffect`：

- 副作用依赖多个状态
- 依赖关系简单自然
- 希望立即执行
- 不关心旧值

------

## 5. 异步 watchEffect 的依赖收集陷阱

```js
watchEffect(async () => { // 创建异步 watchEffect
  console.log(keyword.value); // await 前读取，会被收集为依赖

  await requestData(); // 暂停当前函数

  console.log(pageIndex.value); // await 后首次读取，通常不会在本轮自动收集
}); // watchEffect 结束
```

重要结论：

> `watchEffect` 主要收集同步执行阶段读取的响应式依赖，尤其要注意 `await` 之后的依赖。

------

## 6. 清理上一次副作用

搜索请求场景：

```js
import { ref, watch } from 'vue'; // 导入 ref 和 watch

const keyword = ref(''); // 创建搜索关键词

watch(keyword, async (newKeyword, oldKeyword, onCleanup) => { // 监听关键词变化
  const controller = new AbortController(); // 创建请求取消控制器

  onCleanup(() => { // 注册本轮监听的清理函数
    controller.abort(); // 下一次触发前取消上一次请求
  }); // 清理函数注册结束

  const response = await fetch( // 发起搜索请求
    `/api/search?keyword=${encodeURIComponent(newKeyword)}`, // 拼接安全编码后的关键词
    {
      signal: controller.signal, // 传入取消信号
    }, // fetch 配置结束
  ); // 请求结束

  const data = await response.json(); // 解析响应数据

  console.log(data); // 使用最新搜索结果
}); // watch 结束
```

这是一个很好的面试加分点：

> watch 不只是监听状态，还可以清理上一次异步副作用，避免请求竞态和资源浪费。

## 🔴 标准答案

> watch 需要明确指定监听源，可以获取新旧值并精确控制触发，适合接口请求、缓存同步等明确副作用。watchEffect 会立即执行并自动收集同步执行过程中读取的响应式依赖，写法简洁但依赖不够显式。异步副作用还要通过清理函数取消上一次请求或定时器。

------

# 七、生命周期

Composition API 常见生命周期：

| 阶段                 | API               |
| -------------------- | ----------------- |
| 组件创建、执行 setup | `setup` 本身      |
| 挂载前               | `onBeforeMount`   |
| 挂载后               | `onMounted`       |
| 更新前               | `onBeforeUpdate`  |
| 更新后               | `onUpdated`       |
| 卸载前               | `onBeforeUnmount` |
| 卸载后               | `onUnmounted`     |
| KeepAlive 激活       | `onActivated`     |
| KeepAlive 失活       | `onDeactivated`   |
| 捕获子组件错误       | `onErrorCaptured` |

------

## 1. onMounted

适合：

- 获取 DOM
- 初始化图表
- 初始化地图
- 注册仅客户端存在的资源

```js
import { onMounted, ref } from 'vue'; // 导入 onMounted 和 ref

const chartContainer = ref(null); // 保存图表容器 DOM

onMounted(() => { // 组件挂载完成后执行
  console.log(chartContainer.value); // 此时通常可以访问真实 DOM
}); // onMounted 结束
```

------

## 2. onUnmounted

必须清理：

- 定时器
- 事件监听
- WebSocket
- 图表实例
- 地图实例
- Observer
- 未完成请求
- 第三方订阅

```js
import { onMounted, onUnmounted } from 'vue'; // 导入生命周期函数

let timer = null; // 保存定时器编号

onMounted(() => { // 组件挂载后执行
  timer = setInterval(() => { // 创建轮询定时器
    refreshData(); // 定时刷新数据
  }, 5000); // 每五秒执行一次
}); // onMounted 结束

onUnmounted(() => { // 组件卸载后执行
  clearInterval(timer); // 清理轮询定时器
}); // onUnmounted 结束
```

------

## 3. 不要在 onUpdated 中无条件修改状态

错误：

```js
onUpdated(() => { // 每次组件更新完成后执行
  count.value += 1; // 再次修改状态，可能造成无限更新
}); // onUpdated 结束
```

------

## 4. 父子生命周期大致顺序

首次挂载时常见顺序：

```text
父 setup
→ 父 beforeMount
→ 子 setup
→ 子 beforeMount
→ 子 mounted
→ 父 mounted
```

卸载时常见理解：

```text
父 beforeUnmount
→ 子 beforeUnmount
→ 子 unmounted
→ 父 unmounted
```

不要只死背顺序，更重要的是理解：

> 父组件要等子组件挂载完成后，自己的 mounted 才算完成。

------

# 八、组件通信方式

## 1. 父传子：props

子组件：

```js
const props = defineProps({ // 声明子组件接收的 props
  title: { // 定义 title 属性规则
    type: String, // 限制 title 为字符串
    required: true, // 声明 title 必须传入
  }, // title 配置结束
}); // props 声明结束
```

props 原则：

> 单向数据流，子组件不应直接修改父组件传入的 props。

错误：

```js
props.title = '新标题'; // 错误：直接修改父组件传入的数据
```

------

## 2. 子传父：emit

子组件：

```js
const emit = defineEmits([ // 声明子组件可以触发的事件
  'submit', // 声明 submit 事件
]); // 事件声明结束

function handleSubmit() { // 定义提交方法
  emit('submit', { // 触发 submit 事件
    id: 1, // 向父组件传递业务 ID
  }); // emit 调用结束
} // handleSubmit 结束
```

------

## 3. defineExpose

在 `<script setup>` 中，组件内部变量默认不会自动暴露给父组件。

子组件：

```js
function open() { // 定义打开弹窗的方法
  visible.value = true; // 将弹窗状态设为显示
} // open 方法结束

defineExpose({ // 向父组件显式暴露内容
  open, // 暴露 open 方法
}); // defineExpose 结束
```

父组件通过模板引用调用。

使用时不要滥用：

> 父组件频繁直接控制子组件内部细节，会增加耦合。

适合：

- 弹窗 `open`
- 表单 `validate`
- 地图 `resize`
- 编辑器 `focus`

------

## 4. provide / inject

适合跨多层组件共享依赖：

```js
import { provide, ref } from 'vue'; // 导入 provide 和 ref

const theme = ref('dark'); // 创建主题状态

provide('theme', theme); // 向后代组件提供主题
```

后代组件：

```js
import { inject } from 'vue'; // 导入 inject

const theme = inject('theme', 'light'); // 注入主题并设置默认值
```

问题：

- 来源不够直观
- 层级复杂时难追踪
- 字符串 key 可能冲突

大型项目可以使用 Symbol：

```js
export const themeKey = Symbol('theme'); // 创建唯一的依赖注入键
```

------

## 5. Pinia

适合：

- 跨页面状态
- 多组件共享
- 用户信息
- 权限
- 全局配置
- 长期业务状态

不适合：

> 把所有组件局部状态都扔进 Pinia。

弹窗开关、某个输入框内容，通常留在组件内部更合理。

------

## 通信选择总结

| 场景             | 推荐方式             |
| ---------------- | -------------------- |
| 父传子           | props                |
| 子通知父         | emit                 |
| 双向受控输入     | v-model              |
| 父调用子暴露能力 | ref + defineExpose   |
| 跨少量层级依赖   | provide/inject       |
| 全局业务状态     | Pinia                |
| 路由参数         | params/query         |
| 临时事件通知     | EventEmitter，但谨慎 |

------

# 九、v-model 原理

## 1. 原生输入框

```html
<!-- 创建一个双向绑定的输入框 -->
<input v-model="keyword" />
```

可以近似理解为：

```html
<!-- 将状态绑定到输入框 value -->
<input
  :value="keyword"
  @input="keyword = $event.target.value"
/>
```

核心：

```text
状态向视图传递 value
+
视图通过事件更新状态
```

------

## 2. 组件上的 v-model

父组件：

```html
<!-- 将 visible 通过 v-model 传给子组件 -->
<Dialog v-model="visible" />
```

子组件默认对应：

```js
const props = defineProps({ // 声明子组件 props
  modelValue: Boolean, // 接收父组件传入的 modelValue
}); // props 声明结束

const emit = defineEmits([ // 声明更新事件
  'update:modelValue', // 声明 v-model 对应的更新事件
]); // emit 声明结束

function closeDialog() { // 定义关闭弹窗方法
  emit('update:modelValue', false); // 通知父组件更新绑定值
} // closeDialog 结束
```

------

## 3. 多个 v-model

父组件：

```html
<!-- 同时绑定姓名和年龄 -->
<UserForm
  v-model:name="userName"
  v-model:age="userAge"
/>
```

对应子组件事件：

```text
update:name
update:age
```

## 🔴 标准答案

> v-model 本质上是属性绑定和更新事件的语法糖。原生输入框通常对应 value 和 input 事件；组件上的默认 v-model 对应 modelValue 属性和 update:modelValue 事件。Vue3 还支持多个带参数的 v-model。

------

# 十、v-if 和 v-show

## 1. v-if

- 条件为 false 时不创建对应 DOM
- 切换时会创建和销毁节点
- 初次条件为 false 时开销较低
- 频繁切换成本较高

## 2. v-show

- DOM 始终存在
- 通过 CSS `display` 控制显示隐藏
- 初始渲染成本较高
- 频繁切换成本较低

## 如何选择

- 权限模块、很少显示：`v-if`
- Tab 切换、频繁展开收起：`v-show`
- 不希望隐藏内容继续占用组件资源：`v-if`
- 需要保留 DOM 状态：可考虑 `v-show`

## ⚠️ 易错点

`v-show` 不支持 `<template>`，因为它需要操作真实 DOM 的 `display`。

## 🔴 标准答案

> v-if 是真正的条件渲染，条件变化时会创建或销毁 DOM 和组件；v-show 始终渲染 DOM，只切换 display。低频切换适合 v-if，高频切换适合 v-show。但还要结合组件初始化成本、状态保留和资源占用判断。

------

# 十一、v-for 和 key

## 1. key 的作用

key 用于标识节点身份，帮助 Vue 在更新列表时判断：

- 哪个节点可以复用
- 哪个节点需要移动
- 哪个节点需要新增
- 哪个节点需要删除

------

## 2. 为什么不建议使用 index

```html
<!-- 不推荐：使用数组索引作为节点身份 -->
<div
  v-for="(user, index) in users"
  :key="index"
>
  <!-- 展示用户姓名 -->
  {{ user.name }}
</div>
```

在列表头部插入、排序、删除时：

- index 会改变
- 原节点身份和业务数据不再稳定对应
- 表单输入、组件局部状态可能错误复用

更推荐：

```html
<!-- 推荐：使用稳定且唯一的业务 ID -->
<div
  v-for="user in users"
  :key="user.id"
>
  <!-- 展示用户姓名 -->
  {{ user.name }}
</div>
```

------

## 3. index 什么时候勉强可以用

- 列表完全静态
- 不会增删
- 不会排序
- 子项没有局部状态
- 没有更稳定的唯一 ID

## 🔴 标准答案

> key 不是为了消除警告，而是给虚拟节点提供稳定身份。使用稳定唯一的业务 ID，可以帮助 Diff 正确复用和移动节点。index 会随着插入、删除和排序发生变化，可能导致 DOM 或组件状态错误复用，因此动态列表不建议使用 index 作为 key。

------

# 十二、nextTick

## 1. 为什么需要 nextTick

Vue 状态修改后，DOM 通常不会立即同步更新，而是将更新任务放入调度队列，批量处理。

```js
import { nextTick, ref } from 'vue'; // 导入 nextTick 和 ref

const count = ref(0); // 创建计数状态

async function updateCount() { // 定义更新方法
  count.value += 1; // 修改响应式状态

  console.log(element.textContent); // 此时 DOM 可能仍是旧值

  await nextTick(); // 等待本轮 DOM 更新完成

  console.log(element.textContent); // 此时通常可以读取最新 DOM
} // updateCount 结束
```

------

## 2. 为什么要批量更新

```js
count.value += 1; // 第一次修改状态

count.value += 1; // 第二次修改状态

count.value += 1; // 第三次修改状态
```

如果每次都立即重新渲染，会产生多次无意义 DOM 更新。

Vue 会尽量：

```text
收集多次状态变化
→ 去重组件更新任务
→ 在异步队列中统一更新
```

------

## 3. nextTick 不是什么

`nextTick` 不是：

- 等待接口请求
- 固定等待一帧
- 通用延时函数
- 保证所有图片加载完成
- 保证浏览器已经完成绘制

它主要表示：

> 等待 Vue 当前批次的 DOM 更新完成。

## 🔴 标准答案

> Vue 会对同一轮同步代码中的多次状态修改进行批量调度，避免重复渲染，所以修改状态后 DOM 不一定立即更新。nextTick 用于等待 Vue 当前更新队列刷新完成，再读取更新后的 DOM。它不是普通延时工具，也不等于浏览器已经完成绘制。

------

# 十三、插槽 slot

插槽用于：

> 让父组件决定子组件部分区域渲染什么内容。

## 1. 默认插槽

子组件：

```html
<!-- 定义卡片容器 -->
<div class="card">
  <!-- 渲染父组件传入的默认内容 -->
  <slot />
</div>
```

------

## 2. 具名插槽

子组件：

```html
<!-- 定义卡片容器 -->
<div class="card">
  <!-- 渲染头部插槽 -->
  <slot name="header" />

  <!-- 渲染默认插槽 -->
  <slot />

  <!-- 渲染底部插槽 -->
  <slot name="footer" />
</div>
```

------

## 3. 作用域插槽

子组件向父组件提供数据，但渲染结构由父组件决定。

子组件：

```html
<!-- 向父组件插槽暴露当前用户 -->
<slot :user="currentUser" />
```

父组件：

```html
<!-- 接收子组件暴露的 user -->
<UserList v-slot="{ user }">
  <!-- 自定义用户展示结构 -->
  <span>{{ user.name }}</span>
</UserList>
```

## 深度理解

作用域插槽体现的是：

> 数据由子组件管理，UI 由父组件定制。

它与 React 中的 render props 思想相似。

------

# 十四、KeepAlive

`KeepAlive` 用于缓存动态组件或路由组件实例。

被缓存的组件切换时：

- 不会真正卸载
- 状态可以保留
- DOM 可能被移出当前渲染树
- 会触发 activated/deactivated

适合：

- 列表进入详情后返回保留滚动位置
- 多 Tab 页面
- 表单临时切换
- 需要保留查询条件

------

## 生命周期

```js
import { onActivated, onDeactivated } from 'vue'; // 导入 KeepAlive 生命周期

onActivated(() => { // 缓存组件重新激活时执行
  console.log('组件重新显示'); // 输出激活信息
}); // onActivated 结束

onDeactivated(() => { // 缓存组件进入失活状态时执行
  console.log('组件暂时隐藏'); // 输出失活信息
}); // onDeactivated 结束
```

------

## ⚠️ KeepAlive 不是越多越好

缓存过多会造成：

- 内存占用增加
- 过期数据长期存在
- 定时器仍可能运行
- WebSocket 或事件订阅没有暂停
- 页面重新激活时数据不新鲜

需要合理配置：

- `include`
- `exclude`
- `max`

## 高分回答

> KeepAlive 缓存的是组件实例和状态，不只是静态 DOM。进入失活状态时组件不会走普通卸载流程，所以定时器、监听和数据刷新需要结合 onActivated、onDeactivated 单独管理。

------

# 十五、Teleport

Teleport 可以将组件的一部分 DOM 渲染到当前组件 DOM 层级之外。

典型场景：

- 全局弹窗
- Toast
- Drawer
- Tooltip
- Loading 遮罩

```html
<!-- 将弹窗内容传送到 body 下 -->
<Teleport to="body">
  <!-- 渲染弹窗 -->
  <div class="dialog">
    <!-- 展示弹窗内容 -->
    弹窗内容
  </div>
</Teleport>
```

## 为什么需要 Teleport

弹窗如果处于复杂父容器中，可能受到：

- `overflow: hidden`
- `transform`
- `z-index`
- 层叠上下文

影响。

Teleport 只改变：

> 最终 DOM 挂载位置。

不会改变：

- 组件逻辑父子关系
- props
- emit
- provide/inject

## 🔴 标准答案

> Teleport 用于将组件部分 DOM 渲染到指定容器，常用于弹窗和全局浮层，避免受到父容器 overflow 和层叠上下文影响。它只改变真实 DOM 的挂载位置，不改变组件关系和数据流。

------

# 十六、异步组件

异步组件用于：

> 在真正需要时再加载组件代码。

```js
import { defineAsyncComponent } from 'vue'; // 导入异步组件定义函数

const UserDialog = defineAsyncComponent(() => { // 定义异步弹窗组件
  return import('./UserDialog.vue'); // 动态加载弹窗组件代码
}); // 异步组件定义结束
```

适合：

- 大型弹窗
- 低频功能
- 富文本编辑器
- 地图组件
- 图表组件
- 管理后台非首屏模块

------

## 完整配置

```js
import { defineAsyncComponent } from 'vue'; // 导入 defineAsyncComponent
import LoadingComponent from './LoadingComponent.vue'; // 导入加载组件
import ErrorComponent from './ErrorComponent.vue'; // 导入错误组件

const AsyncPage = defineAsyncComponent({ // 创建异步页面组件
  loader: () => import('./HeavyPage.vue'), // 定义组件加载函数

  loadingComponent: LoadingComponent, // 配置加载中组件

  errorComponent: ErrorComponent, // 配置加载失败组件

  delay: 200, // 延迟两百毫秒后再展示加载组件

  timeout: 10000, // 十秒未加载完成则视为超时
}); // 异步组件配置结束
```

## ⚠️ 异步组件不等于接口异步

它优化的是：

> JavaScript 组件代码的加载时机。

不是自动优化组件内部接口请求。

------

# 十七、自定义指令

适合封装：

> 与真实 DOM 操作紧密相关、难以通过普通组件表达的复用逻辑。

例如权限指令：

```js
const vPermission = { // 定义权限自定义指令
  mounted(element, binding) { // 元素挂载后执行
    const requiredPermission = binding.value; // 获取指令绑定的权限值

    const hasPermission = checkPermission(requiredPermission); // 检查当前用户权限

    if (!hasPermission) { // 判断用户是否没有权限
      element.remove(); // 从 DOM 中移除当前元素
    } // 权限判断结束
  }, // mounted 钩子结束
}; // 指令定义结束
```

但安全上必须明确：

> 前端权限控制只能改善界面体验，不能代替后端接口鉴权。

即使按钮被隐藏，攻击者仍可能手动调用接口。

------

# 十八、Pinia 核心

## 1. Pinia 解决什么问题

Pinia 用于管理：

- 用户信息
- Token
- 角色权限
- 全局配置
- 跨页面业务状态
- 多组件共享数据

------

## 2. Setup Store

```js
import { defineStore } from 'pinia'; // 从 Pinia 导入 defineStore
import { computed, ref } from 'vue'; // 从 Vue 导入 computed 和 ref

export const useUserStore = defineStore('user', () => { // 定义用户仓库
  const userInfo = ref(null); // 保存用户信息

  const token = ref(''); // 保存访问令牌

  const permissions = ref([]); // 保存权限列表

  const isLoggedIn = computed(() => { // 创建是否登录计算属性
    return Boolean(token.value); // 根据 token 判断登录状态
  }); // 计算属性结束

  function setUserInfo(newUserInfo) { // 定义设置用户信息方法
    userInfo.value = newUserInfo; // 更新用户信息
  } // setUserInfo 结束

  function setToken(newToken) { // 定义设置 Token 方法
    token.value = newToken; // 更新 Token
  } // setToken 结束

  function logout() { // 定义退出登录方法
    userInfo.value = null; // 清空用户信息

    token.value = ''; // 清空 Token

    permissions.value = []; // 清空权限列表
  } // logout 结束

  return { // 返回 Store 对外暴露的内容
    userInfo, // 暴露用户信息
    token, // 暴露 Token
    permissions, // 暴露权限列表
    isLoggedIn, // 暴露登录计算属性
    setUserInfo, // 暴露用户更新方法
    setToken, // 暴露 Token 更新方法
    logout, // 暴露退出方法
  }; // 返回对象结束
}); // Store 定义结束
```

------

## 3. Store 解构问题

不推荐：

```js
const userStore = useUserStore(); // 获取用户 Store

const { userInfo, token } = userStore; // 直接解构状态可能丢失响应式联系
```

推荐：

```js
import { storeToRefs } from 'pinia'; // 导入 storeToRefs

const userStore = useUserStore(); // 获取用户 Store

const { userInfo, token } = storeToRefs(userStore); // 响应式解构 Store 状态

const { logout } = userStore; // 方法可以直接解构
```

------

## 4. Pinia 持久化

Pinia 本身的内存状态在页面刷新后会丢失。

持久化可以放到：

- localStorage
- sessionStorage
- IndexedDB
- 持久化插件

但不要无脑持久化整个 Store：

- 数据可能过期
- 存储体积膨胀
- 版本结构变化
- 敏感信息泄露
- 多账号数据串用

推荐只保存必要字段：

- Token
- 用户基础 ID
- 偏好配置
- 必要缓存版本

## 🟢 项目回答

> 万福鉴酒中用户、鉴定师和合作商共用一套前端代码。我通过 Pinia 保存登录用户、角色和权限集合，路由层负责页面准入，TabBar 根据角色配置动态生成。持久化只保存必要登录信息，切换角色或退出登录时统一重置相关 Store，避免旧角色状态残留。

------

# 十九、Vue Router 核心

## 1. 路由模式

### Hash 模式

地址类似：

```text
/#/home
```

特点：

- `#` 后内容不会作为正常路径发送给服务器
- 部署简单
- 兼容性较好
- URL 不够美观

### History 模式

地址类似：

```text
/home
```

特点：

- URL 更自然
- 需要服务器配置回退
- 刷新 `/home` 时服务器要返回前端入口文件

## 高频问题

为什么 History 模式刷新会 404？

因为浏览器刷新时会向服务器请求真实路径 `/home`，服务器如果没有该接口或文件，就返回 404。

需要服务器配置：

```text
所有前端路由路径
→ 回退到 index.html
→ 再由前端路由接管
```

------

## 2. 路由懒加载

```js
const routes = [ // 定义路由配置数组
  {
    path: '/travel', // 定义旅行页面路径

    component: () => import('./pages/TravelPage.vue'), // 路由访问时再加载组件
  },
]; // 路由数组结束
```

------

## 3. 全局前置守卫

```js
router.beforeEach(async (to, from) => { // 注册全局前置守卫
  const userStore = useUserStore(); // 获取用户 Store

  if (to.meta.requiresAuth && !userStore.isLoggedIn) { // 判断页面是否需要登录
    return { // 返回重定向目标
      path: '/login', // 跳转登录页

      query: { // 传递登录成功后的回跳地址
        redirect: to.fullPath, // 保存原目标地址
      }, // query 结束
    }; // 重定向对象结束
  } // 登录校验结束

  if (to.meta.permission) { // 判断路由是否配置权限
    const hasPermission = userStore.permissions.includes( // 检查权限集合
      to.meta.permission, // 读取路由要求的权限
    ); // 权限检查结束

    if (!hasPermission) { // 用户没有权限
      return '/403'; // 跳转无权限页面
    } // 无权限判断结束
  } // 路由权限判断结束

  return true; // 允许继续导航
}); // 前置守卫结束
```

------

## 4. 守卫不要做什么

不要在每次路由跳转时：

- 重复获取用户信息
- 无限添加动态路由
- 重复刷新 Token
- 复杂同步计算
- 忘记处理异常
- 产生重定向死循环

------

## 5. 前端权限三层

成熟的权限设计通常包括：

### 路由权限

控制能否进入页面。

### 菜单和按钮权限

控制界面上显示哪些操作。

### 接口权限

后端最终校验用户是否真的可以执行操作。

## 🔴 必背

> 前端权限不是安全边界。路由守卫和按钮隐藏只能减少误操作，真正的数据安全必须由后端接口鉴权保证。

------

# 二十、动态路由和动态 TabBar

你简历中写了多角色和动态 TabBar，这里必须讲清楚。

推荐流程：

```text
用户登录
→ 获取用户角色和权限
→ 生成可访问菜单
→ 注册动态路由
→ 生成角色对应 TabBar
→ 页面和按钮继续校验权限
```

不要只根据角色写大量 `if/else`：

```js
if (role === 'user') { // 判断普通用户
  // 返回普通用户菜单
} else if (role === 'appraiser') { // 判断鉴定师
  // 返回鉴定师菜单
} else if (role === 'supplier') { // 判断合作商
  // 返回合作商菜单
}
```

更适合配置驱动：

```js
const tabBarConfig = { // 定义角色对应的 TabBar 配置
  user: [ // 定义普通用户菜单
    {
      name: '首页', // 定义菜单名称
      path: '/home', // 定义菜单路径
    },
  ], // 普通用户菜单结束

  appraiser: [ // 定义鉴定师菜单
    {
      name: '鉴定任务', // 定义菜单名称
      path: '/tasks', // 定义菜单路径
    },
  ], // 鉴定师菜单结束
}; // TabBar 配置结束
```

## 高分表达

> 我的多角色页面不是在每个组件里散落大量角色判断，而是将路由、TabBar 和按钮权限配置化。登录后根据角色和权限集合生成可访问结构，核心接口仍由后端鉴权。这样新增角色时主要扩展配置，而不是到处修改业务判断。

------

# 二十一、Vue 常见性能陷阱

## 1. 大对象全部 reactive

地图、图表、编辑器实例不应全部深度响应式。

解决：

- `shallowRef`
- `markRaw`

## 2. 模板中调用复杂函数

```html
<!-- 不推荐：每次渲染都可能重新执行复杂函数 -->
<div>{{ calculateComplexResult(list) }}</div>
```

适合改成 computed。

## 3. watch 里同时修改监听源

```js
watch(keyword, () => { // 监听 keyword
  keyword.value = keyword.value.trim(); // 处理不当可能重复触发
}); // watch 结束
```

需要防止无意义重复赋值。

## 4. 滥用深度监听

```js
watch( // 创建深度监听
  form, // 监听大型表单对象
  saveDraft, // 每次深层变化都执行保存
  {
    deep: true, // 开启深度监听
  }, // 配置结束
); // watch 结束
```

大型对象深度监听可能成本较高。

可改为：

- 监听关键字段
- 防抖保存
- 拆分状态
- 通过明确事件触发

## 5. 大列表全部渲染

需要：

- 分页
- 虚拟列表
- 懒加载
- 分片渲染

## 6. Key 不稳定

不要使用随机数：

```html
<!-- 错误：每次渲染 key 都变化，节点无法复用 -->
<div :key="Math.random()" />
```

这会导致组件不断销毁和重建。

------

# 二十二、你的简历项目高频拷打

## 1. 为什么使用 Pinia，不直接放全局变量？

> 普通全局变量缺少标准化的响应式更新、调试能力和生命周期管理。Pinia 将跨组件状态、派生状态和业务行为集中管理，同时与 Vue 响应式系统、开发工具和 TypeScript 配合更好。但局部弹窗状态仍保留在组件中，不会为了统一而全部放进 Store。

------

## 2. 多角色动态 TabBar 怎么实现？

> 登录后获取用户角色和权限集合，根据配置表生成当前角色可见的 TabBar；路由守卫负责页面准入，按钮级权限负责操作展示，后端负责最终接口鉴权。切换角色时会重置旧角色相关页面缓存和 Store，避免权限和状态串用。

------

## 3. computed 和 watch 怎么选？

> 可以从已有状态计算得到的派生值使用 computed，它有缓存且应保持纯计算；当状态变化后需要发送请求、写缓存、修改 DOM 或执行日志上报等副作用时使用 watch。watchEffect 适合依赖较自然且无需旧值的副作用。

------

## 4. ref 和 reactive 怎么选？

> 独立状态和需要整体替换的数据优先 ref；结构稳定的对象集合可以使用 reactive。reactive 直接解构会丢失响应式，需要 toRefs；第三方实例则使用 shallowRef 或 markRaw，避免无意义深度代理。

------

## 5. 为什么用了 KeepAlive，页面返回后数据没更新？

> KeepAlive 组件返回时不会重新 mounted，而是触发 activated。因此需要根据数据新鲜度在 onActivated 中决定是否刷新，并在 onDeactivated 中暂停轮询、监听或其他后台任务。

------

## 6. Vue 中修改状态后为什么拿不到最新 DOM？

> Vue 会对同一轮同步代码中的状态修改进行批量调度，DOM 更新不是立即完成的。需要读取更新后 DOM 时使用 await nextTick，但 nextTick 只保证 Vue 更新队列完成，不代表图片加载和浏览器绘制也全部完成。

------

# 二十三、本章最容易漏掉的 20 个点

1. Vue3 用 Proxy，但基本类型仍需要 `ref` 包装。
2. `ref` 可以包装对象，不只是基本类型。
3. `reactive` 直接解构会丢失响应式联系。
4. `toRefs` 适合响应式解构。
5. `reactive` 整体重新赋值容易丢失原代理关系。
6. 第三方实例适合 `shallowRef` 或 `markRaw`。
7. computed 是派生状态，不应执行副作用。
8. watch 默认不会立即执行。
9. watchEffect 创建后通常立即执行一次。
10. watchEffect 主要收集同步执行阶段的依赖。
11. 异步监听要清理上一次副作用。
12. `onMounted` 前不能保证真实 DOM 已经可用。
13. 组件卸载要清理定时器、监听和 WebSocket。
14. props 是单向数据流，子组件不应直接修改。
15. `v-model` 是属性和更新事件的语法糖。
16. `v-show` 始终保留 DOM。
17. key 必须稳定，不要使用随机数。
18. `nextTick` 只等待 Vue DOM 更新，不是万能延时。
19. KeepAlive 失活不等于卸载。
20. 前端权限不能代替后端鉴权。

------

# 二十四、本章必背标准答案

## Vue2 和 Vue3 的区别

> Vue2 主要使用 Object.defineProperty 劫持已有属性，新增删除属性和部分数组操作存在限制；Vue3 使用 Proxy 代理整个对象，支持更多操作类型。Vue3 还引入 Composition API，并加强了 TypeScript、Tree Shaking、Fragment、Teleport 和编译优化能力。

## ref 和 reactive

> ref 可以包装基本类型和对象，JavaScript 中通过 value 访问；reactive 主要代理对象类型。reactive 解构容易丢失响应式，需要配合 toRefs。独立状态或需要整体替换时我倾向使用 ref，结构稳定的对象可以使用 reactive。

## computed 和 watch

> computed 用于派生状态，具有缓存能力，应保持纯计算；watch 用于监听明确状态变化并执行接口请求、缓存同步等副作用。watchEffect 会立即执行并自动收集同步阶段读取的依赖，但依赖不如 watch 显式。

## nextTick

> Vue 会将同一轮中的多次状态变化批量调度，状态修改后 DOM 不一定立即更新。nextTick 用于等待 Vue 当前更新队列刷新完成，再读取最新 DOM，但不代表浏览器已经完成绘制或资源加载。

## key

> key 为虚拟节点提供稳定身份，帮助 Diff 正确复用和移动节点。动态列表使用 index 可能导致节点和组件局部状态错误复用，应优先使用稳定唯一的业务 ID。

## KeepAlive

> KeepAlive 缓存组件实例和状态，切换时不会真正卸载，而会触发 activated 和 deactivated。它适合保留列表滚动和表单状态，但要处理数据过期、轮询暂停和缓存容量问题。

------

# 二十五、本章自测

尝试脱稿回答：

1. Vue2 和 Vue3 至少说出六个区别。
2. Composition API 真正解决了什么问题？
3. `ref` 为什么需要 `.value`？
4. `reactive` 为什么不能代理基本类型？
5. `reactive` 解构为什么丢失响应式？
6. `ref` 和 `reactive` 在项目中怎么选？
7. `shallowRef` 适合保存什么？
8. computed 为什么有缓存？
9. 为什么不应该在 computed 中请求接口？
10. watch 和 watchEffect 有什么区别？
11. watchEffect 中 `await` 后读取的依赖有什么问题？
12. watch 如何清理上一次请求？
13. 组件通信方式有哪些？
14. `v-model` 的底层原理是什么？
15. `v-if` 和 `v-show` 如何选择？
16. 为什么不能随意使用 index 作为 key？
17. nextTick 到底等待什么？
18. KeepAlive 为什么可能导致数据不新鲜？
19. Teleport 会改变组件父子关系吗？
20. Pinia 状态为什么要用 storeToRefs 解构？
21. History 路由刷新为什么可能 404？
22. 前端权限为什么不能代替后端权限？

------

# 二十六、本章最后背诵总结

> Vue3 通过 Proxy 构建响应式系统，并通过 Composition API 改善复杂组件的逻辑组织和复用。ref 适合独立状态和整体替换，reactive 适合结构稳定的对象，但解构时需要 toRefs。computed 用于有缓存的派生状态，watch 用于明确的副作用，watchEffect 会自动收集同步阶段读取的依赖。
>
> Vue 的组件通信应保持清晰的数据流：父传子使用 props，子通知父使用 emit，双向受控输入使用 v-model，跨层依赖可以使用 provide/inject，全局业务状态使用 Pinia。局部状态不应全部塞进 Store。
>
> Vue 会批量调度状态更新，因此修改状态后需要通过 nextTick 等待当前 DOM 更新完成。动态列表要使用稳定唯一的 key，KeepAlive 要注意激活和失活生命周期，第三方地图和图表实例应使用 shallowRef 或 markRaw 避免无意义的深度响应式。
>
> 路由守卫、动态菜单和按钮权限只能控制前端体验，真正的数据和操作安全必须由后端接口鉴权保证。
