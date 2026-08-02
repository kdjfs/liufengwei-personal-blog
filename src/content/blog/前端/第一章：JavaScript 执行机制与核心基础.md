---
title: 第一章：JavaScript 执行机制与核心基础
slug: di-yi-zhang-javascript-zhi-xing-ji-zhi-yu-he-xin-ji-chu
description: 这一章是 Vue、React、手撕题的地基。
publishDate: '2026-08-02'
category: 前端
tags:
  - React
  - Vue
  - JavaScript
  - 浏览器
  - 算法
cover: auto
draft: false
featured: false
toc: true
---
这一章是 Vue、React、手撕题的地基。

你的简历已经写了“理解作用域、闭包、异步任务”，面试官看到后，很可能从闭包一路追问到防抖、Hooks 闭包、内存泄漏、this 和原型链。

## 本章学习目标

学完后必须能够讲清楚：

1. JavaScript 代码如何执行
2. var、let、const 的区别
3. 作用域和作用域链
4. 闭包的原理、作用和缺点
5. this 的五种规则
6. call、apply、bind 的区别
7. 原型和原型链
8. new 与 instanceof 的原理
9. 浅拷贝和深拷贝
10. 垃圾回收与内存泄漏

------

# 一、JavaScript 代码是怎么执行的

## 1. 执行上下文

你可以把执行上下文理解为：

> JavaScript 执行一段代码时，为这段代码准备的“工作环境”。

执行上下文中主要保存：

- 当前有哪些变量
- 当前有哪些函数
- 外部作用域在哪里
- 当前的 this 指向谁

JavaScript 中常见的执行上下文有：

- 全局执行上下文
- 函数执行上下文
- eval 执行上下文，面试基本不用重点掌握

------

## 2. 调用栈

调用栈负责管理函数的执行顺序。

规律是：

> 后调用的函数先执行完，先进后出。

```js
// 定义函数 one
function one() {
  // 在 one 内部调用 two
  two();
} // one 函数定义结束

// 定义函数 two
function two() {
  // 在 two 内部输出内容
  console.log('执行 two');
} // two 函数定义结束

// 调用 one 函数
one();
```

执行过程：

```text
全局执行上下文入栈
→ one 执行上下文入栈
→ two 执行上下文入栈
→ two 执行结束并出栈
→ one 执行结束并出栈
→ 全部代码执行完成
```

## 🔴 必背答案

> JavaScript 通过执行上下文和调用栈管理代码执行。程序开始时创建全局执行上下文，调用函数时会创建对应的函数执行上下文并压入调用栈。函数执行结束后，其执行上下文会从调用栈弹出。调用栈遵循先进后出的原则。

## ⚠️ 易错点

调用栈不是事件循环。

- 调用栈：管理同步代码的执行
- 事件循环：协调同步任务、微任务和宏任务

事件循环会在第四章详细学习。

------

# 二、var、let、const 的区别

| 对比项           | var                     | let        | const      |
| ---------------- | ----------------------- | ---------- | ---------- |
| 作用域           | 函数作用域              | 块级作用域 | 块级作用域 |
| 重复声明         | 可以                    | 不可以     | 不可以     |
| 声明前访问       | undefined               | 报错       | 报错       |
| 是否可重新赋值   | 可以                    | 可以       | 不可以     |
| 是否挂到全局对象 | 浏览器全局 var 可能挂载 | 不会       | 不会       |

------

## 1. var 是函数作用域

```js
// 使用 if 创建一个代码块
if (true) {
  // 使用 var 声明变量，var 不受普通代码块限制
  var message = 'hello';
} // if 代码块结束

// 在代码块外依然可以访问
console.log(message);
```

## 2. let 和 const 是块级作用域

```js
// 使用 if 创建一个代码块
if (true) {
  // 使用 let 声明块级变量
  let message = 'hello';
} // if 代码块结束

// 代码块外访问会报错
console.log(message);
```

------

## 3. const 不能重新赋值，但对象内部可以修改

```js
// const 保存的是对象的引用地址
const user = {
  // 定义对象的 name 属性
  name: '刘凤伟',
}; // user 对象定义结束

// 修改对象内部属性是允许的
user.name = '凤伟';

// 重新给 user 赋值是不允许的
user = {};
```

const 限制的是：

> 变量中保存的地址不能改变。

它并不代表对象本身完全不可修改。

需要让对象尽量不可修改，可以使用：

```js
// 创建一个普通对象
const user = {
  // 定义对象属性
  name: '刘凤伟',
}; // user 对象定义结束

// 冻结对象的第一层属性
Object.freeze(user);

// 修改被冻结的第一层属性不会成功
user.name = '其他名字';
```

注意：`Object.freeze()` 默认也是浅冻结。

------

# 三、变量提升与暂时性死区

## 1. var 的变量提升

```js
// 声明前访问 var 变量，得到 undefined
console.log(age);

// 使用 var 声明并赋值
var age = 22;
```

可以近似理解为：

```js
// var 声明被提升，并初始化为 undefined
var age;

// 此时输出 undefined
console.log(age);

// 执行到原来的赋值位置时才赋值
age = 22;
```

------

## 2. let 和 const 也会提升

很多面试答案会说：

> let 和 const 不存在变量提升。

这不够准确。

准确说法是：

> let 和 const 声明也会被创建，但在执行到声明语句前不会被初始化，因此处于暂时性死区，访问会直接报错。

```js
// 此时 age 处于暂时性死区，访问会报错
console.log(age);

// 执行到这里才完成初始化
let age = 22;
```

## 🔴 必背答案

> var、let、const 都存在声明提升。var 在创建阶段会被初始化为 undefined，所以声明前访问得到 undefined；let 和 const 在执行到声明语句前不会被初始化，这段区域称为暂时性死区，提前访问会报 ReferenceError。

## 📌 一句话记忆

> var 提升后有值，值是 undefined；let 和 const 提升后没初始化，访问就报错。

------

# 四、作用域与作用域链

## 1. 什么是作用域

作用域决定：

> 一个变量可以在哪些位置被访问。

JavaScript 中主要有：

- 全局作用域
- 函数作用域
- 块级作用域
- 模块作用域

------

## 2. 什么是作用域链

当函数内部访问一个变量时：

1. 先在当前作用域中查找
2. 找不到就去外层作用域查找
3. 一直查到全局作用域
4. 仍然找不到就报错

```js
// 在全局作用域定义变量 name
const name = '全局变量';

// 定义外层函数
function outer() {
  // 在 outer 作用域中定义变量 age
  const age = 22;

  // 定义内部函数
  function inner() {
    // 当前作用域找不到 age，于是向 outer 作用域查找
    console.log(age);

    // 当前和 outer 都找不到 name，于是继续向全局作用域查找
    console.log(name);
  } // inner 函数定义结束

  // 调用内部函数
  inner();
} // outer 函数定义结束

// 调用外层函数
outer();
```

------

## 3. 作用域由定义位置决定

这是高频考点。

```js
// 在全局作用域定义变量 value
const value = '全局';

// 定义函数 show
function show() {
  // show 定义在全局，因此访问的是全局作用域
  console.log(value);
} // show 函数定义结束

// 定义函数 test
function test() {
  // 在 test 内部定义同名变量
  const value = '局部';

  // 调用 show 不会改变 show 的词法作用域
  show();
} // test 函数定义结束

// 调用 test
test();
```

结果是：

```text
全局
```

因为 JavaScript 使用的是：

> 词法作用域，也叫静态作用域。

函数能访问哪些变量，在函数定义时就已经基本确定，而不是在调用时确定。

## 🔴 必背答案

> 作用域链是变量查找机制。函数访问变量时，会先从当前作用域查找，找不到再沿着外层词法作用域逐级查找，直到全局作用域。JavaScript 使用词法作用域，因此作用域链由函数的定义位置决定，而不是调用位置决定。

------

# 五、闭包

闭包是这一章最重要的内容。

## 1. 通俗理解

想象一个函数离开了出生地，但它依然随身带着出生地的变量。

这个“函数加上它保留的外部变量环境”，就是闭包。

```js
// 定义外层函数 createCounter
function createCounter() {
  // 定义外层局部变量 count
  let count = 0;

  // 返回一个内部函数
  return function add() {
    // 内部函数访问并修改外层变量 count
    count += 1;

    // 返回修改后的 count
    return count;
  }; // 返回的内部函数结束
} // createCounter 函数定义结束

// 执行 createCounter，得到内部函数
const counter = createCounter();

// 第一次执行，结果为 1
console.log(counter());

// 第二次执行，结果为 2
console.log(counter());

// 第三次执行，结果为 3
console.log(counter());
```

正常情况下，`createCounter` 执行结束后，它的局部变量应该可以被回收。

但返回的内部函数还在使用 `count`，因此 `count` 会继续保留。

------

## 2. 闭包的严格定义

> 当一个函数能够访问并保留其外部词法作用域中的变量时，就形成了闭包。

闭包并不一定要求：

- 必须返回内部函数
- 必须嵌套两层函数
- 必须立即执行

核心判断标准是：

> 函数是否引用了外部作用域中的变量，并且这个函数还可能继续被使用。

------

## 3. 闭包的作用

### 封装私有变量

```js
// 定义创建用户管理器的函数
function createUserManager() {
  // 定义外部无法直接访问的私有变量
  let token = '';

  // 返回能够操作私有变量的方法
  return {
    // 定义设置 token 的方法
    setToken(newToken) {
      // 修改闭包中的 token
      token = newToken;
    }, // setToken 方法结束

    // 定义获取 token 的方法
    getToken() {
      // 返回闭包中的 token
      return token;
    }, // getToken 方法结束
  }; // 返回对象结束
} // createUserManager 函数定义结束

// 创建用户管理器
const userManager = createUserManager();

// 设置 token
userManager.setToken('abc123');

// 获取 token
console.log(userManager.getToken());
```

### 保存函数状态

防抖、节流、请求重试、并发控制都需要闭包保存状态。

```js
// 定义防抖函数
function debounce(callback, delay) {
  // 使用闭包保存定时器
  let timer = null;

  // 返回真正执行的包装函数
  return function debounced(...args) {
    // 清除上一次定时器
    clearTimeout(timer);

    // 创建新的定时器
    timer = setTimeout(() => {
      // 保留调用时的 this 和参数
      callback.apply(this, args);
    }, delay); // 定时器创建结束
  }; // 包装函数定义结束
} // debounce 函数定义结束
```

这里的 `timer` 能一直存在，就是因为返回的函数形成了闭包。

------

## 4. 闭包的缺点

闭包本身不是内存泄漏。

准确说法是：

> 闭包会延长外部变量的生命周期。只有当这些变量已经不再需要，但闭包引用仍长期存在时，才可能造成内存占用或内存泄漏。

常见情况：

- 定时器没有清除
- 事件监听没有移除
- WebSocket 没有关闭
- 大对象被闭包长期引用
- 全局数组不断保存回调函数
- React effect 没有执行清理
- Vue 组件卸载后仍保留订阅

## 🔴 闭包标准答案

> 闭包是函数和其外部词法环境的组合。当一个函数引用了外部作用域中的变量，即使外部函数已经执行结束，这些变量仍可能因为闭包而继续保留。闭包常用于封装私有变量、保存函数状态、防抖节流和函数柯里化。它的缺点是会延长变量的生命周期，如果无用引用长期不释放，可能导致内存占用甚至内存泄漏。

## 🟢 项目表达

你可以在面试中说：

> 我在搜索防抖、Token 刷新队列和 WebSocket 重连中都使用过闭包。例如防抖函数通过闭包保存 timer，每次触发时清除旧定时器，只让最后一次操作生效。使用闭包时也要注意组件卸载后的定时器和监听器清理，避免无效引用长期存在。

------

# 六、this 指向

## 最关键的一句话

> 普通函数的 this 主要由调用方式决定，而不是由函数定义位置决定。

箭头函数例外：

> 箭头函数没有自己的 this，它会继承外层词法作用域的 this。

------

## 1. 默认绑定

```js
// 开启严格模式
'use strict';

// 定义普通函数
function showThis() {
  // 严格模式下，普通调用的 this 是 undefined
  console.log(this);
} // showThis 函数定义结束

// 以普通函数形式调用
showThis();
```

非严格模式的浏览器普通脚本中，默认绑定通常指向 `window`。

严格模式下是 `undefined`。

------

## 2. 隐式绑定

谁通过点调用函数，this 通常就指向谁。

```js
// 定义用户对象
const user = {
  // 定义用户姓名
  name: '刘凤伟',

  // 定义普通函数方法
  introduce() {
    // this 指向调用 introduce 的 user
    console.log(this.name);
  }, // introduce 方法结束
}; // user 对象定义结束

// 通过 user 调用方法
user.introduce();
```

------

## 3. 显式绑定

通过 `call`、`apply`、`bind` 指定 this。

```js
// 定义用户对象
const user = {
  // 定义用户姓名
  name: '刘凤伟',
}; // user 对象定义结束

// 定义普通函数
function introduce(age, school) {
  // 输出当前 this 上的数据
  console.log(this.name, age, school);
} // introduce 函数定义结束

// 使用 call 立即调用，参数逐个传递
introduce.call(user, 22, '广东金融学院');

// 使用 apply 立即调用，参数使用数组传递
introduce.apply(user, [22, '广东金融学院']);

// 使用 bind 创建新函数，但不会立即执行
const boundIntroduce = introduce.bind(user, 22);

// 调用绑定后的函数并补充剩余参数
boundIntroduce('广东金融学院');
```

------

## 4. new 绑定

通过 `new` 调用构造函数时，this 指向新创建的对象。

```js
// 定义构造函数
function User(name) {
  // new 调用时，this 指向新对象
  this.name = name;
} // User 构造函数定义结束

// 使用 new 创建实例
const user = new User('刘凤伟');

// 输出实例属性
console.log(user.name);
```

------

## 5. 箭头函数

箭头函数没有自己的 this。

```js
// 定义用户对象
const user = {
  // 定义姓名
  name: '刘凤伟',

  // 定义普通函数方法
  introduce() {
    // 箭头函数继承 introduce 方法中的 this
    const showName = () => {
      // 此处 this 仍然指向 user
      console.log(this.name);
    }; // showName 箭头函数定义结束

    // 调用箭头函数
    showName();
  }, // introduce 方法结束
}; // user 对象定义结束

// 调用对象方法
user.introduce();
```

## ⚠️ 箭头函数不能通过 call 改变 this

```js
// 在全局作用域创建箭头函数
const show = () => {
  // 箭头函数没有自己的 this
  console.log(this);
}; // show 箭头函数定义结束

// call 无法重新绑定箭头函数的 this
show.call({
  // 创建用于测试的 name 属性
  name: '刘凤伟',
}); // call 调用结束
```

------

## this 优先级

普通函数中可以记为：

```text
new 绑定
> call、apply、bind 显式绑定
> 对象隐式绑定
> 默认绑定
```

箭头函数不参与这套规则。

## 🔴 this 标准答案

> 普通函数的 this 由调用方式决定。直接调用时，非严格模式通常指向全局对象，严格模式为 undefined；通过对象调用时指向该对象；通过 call、apply、bind 可以显式指定；通过 new 调用时指向新创建的实例。箭头函数没有自己的 this，它会继承定义位置外层作用域的 this，并且不能通过 call、apply、bind 修改。

------

# 七、call、apply、bind

## 核心区别

| 方法  | 是否立即执行 | 参数形式   |
| ----- | ------------ | ---------- |
| call  | 是           | 一个一个传 |
| apply | 是           | 数组传递   |
| bind  | 否           | 返回新函数 |

## 📌 一句话记忆

> call 一个个传，apply 数组传，bind 先绑定以后再执行。

------

## 🟠 手写 call

```js
// 给所有函数添加 myCall 方法
Function.prototype.myCall = function (context, ...args) {
  // null 和 undefined 默认指向 globalThis，其他值包装成对象
  const target = context == null ? globalThis : Object(context);

  // 创建唯一属性名，避免覆盖原对象属性
  const functionKey = Symbol('temporaryFunction');

  // this 就是调用 myCall 的原函数
  target[functionKey] = this;

  // 通过对象方法形式调用，让原函数的 this 指向 target
  const result = target[functionKey](...args);

  // 删除临时属性
  delete target[functionKey];

  // 返回原函数执行结果
  return result;
}; // myCall 方法定义结束
```

核心思路：

```text
obj.fn()
```

这样调用时，`fn` 内部的 this 就会指向 `obj`。

所以手写 call 本质是：

1. 把原函数临时放到目标对象上
2. 通过目标对象调用
3. 删除临时属性
4. 返回执行结果

------

## 🟠 手写 apply

```js
// 给所有函数添加 myApply 方法
Function.prototype.myApply = function (context, args = []) {
  // null 和 undefined 默认指向 globalThis
  const target = context == null ? globalThis : Object(context);

  // 创建不会冲突的唯一属性名
  const functionKey = Symbol('temporaryFunction');

  // 将原函数临时挂载到目标对象
  target[functionKey] = this;

  // 将数组形式的参数展开后调用
  const result = target[functionKey](...args);

  // 删除临时函数属性
  delete target[functionKey];

  // 返回执行结果
  return result;
}; // myApply 方法定义结束
```

------

## 🟠 手写 bind

```js
// 给所有函数添加 myBind 方法
Function.prototype.myBind = function (context, ...presetArgs) {
  // 保存调用 myBind 的原函数
  const originalFunction = this;

  // 创建绑定后的新函数
  function boundFunction(...laterArgs) {
    // 判断当前是否通过 new 调用了绑定函数
    const isNewCall = this instanceof boundFunction;

    // new 调用时使用新实例，否则使用传入的 context
    const finalContext = isNewCall ? this : context;

    // 合并预设参数和调用时参数，并执行原函数
    return originalFunction.apply(finalContext, [
      ...presetArgs,
      ...laterArgs,
    ]);
  } // boundFunction 函数定义结束

  // 让 new boundFunction 创建的对象能继承原函数原型
  boundFunction.prototype = Object.create(originalFunction.prototype);

  // 返回绑定后的新函数
  return boundFunction;
}; // myBind 方法定义结束
```

面试中最容易漏掉：

> bind 返回的函数仍然可能被 new 调用。

new 调用的优先级高于 bind 传入的 this。

------

# 八、原型与原型链

## 1. 为什么需要原型

假设创建一万个用户，每个用户都拥有完全相同的方法。

如果每个对象都复制一份方法，会浪费内存。

因此 JavaScript 可以把公共方法放到原型对象上，所有实例共享。

```js
// 定义 User 构造函数
function User(name) {
  // 将传入的姓名保存到实例上
  this.name = name;
} // User 构造函数定义结束

// 将公共方法添加到 User.prototype 上
User.prototype.introduce = function () {
  // this 指向调用该方法的实例
  console.log(`我是${this.name}`);
}; // introduce 方法定义结束

// 创建第一个用户实例
const user1 = new User('刘凤伟');

// 创建第二个用户实例
const user2 = new User('小明');

// 两个实例共享原型上的 introduce 方法
console.log(user1.introduce === user2.introduce);
```

结果是 `true`。

------

## 2. prototype 和对象原型的关系

```text
User.prototype
↑
user1 的内部 [[Prototype]]
```

可以通过标准方法查看：

```js
// 获取 user1 的原型对象
const prototype = Object.getPrototypeOf(user1);

// 判断实例原型是否等于构造函数 prototype
console.log(prototype === User.prototype);
```

------

## 3. 原型链查找

访问：

```js
user1.introduce
```

查找顺序是：

```text
先找 user1 自身属性
→ 找不到就找 User.prototype
→ 再找 Object.prototype
→ 最后到 null
```

这条查找链路就是原型链。

## 🔴 原型链标准答案

> 每个对象内部都有一个指向其原型对象的链接。访问对象属性时，JavaScript 会先检查对象自身，找不到再沿着原型对象逐级查找，直到找到目标属性或查到 null，这条查找链路就是原型链。构造函数的 prototype 属性通常会成为实例对象的原型。

## ⚠️ 易错点

- `prototype`：主要是函数拥有的属性
- 对象原型：对象内部的 `[[Prototype]]`
- `__proto__`：访问对象原型的历史性方式，不建议在业务中直接使用
- 推荐使用 `Object.getPrototypeOf()` 和 `Object.setPrototypeOf()`

------

# 九、new 操作符做了什么

## 🔴 必背四步

执行：

```js
const user = new User('刘凤伟');
```

大致发生了四件事：

1. 创建一个新对象
2. 将新对象的原型指向构造函数的 `prototype`
3. 使用新对象作为 this，执行构造函数
4. 根据构造函数返回值决定最终结果

## 返回值规则

- 返回普通值：忽略，仍返回新对象
- 没有返回值：返回新对象
- 返回对象或函数：返回构造函数主动返回的对象或函数

------

## 🟠 手写 new

```js
// 定义手写 new 函数
function myNew(Constructor, ...args) {
  // 创建新对象，并让它继承构造函数的 prototype
  const instance = Object.create(Constructor.prototype);

  // 使用新对象作为 this 执行构造函数
  const result = Constructor.apply(instance, args);

  // 判断构造函数是否主动返回了对象或函数
  const isObjectResult =
    result !== null &&
    (typeof result === 'object' || typeof result === 'function');

  // 主动返回对象时使用该对象，否则返回创建的实例
  return isObjectResult ? result : instance;
} // myNew 函数定义结束
```

测试：

```js
// 定义 User 构造函数
function User(name) {
  // 将姓名保存到当前实例
  this.name = name;
} // User 构造函数定义结束

// 使用手写 myNew 创建实例
const user = myNew(User, '刘凤伟');

// 输出实例姓名
console.log(user.name);

// 判断实例原型关系
console.log(Object.getPrototypeOf(user) === User.prototype);
```

------

# 十、instanceof 原理

## 作用

`instanceof` 判断：

> 右侧构造函数的 prototype，是否出现在左侧对象的原型链上。

```js
// 定义构造函数
function User() {} // User 构造函数定义结束

// 创建 User 实例
const user = new User();

// User.prototype 出现在 user 原型链上
console.log(user instanceof User);

// Object.prototype 也出现在 user 原型链上
console.log(user instanceof Object);
```

------

## 🟠 手写 instanceof

```js
// 定义手写 instanceof 函数
function myInstanceof(leftValue, rightConstructor) {
  // null 没有原型链，直接返回 false
  if (leftValue === null) {
    // 返回不匹配结果
    return false;
  } // null 判断结束

  // 基本类型通常不能作为 instanceof 左侧对象
  const leftType = typeof leftValue;

  // 排除非对象和非函数类型
  if (leftType !== 'object' && leftType !== 'function') {
    // 返回不匹配结果
    return false;
  } // 基本类型判断结束

  // 获取左侧对象的第一个原型
  let currentPrototype = Object.getPrototypeOf(leftValue);

  // 获取右侧构造函数的 prototype
  const targetPrototype = rightConstructor.prototype;

  // 沿着左侧对象的原型链不断向上查找
  while (currentPrototype !== null) {
    // 找到相同原型时说明匹配成功
    if (currentPrototype === targetPrototype) {
      // 返回匹配结果
      return true;
    } // 原型匹配判断结束

    // 继续获取上一层原型
    currentPrototype = Object.getPrototypeOf(currentPrototype);
  } // 原型链遍历结束

  // 遍历到 null 仍未找到
  return false;
} // myInstanceof 函数定义结束
```

## ⚠️ 易错点

```js
// 使用 instanceof 判断数组
console.log([] instanceof Array);

// 使用 instanceof 判断对象
console.log({} instanceof Object);
```

`instanceof` 适合判断引用类型的原型关系。

判断数组更推荐：

```js
// 使用标准方法判断数组
console.log(Array.isArray([]));
```

------

# 十一、浅拷贝与深拷贝

## 1. 浅拷贝

浅拷贝只复制第一层。

嵌套对象仍然共享同一个引用。

```js
// 创建原始对象
const original = {
  // 定义普通属性
  name: '刘凤伟',

  // 定义嵌套对象
  school: {
    // 定义学校名称
    name: '广东金融学院',
  }, // school 对象结束
}; // original 对象结束

// 使用展开运算符进行浅拷贝
const copied = {
  // 复制 original 第一层属性
  ...original,
}; // copied 对象结束

// 修改嵌套对象中的属性
copied.school.name = '其他学校';

// 原对象中的嵌套属性也会变化
console.log(original.school.name);
```

常见浅拷贝方式：

- 展开运算符
- `Object.assign`
- 数组 `slice`
- 数组 `concat`
- 数组展开运算符

------

## 2. JSON 深拷贝的问题

```js
// 通过 JSON 序列化和反序列化进行拷贝
const copied = JSON.parse(JSON.stringify(original));
```

它的问题包括：

- 丢失 `undefined`
- 丢失函数
- 丢失 Symbol 属性
- Date 变成字符串
- Map、Set 处理错误
- 无法处理循环引用
- RegExp 等特殊对象会丢失信息

------

## 3. structuredClone

现代环境可以使用：

```js
// 使用浏览器原生结构化克隆
const copied = structuredClone(original);
```

它支持较多类型：

- 普通对象
- 数组
- Date
- Map
- Set
- 循环引用
- ArrayBuffer

但不能直接克隆函数。

------

## 🟠 手写深拷贝核心版

```js
// 定义深拷贝函数，并通过 WeakMap 处理循环引用
function deepClone(value, cache = new WeakMap()) {
  // 基本类型和 null 直接返回
  if (value === null || typeof value !== 'object') {
    // 返回原始值
    return value;
  } // 基本类型判断结束

  // 已经拷贝过时直接返回缓存结果
  if (cache.has(value)) {
    // 避免循环引用导致无限递归
    return cache.get(value);
  } // 缓存判断结束

  // 单独处理 Date
  if (value instanceof Date) {
    // 复制时间戳并创建新的 Date
    return new Date(value.getTime());
  } // Date 处理结束

  // 单独处理 RegExp
  if (value instanceof RegExp) {
    // 使用正则源字符串和修饰符创建新正则
    return new RegExp(value.source, value.flags);
  } // RegExp 处理结束

  // 单独处理 Map
  if (value instanceof Map) {
    // 创建新的 Map
    const result = new Map();

    // 提前写入缓存以处理循环引用
    cache.set(value, result);

    // 遍历原 Map 中的键和值
    value.forEach((mapValue, mapKey) => {
      // 对键和值分别进行深拷贝
      result.set(
        deepClone(mapKey, cache),
        deepClone(mapValue, cache),
      );
    }); // Map 遍历结束

    // 返回新的 Map
    return result;
  } // Map 处理结束

  // 单独处理 Set
  if (value instanceof Set) {
    // 创建新的 Set
    const result = new Set();

    // 提前写入缓存
    cache.set(value, result);

    // 遍历原 Set
    value.forEach((setValue) => {
      // 深拷贝每个元素后加入新 Set
      result.add(deepClone(setValue, cache));
    }); // Set 遍历结束

    // 返回新的 Set
    return result;
  } // Set 处理结束

  // 数组创建空数组，对象保留原有原型
  const result = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value));

  // 提前缓存当前对象
  cache.set(value, result);

  // 获取包括 Symbol 在内的所有自有属性键
  Reflect.ownKeys(value).forEach((key) => {
    // 对每个属性值递归进行深拷贝
    result[key] = deepClone(value[key], cache);
  }); // 属性遍历结束

  // 返回最终拷贝结果
  return result;
} // deepClone 函数定义结束
```

## 🔴 深拷贝标准答案

> 浅拷贝只复制对象的第一层属性，嵌套引用类型仍然共享地址；深拷贝会递归复制所有层级，使新旧对象尽量互不影响。JSON 序列化实现简单，但无法正确处理 undefined、函数、Date、Map、Set 和循环引用。现代浏览器可以优先考虑 structuredClone，面试手写时可以通过递归配合 WeakMap 处理循环引用。

------

# 十二、垃圾回收机制

## 1. 为什么需要垃圾回收

JavaScript 创建对象、数组、函数时都会占用内存。

当一块内存以后不可能再被访问时，就应该被回收。

JavaScript 引擎会自动完成垃圾回收。

------

## 2. 标记清除

现代 JavaScript 垃圾回收的核心思想是：

> 标记清除。

它会从一组根对象开始查找。

常见根对象包括：

- 全局对象
- 当前调用栈中的变量
- 正在执行的函数
- 活跃闭包引用的变量
- DOM 等宿主环境对象

能够从根对象访问到的对象，会被标记为存活。

无法从根对象访问到的对象，会被回收。

```js
// 创建一个对象并由 user 引用
let user = {
  // 定义对象属性
  name: '刘凤伟',
}; // user 对象结束

// 清除变量对对象的引用
user = null;

// 原来的对象之后可能被垃圾回收
```

------

## 3. 常见内存泄漏

### 未清理的定时器

```js
// 创建定时器并保存编号
const timer = setInterval(() => {
  // 定时执行某个任务
  console.log('执行任务');
}, 1000); // 定时器创建结束

// 不再使用时清理定时器
clearInterval(timer);
```

### 未移除的事件监听

```js
// 定义点击事件处理函数
function handleClick() {
  // 输出点击提示
  console.log('按钮被点击');
} // handleClick 函数定义结束

// 注册点击事件
window.addEventListener('click', handleClick);

// 不再使用时移除同一个函数引用
window.removeEventListener('click', handleClick);
```

### React 中没有清理副作用

```js
// 注册组件副作用
useEffect(() => {
  // 定义消息处理函数
  const handleMessage = (event) => {
    // 输出 WebSocket 消息
    console.log(event.data);
  }; // handleMessage 函数定义结束

  // 注册 WebSocket 消息监听
  socket.addEventListener('message', handleMessage);

  // 返回清理函数
  return () => {
    // 组件卸载或依赖变化时移除监听
    socket.removeEventListener('message', handleMessage);
  }; // 清理函数结束
}, [socket]); // useEffect 调用结束
```

### Vue 中没有清理资源

```js
// 声明定时器变量
let timer = null;

// 组件挂载后执行
onMounted(() => {
  // 创建定时器
  timer = setInterval(() => {
    // 定时执行数据刷新
    refreshData();
  }, 1000); // 定时器创建结束
}); // onMounted 调用结束

// 组件卸载前执行
onUnmounted(() => {
  // 清除定时器
  clearInterval(timer);
}); // onUnmounted 调用结束
```

------

## 4. 为什么 WeakMap 常用于缓存

普通 Map 会强引用键对象。

即使其他地方不再使用这个对象，只要它还作为 Map 的键存在，就可能无法回收。

WeakMap 对键使用弱引用，不会因为 WeakMap 自身而阻止对象被垃圾回收。

因此深拷贝中使用 WeakMap 记录已经拷贝的对象比较合适。

## 🔴 垃圾回收标准答案

> JavaScript 主要通过标记清除算法进行垃圾回收。垃圾回收器从全局对象、调用栈、闭包等根对象出发，标记所有仍然可以访问的对象，无法访问的对象会被认为是垃圾并在之后回收。常见内存泄漏包括未清理的定时器、事件监听、WebSocket、无界缓存、游离 DOM 和被闭包长期引用的大对象。

------

# 十三、本章面试必背合集

## 1. 什么是闭包？

> 闭包是函数和其外部词法环境的组合。当函数引用了外部作用域变量时，即使外部函数执行结束，这些变量仍可能被保留。闭包常用于封装私有变量、保存状态、防抖节流和函数柯里化，但无用闭包长期存在可能增加内存占用。

## 2. var、let、const 有什么区别？

> var 是函数作用域，允许重复声明，声明提升后初始化为 undefined。let 和 const 是块级作用域，不允许在同一作用域重复声明，在声明前处于暂时性死区。let 可以重新赋值，const 不能重新赋值，但 const 对象内部属性仍可以修改。

## 3. this 指向规则是什么？

> 普通函数的 this 由调用方式决定，包括默认绑定、隐式绑定、显式绑定和 new 绑定。箭头函数没有自己的 this，而是继承外层作用域的 this，也不能通过 call、apply、bind 修改。

## 4. 原型链是什么？

> 对象访问属性时会先检查自身，如果不存在，就沿着对象内部的原型链接逐级查找，直到找到属性或查到 null，这条链路就是原型链。

## 5. new 做了什么？

> new 会创建新对象，将新对象原型指向构造函数的 prototype，使用新对象作为 this 执行构造函数，最后根据构造函数的返回值决定返回新对象还是构造函数主动返回的对象。

## 6. instanceof 原理是什么？

> instanceof 会判断右侧构造函数的 prototype 是否出现在左侧对象的原型链上。

## 7. 闭包一定会导致内存泄漏吗？

> 不一定。闭包只是延长变量生命周期。只有不再需要的闭包引用长期没有释放，才可能造成不必要的内存占用或内存泄漏。

------

# 十四、本章自测

先不要看上面的答案，尝试脱稿回答。

### 口述题

1. JavaScript 调用栈是什么？
2. let 和 const 到底有没有变量提升？
3. 暂时性死区是什么？
4. 作用域链由定义位置还是调用位置决定？
5. 什么是闭包？
6. 闭包为什么能够保存变量？
7. 闭包一定会内存泄漏吗？
8. call、apply、bind 有什么区别？
9. 箭头函数为什么不能修改 this？
10. prototype 和对象原型有什么区别？
11. new 操作符做了什么？
12. instanceof 的底层原理是什么？
13. 浅拷贝和深拷贝有什么区别？
14. JSON 深拷贝有哪些问题？
15. JavaScript 如何判断对象是否可以被回收？

### 🟠 手写题

必须能够独立写出：

1. `myCall`
2. `myApply`
3. `myBind`
4. `myNew`
5. `myInstanceof`
6. `deepClone`

### 🟢 简历项目题

> 你的项目中哪些地方用到了闭包？使用闭包时如何避免内存泄漏？

推荐回答：

> 我在搜索防抖、请求重试、Token 刷新队列以及 WebSocket 重连中都使用过闭包。例如防抖通过闭包保存 timer，请求刷新队列通过闭包保存当前刷新状态和等待请求。为了避免内存问题，我会在 Vue 组件卸载或 React effect 清理函数中清除定时器、移除事件监听并关闭 WebSocket，同时避免闭包长期引用不再使用的大对象。

学完后直接回复这 15 道口述题的答案，我会按照大厂面试官标准逐题纠正。
