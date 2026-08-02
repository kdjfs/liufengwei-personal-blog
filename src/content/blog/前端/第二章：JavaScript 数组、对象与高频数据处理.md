---
title: 第二章：JavaScript 数组、对象与高频数据处理
slug: di-er-zhang-javascript-shu-zu-dui-xiang-yu-gao-pin-shu-ju-chu-li
description: 这一章看似基础，实际上非常容易拉开面试差距。
publishDate: '2026-08-02'
category: 前端
tags:
  - React
  - Vue
  - JavaScript
  - TypeScript
  - Node.js
  - 算法
cover: auto
draft: false
featured: false
toc: true
---
这一章看似基础，实际上非常容易拉开面试差距。

普通候选人只会回答：

> `map` 返回新数组，`forEach` 没有返回值。

更好的候选人会继续讲：

- 哪些方法修改原数组
- 回调函数接收什么参数
- 是否跳过稀疏数组的空槽
- 时间复杂度是多少
- 是否会产生中间数组
- 什么场景应该换成 `Map`
- 为什么 `includes` 能找到 `NaN`
- 为什么 `every([])` 是 `true`
- 为什么 `sort()` 会产生线上 Bug

你的简历中写了使用 `Promise.all` 并行获取数据，再通过 `Map` 将本地关联查询优化到接近 `O(1)`，所以面试官很可能从数组查找追问到 `Map`、时间复杂度、空间换时间和大数据量性能。

------

# 一、本章必须掌握什么

学完本章后，你必须做到：

## 🔴 必背

1. 哪些数组方法会修改原数组
2. `map`、`forEach`、`filter`、`find` 的区别
3. `some` 和 `every` 的区别
4. `slice` 和 `splice` 的区别
5. `includes` 和 `indexOf` 的区别
6. `reduce` 的执行过程
7. `sort` 为什么容易出错
8. `Map` 和普通对象的区别
9. 为什么数组查找通常是 `O(n)`
10. 为什么 `Map.get()` 工程上通常接近 `O(1)`

## 🟠 必会手写

1. 手写 `map`
2. 手写 `filter`
3. 手写 `reduce`
4. 数组去重
5. 数组扁平化
6. 数组分组
7. 数组转树
8. 使用 `Map` 优化关联查询

------

# 二、先建立数组的底层认识

## 1. JavaScript 数组本质上是特殊对象

```js
// 创建一个数组
const list = ['Vue', 'React'];

// 输出数组的第一个元素
console.log(list[0]);

// 输出数组长度
console.log(list.length);

// 查看数组的类型
console.log(typeof list);

// 判断当前值是否为数组
console.log(Array.isArray(list));
```

输出：

```text
Vue
2
object
true
```

数组本质上仍然是对象，只是它具有：

- 数字形式的索引属性
- 自动维护的 `length`
- `Array.prototype` 上的一系列方法
- 针对连续元素存储的引擎优化

## 📌 一句话记忆

> JavaScript 数组是带有数字索引、length 和数组方法的特殊对象。

------

## 2. 数组不一定真的连续

```js
// 创建一个空数组
const list = [];

// 直接设置索引 3
list[3] = 'React';

// 输出数组长度
console.log(list.length);

// 输出完整数组
console.log(list);
```

结果类似：

```text
4
[empty × 3, 'React']
```

前面三个位置叫作：

> 空槽，也叫稀疏数组中的 hole。

它和显式写入 `undefined` 不完全相同。

```js
// 创建带空槽的数组
const sparseArray = new Array(3);

// 创建明确包含 undefined 的数组
const undefinedArray = [undefined, undefined, undefined];

// 判断索引 0 是否真正存在
console.log(0 in sparseArray);

// 判断索引 0 是否真正存在
console.log(0 in undefinedArray);
```

结果：

```text
false
true
```

这是偏深一点的知识。面试官问数组底层或稀疏数组时，可以讲出来。

------

# 三、哪些数组方法会修改原数组

这是必须背熟的基础题。

## 1. 会修改原数组的方法

| 方法         | 作用                             |
| ------------ | -------------------------------- |
| `push`       | 尾部添加元素                     |
| `pop`        | 删除尾部元素                     |
| `unshift`    | 头部添加元素                     |
| `shift`      | 删除头部元素                     |
| `splice`     | 删除、插入、替换元素             |
| `sort`       | 原地排序                         |
| `reverse`    | 原地反转                         |
| `fill`       | 使用指定值填充                   |
| `copyWithin` | 将数组内部一段内容复制到另一位置 |

## 2. 通常不修改原数组的方法

| 方法         | 作用                     |
| ------------ | ------------------------ |
| `map`        | 映射生成新数组           |
| `filter`     | 筛选生成新数组           |
| `slice`      | 截取生成新数组           |
| `concat`     | 合并生成新数组           |
| `flat`       | 扁平化生成新数组         |
| `flatMap`    | 映射后扁平一层           |
| `toSorted`   | 排序后返回新数组         |
| `toReversed` | 反转后返回新数组         |
| `toSpliced`  | 修改后返回新数组         |
| `with`       | 替换指定索引后返回新数组 |

## 3. 不返回新数组，而是返回其他结果

| 方法        | 返回结果             |
| ----------- | -------------------- |
| `forEach`   | `undefined`          |
| `find`      | 第一个满足条件的元素 |
| `findIndex` | 第一个满足条件的索引 |
| `some`      | 布尔值               |
| `every`     | 布尔值               |
| `includes`  | 布尔值               |
| `indexOf`   | 索引或 `-1`          |
| `reduce`    | 累积后的任意结果     |

------

## ⚠️ 重要陷阱：不修改原数组，不代表深拷贝

```js
// 创建包含对象的数组
const users = [
  // 定义第一个用户对象
  {
    // 定义用户姓名
    name: '刘凤伟',
  },
];

// 使用 map 创建新数组
const copiedUsers = users.map((user) => {
  // 直接返回原对象引用
  return user;
});

// 修改新数组中的对象属性
copiedUsers[0].name = '小刘';

// 原数组中的对象也被修改
console.log(users[0].name);
```

为什么？

因为 `map` 创建的是：

> 新数组，但数组内部的对象引用仍然指向同一对象。

如果希望同时复制对象：

```js
// 创建包含对象的数组
const users = [
  // 定义第一个用户
  {
    // 定义姓名
    name: '刘凤伟',
  },
];

// 使用 map 创建新数组
const copiedUsers = users.map((user) => {
  // 返回一个浅拷贝后的新对象
  return {
    // 复制原用户的第一层属性
    ...user,
  };
});

// 修改新对象中的姓名
copiedUsers[0].name = '小刘';

// 原对象不会被修改
console.log(users[0].name);
```

## 🔴 面试标准答案

> `map`、`filter`、`slice` 等方法通常不会修改原数组，而是返回新数组。但它们通常只复制元素引用，不等于深拷贝。如果数组中存放的是对象，新旧数组中的元素仍可能指向同一个对象。

------

# 四、map 和 forEach 的区别

这是最常考的数组方法问题之一。

## 1. map

`map` 的目标是：

> 将一个数组映射成另一个数组。

```js
// 创建商品价格数组
const prices = [100, 200, 300];

// 将每个价格乘以 0.8
const discountedPrices = prices.map((price) => {
  // 返回打八折后的价格
  return price * 0.8;
});

// 输出新数组
console.log(discountedPrices);
```

------

## 2. forEach

`forEach` 的目标是：

> 遍历数组，并执行副作用操作。

副作用包括：

- 修改外部变量
- 修改 DOM
- 打印日志
- 发送请求
- 调用其他函数

```js
// 创建用户数组
const users = ['刘凤伟', '小明', '小张'];

// 遍历每个用户
users.forEach((user) => {
  // 输出当前用户
  console.log(user);
});
```

------

## 3. 核心区别

| 对比项           | map        | forEach        |
| ---------------- | ---------- | -------------- |
| 返回值           | 新数组     | `undefined`    |
| 主要用途         | 数据转换   | 执行副作用     |
| 是否适合链式调用 | 适合       | 不适合         |
| 是否修改原数组   | 默认不修改 | 取决于回调内部 |
| 是否支持 `break` | 不支持     | 不支持         |

------

## 4. forEach 中的 return 不能结束外层函数

```js
// 创建数字数组
const numbers = [1, 2, 3];

// 定义查找函数
function findNumber() {
  // 遍历数字数组
  numbers.forEach((number) => {
    // 判断当前数字是否为 2
    if (number === 2) {
      // 这里只是结束当前回调
      return number;
    }
  });

  // 最终仍然会执行到这里
  return undefined;
}

// 输出结果
console.log(findNumber());
```

结果是：

```text
undefined
```

`forEach` 回调中的 `return` 只相当于跳过当前回调剩余代码，不能结束整个 `forEach`，也不能结束外层函数。

需要提前结束时，可以使用：

- `for...of`
- `some`
- `find`
- 普通 `for` 循环

------

## 5. map 中忘记 return

```js
// 创建数字数组
const numbers = [1, 2, 3];

// 使用 map 转换数组
const result = numbers.map((number) => {
  // 只进行了计算，但没有返回
  number * 2;
});

// 输出结果
console.log(result);
```

结果：

```text
[undefined, undefined, undefined]
```

正确写法：

```js
// 创建数字数组
const numbers = [1, 2, 3];

// 使用 map 生成新数组
const result = numbers.map((number) => {
  // 返回计算结果
  return number * 2;
});

// 输出新数组
console.log(result);
```

------

## 🔴 必背答案

> `map` 用于数据映射，会根据每个元素的返回值生成一个等长新数组；`forEach` 主要用于遍历和执行副作用，返回值固定为 `undefined`。如果只是打印、修改 DOM 或调用接口，可以使用 `forEach`；如果需要将原数组转换成新数组，应该使用 `map`。两者都不能通过普通的 `break` 或回调中的 `return` 提前结束整个遍历。

## 🟡 深度补充

大量数据处理时：

```js
// 创建数字数组
const numbers = [1, 2, 3, 4, 5];

// 先筛选偶数，再乘以 10
const result = numbers
  // 生成第一个中间数组
  .filter((number) => {
    // 返回是否为偶数
    return number % 2 === 0;
  })
  // 生成第二个中间数组
  .map((number) => {
    // 返回乘以 10 的结果
    return number * 10;
  });
```

这种链式调用可读性很好，但会创建中间数组。

热点性能路径中，可以使用单次循环：

```js
// 创建数字数组
const numbers = [1, 2, 3, 4, 5];

// 创建结果数组
const result = [];

// 使用单次循环遍历
for (const number of numbers) {
  // 跳过奇数
  if (number % 2 !== 0) {
    // 进入下一轮循环
    continue;
  }

  // 将计算结果加入数组
  result.push(number * 10);
}
```

面试时可以说：

> 一般业务代码优先可读性，数据量很大或处于高频执行路径时，再考虑合并遍历，减少中间数组和重复扫描。

这句话会比一味说“for 循环性能更好”专业得多。

------

# 五、filter、find、findIndex 的区别

## 1. filter

返回：

> 所有满足条件的元素组成的新数组。

```js
// 创建用户列表
const users = [
  // 定义第一个用户
  {
    // 定义用户姓名
    name: '刘凤伟',
    // 定义用户年龄
    age: 22,
  },
  // 定义第二个用户
  {
    // 定义用户姓名
    name: '小明',
    // 定义用户年龄
    age: 17,
  },
];

// 筛选成年用户
const adults = users.filter((user) => {
  // 返回当前用户是否成年
  return user.age >= 18;
});

// 输出成年用户数组
console.log(adults);
```

即使一个都找不到，也会返回：

```js
// 创建数字数组
const numbers = [1, 2, 3];

// 筛选大于 10 的数字
const result = numbers.filter((number) => {
  // 返回判断结果
  return number > 10;
});

// 输出空数组
console.log(result);
```

结果是 `[]`。

------

## 2. find

返回：

> 第一个满足条件的元素。

```js
// 创建用户数组
const users = [
  // 定义用户 1
  {
    // 定义用户 ID
    id: 1,
    // 定义用户名
    name: '刘凤伟',
  },
  // 定义用户 2
  {
    // 定义用户 ID
    id: 2,
    // 定义用户名
    name: '小明',
  },
];

// 查找 ID 为 2 的用户
const user = users.find((item) => {
  // 返回 ID 是否匹配
  return item.id === 2;
});

// 输出找到的用户
console.log(user);
```

找不到时返回 `undefined`。

------

## 3. findIndex

返回：

> 第一个满足条件的元素索引。

```js
// 创建用户数组
const users = [
  // 定义用户 1
  {
    // 定义用户 ID
    id: 1,
  },
  // 定义用户 2
  {
    // 定义用户 ID
    id: 2,
  },
];

// 查找 ID 为 2 的用户索引
const index = users.findIndex((user) => {
  // 返回 ID 是否匹配
  return user.id === 2;
});

// 输出索引 1
console.log(index);
```

找不到返回 `-1`。

------

## 核心区别

| 方法        | 返回值         | 是否继续查找   |
| ----------- | -------------- | -------------- |
| `filter`    | 所有匹配项数组 | 会遍历完整数组 |
| `find`      | 第一个匹配元素 | 找到后结束     |
| `findIndex` | 第一个匹配索引 | 找到后结束     |

## ⚠️ 面试陷阱

不要为了查找一个元素使用 `filter()[0]`：

```js
// 不推荐：会扫描整个数组并创建新数组
const user = users.filter((item) => {
  // 判断用户 ID
  return item.id === 2;
})[0];
```

更合适：

```js
// 推荐：找到第一个匹配项后即可结束
const user = users.find((item) => {
  // 判断用户 ID
  return item.id === 2;
});
```

## 🔴 必背答案

> `filter` 用于获取所有满足条件的元素，返回新数组；`find` 只返回第一个满足条件的元素，找不到返回 `undefined`；`findIndex` 返回第一个满足条件的索引，找不到返回 `-1`。如果只需要一个元素，应优先使用 `find`，避免 `filter` 扫描完整数组并额外创建数组。

------

# 六、some 和 every

## 1. some

只要有一个满足条件，就返回 `true`。

```js
// 创建权限数组
const permissions = ['read', 'write'];

// 判断是否具有写权限
const canWrite = permissions.some((permission) => {
  // 判断当前权限是否为 write
  return permission === 'write';
});

// 输出 true
console.log(canWrite);
```

------

## 2. every

所有元素都满足条件，才返回 `true`。

```js
// 创建表单字段数组
const fields = [
  // 定义姓名字段
  {
    // 定义字段值
    value: '刘凤伟',
  },
  // 定义手机号字段
  {
    // 定义字段值
    value: '15118978572',
  },
];

// 判断所有字段是否都有值
const isValid = fields.every((field) => {
  // 将字段值转换成布尔值
  return Boolean(field.value);
});

// 输出 true
console.log(isValid);
```

------

## 3. 两者都支持短路

`some` 找到一个 `true` 后停止。

`every` 找到一个 `false` 后停止。

所以它们比：

```js
// 创建标记变量
let result = false;

// 遍历整个数组
numbers.forEach((number) => {
  // 判断是否满足条件
  if (number > 10) {
    // 修改标记变量
    result = true;
  }
});
```

更符合语义，也可能更早结束遍历。

------

## 4. 空数组陷阱

```js
// 判断空数组中是否存在满足条件的元素
console.log([].some(() => true));

// 判断空数组中的所有元素是否满足条件
console.log([].every(() => false));
```

结果：

```text
false
true
```

为什么 `every([])` 是 `true`？

因为找不到任何一个不满足条件的元素。

这在数学逻辑中叫：

> 空真，vacuous truth。

面试时能讲到这一点，会显得基础很扎实。

## 🔴 必背答案

> `some` 判断是否至少有一个元素满足条件，`every` 判断是否所有元素都满足条件。两者都支持短路执行。空数组调用 `some` 返回 false，而空数组调用 `every` 返回 true，因为空数组中不存在反例。

------

# 七、slice 和 splice

这是最容易混淆的一对。

## 1. slice

`slice(start, end)`：

- 不修改原数组
- 返回截取后的新数组
- 包含 `start`
- 不包含 `end`

```js
// 创建数字数组
const numbers = [10, 20, 30, 40, 50];

// 截取索引 1 到索引 4 之前的元素
const result = numbers.slice(1, 4);

// 输出新数组
console.log(result);

// 输出原数组
console.log(numbers);
```

结果：

```text
[20, 30, 40]
[10, 20, 30, 40, 50]
```

------

## 2. splice

`splice(start, deleteCount, ...items)`：

- 会修改原数组
- 返回被删除的元素数组
- 可以删除、插入、替换

### 删除

```js
// 创建数字数组
const numbers = [10, 20, 30, 40];

// 从索引 1 开始删除 2 个元素
const removed = numbers.splice(1, 2);

// 输出被删除的元素
console.log(removed);

// 输出修改后的原数组
console.log(numbers);
```

### 插入

```js
// 创建数字数组
const numbers = [10, 40];

// 从索引 1 开始，不删除元素，并插入 20 和 30
numbers.splice(1, 0, 20, 30);

// 输出修改后的数组
console.log(numbers);
```

### 替换

```js
// 创建数字数组
const numbers = [10, 20, 30];

// 从索引 1 开始删除 1 个元素，并插入 200
numbers.splice(1, 1, 200);

// 输出修改后的数组
console.log(numbers);
```

## 📌 一句话记忆

> slice 是切片，不伤原数组；splice 是手术，会修改原数组。

## 🔴 必背答案

> `slice` 用于截取数组，左闭右开，不修改原数组；`splice` 用于删除、插入或替换元素，会直接修改原数组，并返回被删除的元素数组。

------

# 八、push、pop、shift、unshift 的复杂度

## 1. push 和 pop

在数组尾部操作。

通常可视为接近：

```text
O(1)
// 创建数组
const queue = [];

// 向尾部添加元素
queue.push('任务一');

// 删除尾部元素
const task = queue.pop();

// 输出被删除元素
console.log(task);
```

------

## 2. shift 和 unshift

在数组头部操作。

通常需要重新调整后面大量元素的索引，因此一般是：

```text
O(n)
// 创建数组
const queue = ['任务一', '任务二'];

// 在头部插入任务
queue.unshift('紧急任务');

// 删除头部任务
const firstTask = queue.shift();

// 输出头部任务
console.log(firstTask);
```

## 🟡 深度回答

> JavaScript 数组更适合尾部增删。频繁从头部进行 `shift`、`unshift`，可能导致大量元素重新编号。如果需要高频队列操作，可以维护一个读取指针，而不是反复 `shift`。

例如：

```js
// 创建任务队列
const queue = ['任务一', '任务二', '任务三'];

// 定义当前读取位置
let headIndex = 0;

// 读取当前队首任务
const firstTask = queue[headIndex];

// 将读取位置后移
headIndex += 1;

// 输出读取到的任务
console.log(firstTask);
```

对于大量任务，这通常比反复 `shift()` 更合适。

------

# 九、sort 排序：面试高危区

## 1. 默认按字符串排序

```js
// 创建数字数组
const numbers = [2, 10, 100, 21];

// 使用默认排序
numbers.sort();

// 输出排序结果
console.log(numbers);
```

结果：

```text
[10, 100, 2, 21]
```

因为默认会近似按字符串进行比较：

```text
"10"
"100"
"2"
"21"
```

------

## 2. 数字升序

```js
// 创建数字数组
const numbers = [2, 10, 100, 21];

// 按数字升序排序
numbers.sort((a, b) => {
  // 负数表示 a 排在 b 前面
  return a - b;
});

// 输出排序结果
console.log(numbers);
```

## 3. 数字降序

```js
// 创建数字数组
const numbers = [2, 10, 100, 21];

// 按数字降序排序
numbers.sort((a, b) => {
  // 负数表示 b 应排在 a 前面
  return b - a;
});

// 输出排序结果
console.log(numbers);
```

------

## 4. comparator 的真正含义

比较函数：

```js
(a, b) => result
```

含义：

- `result < 0`：`a` 排在 `b` 前面
- `result > 0`：`b` 排在 `a` 前面
- `result === 0`：两者顺序视为相同

不要死记 `a - b`，要理解它为什么成立。

------

## 5. 对象排序

```js
// 创建用户数组
const users = [
  // 定义用户 1
  {
    // 定义姓名
    name: '小明',
    // 定义年龄
    age: 20,
  },
  // 定义用户 2
  {
    // 定义姓名
    name: '刘凤伟',
    // 定义年龄
    age: 22,
  },
];

// 按年龄升序排序
users.sort((firstUser, secondUser) => {
  // 比较两名用户的年龄
  return firstUser.age - secondUser.age;
});

// 输出排序结果
console.log(users);
```

------

## 6. sort 会修改原数组

这是 React 和 Vue 状态管理中的重要陷阱。

```js
// 创建原数组
const original = [3, 1, 2];

// 排序并将返回值赋给新变量
const sorted = original.sort((a, b) => {
  // 按升序比较
  return a - b;
});

// 输出原数组
console.log(original);

// 判断两个变量是否指向同一个数组
console.log(original === sorted);
```

结果：

```text
[1, 2, 3]
true
```

在 React 中直接对状态数组排序：

```js
// 不推荐：直接修改状态数组
const sortedUsers = users.sort((a, b) => {
  // 按年龄排序
  return a.age - b.age;
});
```

可能破坏不可变数据原则。

更安全：

```js
// 先复制数组，再进行排序
const sortedUsers = [...users].sort((a, b) => {
  // 按年龄升序排序
  return a.age - b.age;
});
```

或者：

```js
// 使用不修改原数组的 toSorted
const sortedUsers = users.toSorted((a, b) => {
  // 按年龄升序排序
  return a.age - b.age;
});
```

------

## 7. sort 的稳定性

稳定排序是指：

> 当两个元素比较结果相等时，保持它们原来的相对顺序。

```js
// 创建用户数组
const users = [
  // 定义用户 A
  {
    // 定义姓名
    name: 'A',
    // 定义分数
    score: 90,
  },
  // 定义用户 B
  {
    // 定义姓名
    name: 'B',
    // 定义分数
    score: 90,
  },
];

// 按分数排序
users.sort((a, b) => {
  // 分数相等时返回 0
  return a.score - b.score;
});
```

现代 JavaScript 标准要求 `Array.prototype.sort` 是稳定排序。

## 🔴 必背答案

> `sort` 默认按照元素转换后的字符串顺序排序，因此数字数组必须传比较函数。比较函数返回负数时前一个元素排前面，返回正数时后一个元素排前面。`sort` 会原地修改数组，在 Vue、React 状态中使用时应先复制数组，或者使用 `toSorted`。

------

# 十、includes 和 indexOf

## 1. 基础区别

```js
// 创建数字数组
const numbers = [10, 20, 30];

// 判断是否包含 20
console.log(numbers.includes(20));

// 查找 20 的索引
console.log(numbers.indexOf(20));
```

- `includes` 返回布尔值
- `indexOf` 返回索引或 `-1`

------

## 2. NaN 陷阱

```js
// 创建包含 NaN 的数组
const values = [1, NaN, 3];

// 使用 includes 查找 NaN
console.log(values.includes(NaN));

// 使用 indexOf 查找 NaN
console.log(values.indexOf(NaN));
```

结果：

```text
true
-1
```

为什么？

- `indexOf` 的比较方式接近严格相等
- `NaN === NaN` 是 `false`
- `includes` 使用 `SameValueZero` 比较算法
- `SameValueZero` 认为 `NaN` 和 `NaN` 相等

## 🔴 必背答案

> `includes` 返回是否包含目标元素，能够正确识别 `NaN`；`indexOf` 返回元素索引，找不到返回 `-1`，但无法找到 `NaN`。因为 `includes` 使用 SameValueZero 比较，而 `indexOf` 的比较规则接近严格相等。

------

# 十一、reduce：最值得深入掌握的方法

很多人只会用 `reduce` 求和，面试中深度不够。

`reduce` 的本质是：

> 将一个数组逐步归并成一个最终结果。

最终结果可以是：

- 数字
- 字符串
- 数组
- 对象
- Map
- Promise
- 树结构

------

## 1. 基础语法

```js
// 创建数字数组
const numbers = [1, 2, 3, 4];

// 使用 reduce 求和
const total = numbers.reduce(
  (accumulator, currentValue, currentIndex, originalArray) => {
    // 输出当前下标
    console.log(currentIndex);

    // 返回新的累计值
    return accumulator + currentValue;
  },
  // 设置初始累计值为 0
  0,
);

// 输出总和
console.log(total);
```

四个回调参数：

1. `accumulator`：累计值
2. `currentValue`：当前元素
3. `currentIndex`：当前索引
4. `originalArray`：原数组

------

## 2. 有初始值和没有初始值

### 有初始值

```js
// 创建数字数组
const numbers = [10, 20, 30];

// 使用 0 作为初始值
const total = numbers.reduce((accumulator, currentValue) => {
  // 返回累计结果
  return accumulator + currentValue;
}, 0);

// 输出总和
console.log(total);
```

第一次执行：

```text
accumulator = 0
currentValue = 10
```

### 没有初始值

```js
// 创建数字数组
const numbers = [10, 20, 30];

// 不提供初始值
const total = numbers.reduce((accumulator, currentValue) => {
  // 返回累计结果
  return accumulator + currentValue;
});

// 输出总和
console.log(total);
```

第一次执行：

```text
accumulator = 10
currentValue = 20
```

也就是：

- 第一个元素作为初始累计值
- 从第二个元素开始遍历

------

## 3. 空数组不传初始值会报错

```js
// 创建空数组
const numbers = [];

// 空数组未传初始值会抛出 TypeError
const result = numbers.reduce((accumulator, currentValue) => {
  // 返回累计值
  return accumulator + currentValue;
});
```

因此实际开发中，通常建议显式传入初始值。

## 📌 一句话记忆

> reduce 不传初始值时，会拿第一个元素当累计值；空数组没有第一个元素，所以会报错。

------

## 4. reduce 统计次数

```js
// 创建水果数组
const fruits = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple'];

// 统计每种水果出现次数
const countMap = fruits.reduce((result, fruit) => {
  // 读取当前水果已有次数，不存在时使用 0
  const currentCount = result[fruit] ?? 0;

  // 将当前水果次数加一
  result[fruit] = currentCount + 1;

  // 返回累计对象
  return result;
}, {});

// 输出统计结果
console.log(countMap);
```

------

## 5. reduce 数组分组

```js
// 创建订单数组
const orders = [
  // 定义待支付订单
  {
    // 定义订单 ID
    id: 1,
    // 定义订单状态
    status: 'pending',
  },
  // 定义已完成订单
  {
    // 定义订单 ID
    id: 2,
    // 定义订单状态
    status: 'completed',
  },
  // 定义第二个待支付订单
  {
    // 定义订单 ID
    id: 3,
    // 定义订单状态
    status: 'pending',
  },
];

// 根据订单状态分组
const groupedOrders = orders.reduce((result, order) => {
  // 当前状态不存在时创建空数组
  if (!result[order.status]) {
    // 创建当前状态对应的数组
    result[order.status] = [];
  }

  // 将当前订单加入对应分组
  result[order.status].push(order);

  // 返回累计对象
  return result;
}, {});

// 输出分组结果
console.log(groupedOrders);
```

------

## 6. reduce 实现 Promise 串行

```js
// 创建异步任务数组
const tasks = [
  // 定义第一个异步任务
  () => Promise.resolve('任务一完成'),
  // 定义第二个异步任务
  () => Promise.resolve('任务二完成'),
  // 定义第三个异步任务
  () => Promise.resolve('任务三完成'),
];

// 使用 reduce 串行执行任务
const resultPromise = tasks.reduce((previousPromise, currentTask) => {
  // 等待上一个任务完成
  return previousPromise.then(async (results) => {
    // 执行当前任务
    const currentResult = await currentTask();

    // 将当前结果加入结果数组
    results.push(currentResult);

    // 返回结果数组给下一轮
    return results;
  });
}, Promise.resolve([]));

// 等待所有任务完成
resultPromise.then((results) => {
  // 输出所有任务结果
  console.log(results);
});
```

这里就体现了：

> `reduce` 的累计值不一定是数字，也可以是 Promise。

## 🔴 reduce 标准答案

> `reduce` 会将数组逐步归并成一个最终结果。回调函数接收累计值、当前元素、当前索引和原数组。如果传入初始值，第一次累计值就是初始值；如果没有传，数组第一个元素会作为初始累计值，并从第二个元素开始遍历。空数组在没有初始值时会抛出 TypeError。除了求和，reduce 还可以用于分组、计数、对象转换和 Promise 串行执行。

------

# 十二、flat 和 flatMap

## 1. flat

用于数组扁平化。

```js
// 创建嵌套数组
const nestedArray = [1, [2, [3, [4]]]];

// 扁平一层
const oneLevel = nestedArray.flat(1);

// 扁平两层
const twoLevels = nestedArray.flat(2);

// 完全扁平化
const allLevels = nestedArray.flat(Infinity);

// 输出结果
console.log(oneLevel);

// 输出结果
console.log(twoLevels);

// 输出结果
console.log(allLevels);
```

------

## 2. flatMap

相当于：

```text
map + flat(1)
```

只扁平一层。

```js
// 创建句子数组
const sentences = ['Vue React', 'JavaScript TypeScript'];

// 将每句话拆成单词，并扁平一层
const words = sentences.flatMap((sentence) => {
  // 使用空格切分字符串
  return sentence.split(' ');
});

// 输出单词数组
console.log(words);
```

等价于：

```js
// 创建句子数组
const sentences = ['Vue React', 'JavaScript TypeScript'];

// 先执行 map，再执行 flat
const words = sentences
  // 将每句话切分成单词数组
  .map((sentence) => {
    // 返回切分后的数组
    return sentence.split(' ');
  })
  // 将二维数组扁平一层
  .flat(1);

// 输出结果
console.log(words);
```

## 🔴 必背答案

> `flat` 用于按照指定深度扁平化数组，默认深度为 1；`flatMap` 相当于先执行 `map` 再执行 `flat(1)`，它只会扁平一层，适合一对多映射。

------

# 十三、Object 常用方法

数组和对象经常要互相转换。

## 1. Object.keys

返回对象自身可枚举的字符串键。

```js
// 创建用户对象
const user = {
  // 定义姓名
  name: '刘凤伟',
  // 定义年龄
  age: 22,
};

// 获取所有字符串键
const keys = Object.keys(user);

// 输出键数组
console.log(keys);
```

------

## 2. Object.values

```js
// 创建用户对象
const user = {
  // 定义姓名
  name: '刘凤伟',
  // 定义年龄
  age: 22,
};

// 获取所有属性值
const values = Object.values(user);

// 输出值数组
console.log(values);
```

------

## 3. Object.entries

将对象转换成键值对数组。

```js
// 创建用户对象
const user = {
  // 定义姓名
  name: '刘凤伟',
  // 定义年龄
  age: 22,
};

// 将对象转换成键值对数组
const entries = Object.entries(user);

// 输出键值对数组
console.log(entries);
```

结果：

```js
[
  ['name', '刘凤伟'],
  ['age', 22],
]
```

------

## 4. Object.fromEntries

将键值对数组转换成对象。

```js
// 创建键值对数组
const entries = [
  // 定义姓名键值对
  ['name', '刘凤伟'],
  // 定义年龄键值对
  ['age', 22],
];

// 将键值对数组转换成对象
const user = Object.fromEntries(entries);

// 输出对象
console.log(user);
```

------

## 5. 实战：过滤对象字段

```js
// 创建请求参数对象
const params = {
  // 定义关键词
  keyword: 'Vue',
  // 定义空状态
  status: '',
  // 定义页码
  pageIndex: 1,
  // 定义空值
  warehouseId: null,
};

// 将对象转换成键值对数组
const entries = Object.entries(params);

// 过滤掉空字符串、null 和 undefined
const validEntries = entries.filter((entry) => {
  // 解构当前键值对
  const [, value] = entry;

  // 返回当前值是否有效
  return value !== '' && value !== null && value !== undefined;
});

// 将有效键值对重新转换成对象
const validParams = Object.fromEntries(validEntries);

// 输出清理后的请求参数
console.log(validParams);
```

链式写法：

```js
// 创建请求参数
const params = {
  // 定义关键词
  keyword: 'Vue',
  // 定义空状态
  status: '',
  // 定义页码
  pageIndex: 1,
  // 定义空仓库
  warehouseId: null,
};

// 清理无效参数
const validParams = Object.fromEntries(
  // 将对象转换成键值对数组
  Object.entries(params).filter(([, value]) => {
    // 保留非空值
    return value !== '' && value !== null && value !== undefined;
  }),
);

// 输出结果
console.log(validParams);
```

------

# 十四、in、Object.hasOwn 和 for...in

## 1. in

会检查：

- 对象自身属性
- 原型链上的属性

```js
// 创建父对象
const parent = {
  // 定义父对象属性
  role: 'admin',
};

// 创建继承父对象的子对象
const child = Object.create(parent);

// 添加子对象自身属性
child.name = '刘凤伟';

// 检查自身属性
console.log('name' in child);

// 检查继承属性
console.log('role' in child);
```

两个都是 `true`。

------

## 2. Object.hasOwn

只检查对象自身属性。

```js
// 创建父对象
const parent = {
  // 定义父对象属性
  role: 'admin',
};

// 创建子对象
const child = Object.create(parent);

// 添加自身属性
child.name = '刘凤伟';

// 检查自身属性
console.log(Object.hasOwn(child, 'name'));

// 检查继承属性
console.log(Object.hasOwn(child, 'role'));
```

结果：

```text
true
false
```

------

## 3. for...in

会遍历：

> 可枚举的字符串属性，包括继承来的可枚举属性。

```js
// 创建父对象
const parent = {
  // 定义父对象属性
  role: 'admin',
};

// 创建子对象
const child = Object.create(parent);

// 添加子对象自身属性
child.name = '刘凤伟';

// 使用 for...in 遍历
for (const key in child) {
  // 输出遍历到的键
  console.log(key);
}
```

可能输出：

```text
name
role
```

如果只想处理自身属性：

```js
// 遍历对象属性
for (const key in child) {
  // 跳过继承属性
  if (!Object.hasOwn(child, key)) {
    // 进入下一轮遍历
    continue;
  }

  // 输出自身属性
  console.log(key);
}
```

## 🔴 必背答案

> `in` 会同时检查对象自身和原型链属性，`Object.hasOwn` 只检查对象自身属性。`for...in` 会遍历自身和继承的可枚举字符串属性，所以处理普通对象时通常需要配合 `Object.hasOwn`，或者直接使用 `Object.keys`、`Object.entries`。

------

# 十五、Object.keys 和 Reflect.ownKeys 的深度区别

```js
// 创建 Symbol 类型的键
const symbolKey = Symbol('secret');

// 创建普通对象
const user = {
  // 定义普通字符串键
  name: '刘凤伟',
  // 定义 Symbol 键
  [symbolKey]: '隐藏信息',
};

// 定义不可枚举属性
Object.defineProperty(user, 'age', {
  // 设置属性值
  value: 22,
  // 设置为不可枚举
  enumerable: false,
});

// 获取自身可枚举字符串键
console.log(Object.keys(user));

// 获取所有自身键
console.log(Reflect.ownKeys(user));
```

区别：

| 方法              | 字符串键 | Symbol 键 | 不可枚举属性 | 继承属性 |
| ----------------- | -------- | --------- | ------------ | -------- |
| `Object.keys`     | 是       | 否        | 否           | 否       |
| `Reflect.ownKeys` | 是       | 是        | 是           | 否       |
| `for...in`        | 是       | 否        | 否           | 是       |

深拷贝中使用 `Reflect.ownKeys`，就是为了尽量覆盖：

- 字符串属性
- Symbol 属性
- 不可枚举属性

但要真正保留属性描述符，还需要配合：

- `Object.getOwnPropertyDescriptor`
- `Object.defineProperty`

这属于更深入的深拷贝实现。

------

# 十六、Map 和 Object 的区别

这是你简历必须重点防守的内容。

## 1. Map 的键可以是任意类型

```js
// 创建对象键
const userObject = {
  // 定义对象键内容
  id: 1,
};

// 创建 Map
const cache = new Map();

// 使用对象作为 Map 的键
cache.set(userObject, '用户数据');

// 通过同一个对象引用读取
console.log(cache.get(userObject));
```

普通对象的键主要是：

- 字符串
- Symbol

```js
// 创建普通对象
const object = {};

// 创建一个对象键
const key = {
  // 定义对象内容
  id: 1,
};

// 使用对象作为普通对象的键
object[key] = '用户数据';

// 输出真实键名
console.log(Object.keys(object));
```

对象键会被转换成类似：

```text
[object Object]
```

------

## 2. Map 更适合频繁增删查

Map 提供：

- `set`
- `get`
- `has`
- `delete`
- `clear`
- `size`

```js
// 创建 Map
const userMap = new Map();

// 添加用户
userMap.set(1, {
  // 定义用户姓名
  name: '刘凤伟',
});

// 判断用户是否存在
console.log(userMap.has(1));

// 获取用户
console.log(userMap.get(1));

// 获取 Map 大小
console.log(userMap.size);

// 删除用户
userMap.delete(1);
```

------

## 3. Map 保持插入顺序

Map 遍历时按照插入顺序。

```js
// 创建 Map
const map = new Map();

// 插入第一个键值对
map.set('first', 1);

// 插入第二个键值对
map.set('second', 2);

// 遍历 Map
for (const [key, value] of map) {
  // 输出键和值
  console.log(key, value);
}
```

------

## 4. Map 和 Object 对比

| 对比项      | Map                      | Object                     |
| ----------- | ------------------------ | -------------------------- |
| 键类型      | 任意类型                 | 字符串、Symbol             |
| 获取数量    | `size`                   | `Object.keys().length`     |
| 遍历顺序    | 插入顺序                 | 有明确但较复杂的键顺序规则 |
| 增删查      | API 清晰                 | 使用属性操作               |
| 原型属性    | 没有业务原型键冲突       | 可能涉及原型链             |
| JSON 序列化 | 不直接支持               | 直接支持                   |
| 适用场景    | 动态键值映射、缓存、索引 | 固定结构数据、DTO、配置    |

## 🔴 标准答案

> Object 更适合描述固定结构的数据，例如用户信息、接口参数和配置对象；Map 更适合动态键值映射、频繁增删查、缓存和建立索引。Map 的键可以是任意类型，提供 size、set、get、has、delete 等专门 API，并保持插入顺序。但 Map 不能直接通过 JSON.stringify 序列化。

------

# 十七、Map 为什么查询接近 O(1)

假设有药品数组：

```js
// 创建药品数组
const medicines = [
  // 定义药品 1
  {
    // 定义药品 ID
    id: 'm1',
    // 定义药品名称
    name: '阿莫西林',
  },
  // 定义药品 2
  {
    // 定义药品 ID
    id: 'm2',
    // 定义药品名称
    name: '板蓝根',
  },
];
```

每次通过数组查找：

```js
// 通过 find 查找药品
const medicine = medicines.find((item) => {
  // 判断药品 ID
  return item.id === 'm2';
});
```

最坏情况下，需要遍历完整数组：

```text
O(n)
```

如果有 `n` 条业务数据，每条都调用一次 `find`：

```text
O(n × m)
```

当两边数据规模相近时，可以近似看成：

```text
O(n²)
```

------

## 1. 先建立 Map 索引

```js
// 根据药品 ID 建立 Map 索引
const medicineMap = new Map(
  // 将每个药品转换成 ID 和药品对象组成的键值对
  medicines.map((medicine) => {
    // 返回 Map 所需的键值对
    return [medicine.id, medicine];
  }),
);

// 直接通过 ID 获取药品
const medicine = medicineMap.get('m2');

// 输出药品
console.log(medicine);
```

建立索引：

```text
O(n)
```

之后每次查询工程上通常接近：

```text
O(1)
```

整体从可能的：

```text
O(n²)
```

优化为：

```text
O(n)
```

------

## 2. 更完整的项目例子

```js
// 创建药品分类数组
const categories = [
  // 定义分类 1
  {
    // 定义分类 ID
    id: 'c1',
    // 定义分类名称
    name: '抗生素',
  },
  // 定义分类 2
  {
    // 定义分类 ID
    id: 'c2',
    // 定义分类名称
    name: '中成药',
  },
];

// 创建药品数组
const medicines = [
  // 定义药品 1
  {
    // 定义药品 ID
    id: 'm1',
    // 定义药品名称
    name: '阿莫西林',
    // 定义分类 ID
    categoryId: 'c1',
  },
  // 定义药品 2
  {
    // 定义药品 ID
    id: 'm2',
    // 定义药品名称
    name: '板蓝根',
    // 定义分类 ID
    categoryId: 'c2',
  },
];

// 创建分类 Map
const categoryMap = new Map(
  // 将分类数组转换成键值对
  categories.map((category) => {
    // 使用分类 ID 作为键
    return [category.id, category];
  }),
);

// 为每个药品补充分类名称
const result = medicines.map((medicine) => {
  // 根据分类 ID 获取分类
  const category = categoryMap.get(medicine.categoryId);

  // 返回补充字段后的新对象
  return {
    // 复制药品原有字段
    ...medicine,
    // 添加分类名称
    categoryName: category?.name ?? '未知分类',
  };
});

// 输出结果
console.log(result);
```

------

## 🟢 结合你的简历回答

> 在生猪健康管理系统中，页面需要并行获取药品、分类和病因数据，然后进行前端关联展示。如果每渲染一条药品数据，都使用 `find` 到分类数组里查找分类，数据量增加后会形成重复的线性扫描，整体复杂度可能接近 `O(n²)`。我先使用分类 ID 建立 `Map` 索引，建表是 `O(n)`，后续通过 `Map.get` 查询工程上通常接近 `O(1)`，整体关联过程降到接近 `O(n)`。这是典型的空间换时间，用少量额外内存换取更快查询。

## 🟡 让面试官眼前一亮的补充

不要说：

> Map 底层一定是哈希表，所以严格 O(1)。

更严谨地说：

> 工程分析中通常将 `Map.get`、`Map.set` 视为平均接近 O(1)，但规范并不要求所有 JavaScript 引擎必须使用完全相同的底层结构，也不代表最坏情况严格 O(1)。在面试复杂度分析中，用平均 O(1) 表达即可，但要知道这是工程近似。

这句话会显得你不是机械背题。

------

# 十八、Set 与数组去重

Set 的特点：

> 集合中的值不能重复。

```js
// 创建包含重复数字的数组
const numbers = [1, 2, 2, 3, 3, 3];

// 使用 Set 去重
const uniqueSet = new Set(numbers);

// 将 Set 转换回数组
const uniqueNumbers = [...uniqueSet];

// 输出去重结果
console.log(uniqueNumbers);
```

简写：

```js
// 创建重复数组
const numbers = [1, 2, 2, 3, 3];

// 使用 Set 和展开运算符去重
const uniqueNumbers = [...new Set(numbers)];

// 输出结果
console.log(uniqueNumbers);
```

## ⚠️ 对象去重陷阱

```js
// 创建两个内容相同但引用不同的对象
const users = [
  // 定义第一个对象
  {
    // 定义用户 ID
    id: 1,
  },
  // 定义第二个对象
  {
    // 定义相同的用户 ID
    id: 1,
  },
];

// 使用 Set 去重
const result = [...new Set(users)];

// 输出数组长度
console.log(result.length);
```

结果仍然是 `2`。

因为对象比较的是引用地址，而不是内容。

按 ID 去重需要 `Map`：

```js
// 创建用户数组
const users = [
  // 定义第一个用户
  {
    // 定义用户 ID
    id: 1,
    // 定义用户名
    name: '旧数据',
  },
  // 定义第二个用户
  {
    // 定义相同 ID
    id: 1,
    // 定义用户名
    name: '新数据',
  },
  // 定义第三个用户
  {
    // 定义用户 ID
    id: 2,
    // 定义用户名
    name: '小明',
  },
];

// 将用户转换为以 ID 为键的 Map
const userMap = new Map(
  // 将每个用户转换成键值对
  users.map((user) => {
    // 使用用户 ID 作为键
    return [user.id, user];
  }),
);

// 获取 Map 中的所有用户
const uniqueUsers = [...userMap.values()];

// 输出去重结果
console.log(uniqueUsers);
```

相同键后写入的值会覆盖前面的值，因此这里保留最后一条。

------

# 十九、手写 Array.prototype.map

⚠️ 下面是面试练习，业务代码中不要随意修改原生原型。

```js
// 给数组原型添加自定义 map 方法
Array.prototype.myMap = function (callback, thisArg) {
  // 判断调用者是否为 null 或 undefined
  if (this == null) {
    // 抛出类型错误
    throw new TypeError('Array.prototype.myMap called on null or undefined');
  }

  // 判断回调函数是否合法
  if (typeof callback !== 'function') {
    // 抛出类型错误
    throw new TypeError('callback must be a function');
  }

  // 将调用者转换成对象
  const source = Object(this);

  // 将 length 转换成安全的非负整数
  const length = source.length >>> 0;

  // 创建与原数组等长的结果数组
  const result = new Array(length);

  // 从索引 0 开始遍历
  for (let index = 0; index < length; index += 1) {
    // 判断当前索引是否真实存在
    if (!(index in source)) {
      // 跳过稀疏数组中的空槽
      continue;
    }

    // 调用回调函数并保存返回值
    result[index] = callback.call(
      // 设置回调中的 this
      thisArg,
      // 传入当前元素
      source[index],
      // 传入当前索引
      index,
      // 传入原数组对象
      source,
    );
  }

  // 返回映射后的新数组
  return result;
};
```

## 核心思路

1. 校验调用者
2. 校验回调函数
3. 创建等长新数组
4. 遍历已有索引
5. 调用回调并保存返回值
6. 返回新数组

## 深度点

`map` 对稀疏数组通常会跳过空槽，而不是把空槽当作显式 `undefined` 调用回调。

------

# 二十、手写 filter

```js
// 给数组原型添加自定义 filter 方法
Array.prototype.myFilter = function (callback, thisArg) {
  // 判断调用者是否为空
  if (this == null) {
    // 抛出类型错误
    throw new TypeError('Array.prototype.myFilter called on null or undefined');
  }

  // 判断回调是否为函数
  if (typeof callback !== 'function') {
    // 抛出类型错误
    throw new TypeError('callback must be a function');
  }

  // 将调用者转换成对象
  const source = Object(this);

  // 获取数组长度
  const length = source.length >>> 0;

  // 创建结果数组
  const result = [];

  // 遍历原数组
  for (let index = 0; index < length; index += 1) {
    // 跳过不存在的索引
    if (!(index in source)) {
      // 继续下一轮
      continue;
    }

    // 获取当前元素
    const currentValue = source[index];

    // 执行筛选条件
    const shouldKeep = callback.call(
      // 设置回调中的 this
      thisArg,
      // 传入当前值
      currentValue,
      // 传入当前索引
      index,
      // 传入原数组
      source,
    );

    // 判断是否保留当前元素
    if (shouldKeep) {
      // 将当前元素加入结果数组
      result.push(currentValue);
    }
  }

  // 返回筛选后的数组
  return result;
};
```

注意：

> `filter` 返回的是原元素引用，并不会自动深拷贝对象。

------

# 二十一、手写 reduce

```js
// 给数组原型添加自定义 reduce 方法
Array.prototype.myReduce = function (callback, initialValue) {
  // 判断调用者是否为空
  if (this == null) {
    // 抛出类型错误
    throw new TypeError('Array.prototype.myReduce called on null or undefined');
  }

  // 判断回调是否为函数
  if (typeof callback !== 'function') {
    // 抛出类型错误
    throw new TypeError('callback must be a function');
  }

  // 将调用者转换成对象
  const source = Object(this);

  // 获取数组长度
  const length = source.length >>> 0;

  // 定义当前遍历索引
  let index = 0;

  // 定义累计值
  let accumulator;

  // 判断调用时是否传入了初始值
  if (arguments.length >= 2) {
    // 使用传入的初始值
    accumulator = initialValue;
  } else {
    // 跳过数组开头的空槽
    while (index < length && !(index in source)) {
      // 索引向后移动
      index += 1;
    }

    // 判断是否找到了有效元素
    if (index >= length) {
      // 空数组且没有初始值时抛出错误
      throw new TypeError('Reduce of empty array with no initial value');
    }

    // 使用第一个有效元素作为累计值
    accumulator = source[index];

    // 从下一个索引继续遍历
    index += 1;
  }

  // 遍历剩余元素
  for (; index < length; index += 1) {
    // 跳过不存在的索引
    if (!(index in source)) {
      // 继续下一轮
      continue;
    }

    // 执行回调并更新累计值
    accumulator = callback(
      // 传入上一次累计结果
      accumulator,
      // 传入当前元素
      source[index],
      // 传入当前索引
      index,
      // 传入原数组
      source,
    );
  }

  // 返回最终累计结果
  return accumulator;
};
```

## 面试最容易漏掉的地方

- 空数组没有初始值要报错
- 要区分“没传初始值”和“传了 undefined”
- 稀疏数组需要跳过空槽
- 每次要使用回调返回值更新累计值

这就是为什么判断初始值不能只写：

```js
// 错误思路：无法区分没传和主动传 undefined
if (initialValue !== undefined) {
  // 使用初始值
}
```

而应该判断：

```js
// 判断参数数量是否大于等于 2
if (arguments.length >= 2) {
  // 说明调用者确实传入了第二个参数
}
```

------

# 二十二、手写数组扁平化

## 1. 递归版

```js
// 定义数组扁平化函数
function flattenArray(array) {
  // 创建结果数组
  const result = [];

  // 遍历数组中的每个元素
  for (const item of array) {
    // 判断当前元素是否为数组
    if (Array.isArray(item)) {
      // 递归扁平化子数组
      const flattenedItems = flattenArray(item);

      // 将子数组结果加入总结果
      result.push(...flattenedItems);
    } else {
      // 将普通元素直接加入结果
      result.push(item);
    }
  }

  // 返回扁平化结果
  return result;
}
```

------

## 2. reduce 版

```js
// 定义数组扁平化函数
function flattenArray(array) {
  // 使用 reduce 累积结果
  return array.reduce((result, item) => {
    // 判断当前元素是否为数组
    if (Array.isArray(item)) {
      // 递归处理子数组
      const flattenedItems = flattenArray(item);

      // 将子数组结果加入累计数组
      result.push(...flattenedItems);
    } else {
      // 将普通元素加入累计数组
      result.push(item);
    }

    // 返回累计数组
    return result;
  }, []);
}
```

## 复杂度

如果一共存在 `n` 个元素：

- 时间复杂度通常是 `O(n)`
- 空间复杂度通常是 `O(n)`
- 深度过大时，递归可能造成调用栈溢出

------

# 二十三、手写按字段去重

```js
// 定义根据指定字段去重的函数
function uniqueBy(array, key) {
  // 创建 Map 保存去重结果
  const resultMap = new Map();

  // 遍历原数组
  for (const item of array) {
    // 获取当前元素的字段值
    const fieldValue = item[key];

    // 如果尚未保存当前字段值
    if (!resultMap.has(fieldValue)) {
      // 保存当前元素
      resultMap.set(fieldValue, item);
    }
  }

  // 将 Map 中的值转换为数组
  return [...resultMap.values()];
}
```

这个版本保留第一条数据。

如果直接 `set`，则保留最后一条：

```js
// 定义保留最后一条数据的去重函数
function uniqueByLast(array, key) {
  // 创建 Map
  const resultMap = new Map();

  // 遍历所有元素
  for (const item of array) {
    // 使用指定字段作为键，后面的值会覆盖前面的值
    resultMap.set(item[key], item);
  }

  // 返回去重后的数组
  return [...resultMap.values()];
}
```

面试时要先问清楚：

> 相同 ID 时，是保留第一条还是最后一条？

这是业务意识。

------

# 二十四、手写数组分组

```js
// 定义根据指定字段分组的函数
function groupBy(array, key) {
  // 创建分组结果对象
  const result = {};

  // 遍历数组
  for (const item of array) {
    // 获取当前元素对应的分组值
    const groupKey = item[key];

    // 判断当前分组是否存在
    if (!Object.hasOwn(result, groupKey)) {
      // 创建当前分组数组
      result[groupKey] = [];
    }

    // 将当前元素加入对应分组
    result[groupKey].push(item);
  }

  // 返回分组结果
  return result;
}
```

支持函数形式：

```js
// 定义更灵活的分组函数
function groupBy(array, getGroupKey) {
  // 创建 Map 保存分组
  const result = new Map();

  // 遍历数组
  for (const item of array) {
    // 计算当前元素的分组键
    const groupKey = getGroupKey(item);

    // 判断分组是否已经存在
    if (!result.has(groupKey)) {
      // 创建新的分组数组
      result.set(groupKey, []);
    }

    // 获取分组并加入当前元素
    result.get(groupKey).push(item);
  }

  // 返回 Map 分组结果
  return result;
}
```

使用：

```js
// 创建订单数组
const orders = [
  // 定义订单 1
  {
    // 定义订单状态
    status: 'pending',
    // 定义订单 ID
    id: 1,
  },
  // 定义订单 2
  {
    // 定义订单状态
    status: 'completed',
    // 定义订单 ID
    id: 2,
  },
];

// 根据订单状态分组
const groupedOrders = groupBy(orders, (order) => {
  // 返回分组键
  return order.status;
});

// 输出分组结果
console.log(groupedOrders);
```

------

# 二十五、数组转树：高频手撕题

原始数据：

```js
// 创建扁平节点数组
const nodes = [
  // 定义根节点
  {
    // 定义节点 ID
    id: 1,
    // 定义父节点 ID
    parentId: null,
    // 定义节点名称
    name: '前端',
  },
  // 定义子节点
  {
    // 定义节点 ID
    id: 2,
    // 定义父节点 ID
    parentId: 1,
    // 定义节点名称
    name: 'Vue',
  },
  // 定义子节点
  {
    // 定义节点 ID
    id: 3,
    // 定义父节点 ID
    parentId: 1,
    // 定义节点名称
    name: 'React',
  },
];
```

------

## 1. 不推荐的递归查找版

每个节点都可能重新扫描数组，复杂度容易到 `O(n²)`。

更好的方式是使用 `Map`。

------

## 2. Map 优化版

```js
// 定义数组转树函数
function arrayToTree(array) {
  // 创建节点索引 Map
  const nodeMap = new Map();

  // 创建根节点数组
  const roots = [];

  // 第一轮：创建所有节点副本
  for (const item of array) {
    // 创建带 children 的新节点
    const node = {
      // 复制原节点属性
      ...item,
      // 初始化子节点数组
      children: [],
    };

    // 使用节点 ID 建立索引
    nodeMap.set(node.id, node);
  }

  // 第二轮：建立父子关系
  for (const item of array) {
    // 获取当前节点
    const currentNode = nodeMap.get(item.id);

    // 判断是否为根节点
    if (item.parentId === null || item.parentId === undefined) {
      // 将节点加入根节点数组
      roots.push(currentNode);

      // 跳过后续逻辑
      continue;
    }

    // 获取父节点
    const parentNode = nodeMap.get(item.parentId);

    // 判断父节点是否存在
    if (parentNode) {
      // 将当前节点加入父节点 children
      parentNode.children.push(currentNode);
    } else {
      // 父节点不存在时按异常根节点处理
      roots.push(currentNode);
    }
  }

  // 返回树结构
  return roots;
}
```

## 复杂度分析

第一轮遍历：

```text
O(n)
```

第二轮遍历：

```text
O(n)
```

`Map.get` 平均接近：

```text
O(1)
```

总复杂度：

```text
O(n)
```

额外空间：

```text
O(n)
```

## 🟡 面试加分点

面试官可能继续问：

> 如果子节点出现在父节点前面，会不会有问题？

不会。

因为第一轮已经把所有节点放进了 `Map`，第二轮才建立关系，所以不依赖原数组顺序。

还可能问：

> 如果数据存在环怎么办？

例如：

```text
A 的 parentId 是 B
B 的 parentId 是 A
```

普通数组转树代码无法自动识别业务环，需要：

- 建立访问状态
- 使用 DFS 检测环
- 或在后端、数据库层保证父子关系合法

------

# 二十六、Vue 和 React 中为什么强调不可变数据

## 1. React

React 状态更新通常依赖引用变化。

错误做法：

```js
// 直接向原状态数组添加元素
users.push(newUser);

// 仍然传入原数组引用
setUsers(users);
```

更推荐：

```js
// 创建包含新用户的新数组
setUsers((previousUsers) => {
  // 返回一个全新的数组引用
  return [...previousUsers, newUser];
});
```

排序：

```js
// 创建排序后的新数组
setUsers((previousUsers) => {
  // 复制数组后进行排序
  return [...previousUsers].sort((a, b) => {
    // 按年龄升序排序
    return a.age - b.age;
  });
});
```

------

## 2. Vue

Vue3 可以检测数组原地修改，但不代表所有场景都应该随意修改。

不可变操作的好处包括：

- 更容易追踪变化
- 更适合撤销和时间旅行
- 避免意外共享引用
- computed 和组件数据流更容易理解
- 更利于比较新旧数据

```js
// 创建响应式用户数组
const users = ref([]);

// 使用新数组替换旧数组
users.value = [
  // 展开旧用户
  ...users.value,
  // 添加新用户
  newUser,
];
```

## 🔴 面试回答

> React 更强调不可变更新，因为状态更新和 memo 优化经常依赖引用变化。Vue3 能够通过 Proxy 监听数组的 push、splice 等原地操作，但在复杂状态、跨组件共享和需要撤销记录的场景中，不可变更新仍然更容易维护。是否原地修改不能只看框架能不能监听，还要考虑数据流是否清晰和引用是否被共享。

------

# 二十七、本章面试必背答案

## 1. map 和 forEach 的区别

> `map` 根据每个元素的返回值生成一个等长新数组，适合数据转换；`forEach` 主要执行副作用，返回值为 undefined。两者都不能通过 break 或回调中的 return 提前结束整个遍历。

## 2. filter 和 find 的区别

> `filter` 返回所有满足条件的元素数组，会继续遍历；`find` 返回第一个满足条件的元素，找到后即可结束，找不到返回 undefined。如果只需要一个元素，应优先使用 find。

## 3. some 和 every 的区别

> `some` 判断是否至少一个元素满足条件，`every` 判断是否所有元素都满足条件，两者都支持短路。空数组调用 some 返回 false，调用 every 返回 true。

## 4. slice 和 splice 的区别

> `slice` 截取数组，左闭右开，不修改原数组；`splice` 可以删除、插入和替换元素，会修改原数组，并返回被删除的元素数组。

## 5. sort 有什么问题？

> `sort` 默认按字符串顺序排序，数字排序必须传比较函数；同时它会原地修改数组，在 React 或共享状态中可能产生副作用，应该先复制数组或使用 toSorted。

## 6. includes 和 indexOf 的区别

> includes 返回布尔值，并能识别 NaN；indexOf 返回索引，找不到返回 -1，但无法找到 NaN，因为两者使用的相等比较规则不同。

## 7. reduce 的执行过程

> reduce 通过累计值逐步归并数组。传入初始值时从第一个元素开始；未传初始值时，第一个有效元素作为累计值，从下一个元素开始。空数组未传初始值会报错。

## 8. Map 和 Object 的区别

> Object 适合固定结构数据，Map 适合动态键值映射和频繁增删查。Map 的键可以是任意类型，提供 size、set、get、has 等 API，但不能直接 JSON 序列化。

## 9. 为什么 Map 查询更快？

> 数组 find 需要线性扫描，通常是 O(n)。建立 Map 索引需要一次 O(n) 遍历，之后通过 key 查询平均接近 O(1)，适合多次重复查找，是典型的空间换时间。

------

# 二十八、本章简历项目拷打

## 面试官：你为什么使用 Map，而不是每次用 find？

推荐回答：

> 当时页面需要将药品、分类和病因等多组接口数据进行关联。直接在 map 渲染中反复使用 find，会让每条业务数据都扫描一次关联数组，数据规模接近时整体可能达到 O(n²)。我先通过 ID 构建 Map 索引，这一步是 O(n)，后续每次查询平均接近 O(1)，整体关联复杂度降到接近 O(n)。代价是增加一个 O(n) 的索引空间，但对高频查询场景比较划算。

## 面试官：为什么不让后端直接关联好？

推荐回答：

> 如果接口属于同一业务聚合，后端直接返回完整 DTO 通常更合理，可以减少前端关联成本。但当时这些数据来源于不同接口，而且分类和病因属于可复用的基础数据，前端需要并行请求后进行组合。我会根据数据量、接口复用性、网络开销和团队职责选择。如果关联逻辑长期稳定且多个端都需要，后续应该推动后端提供聚合接口或 BFF。

这句“推动聚合接口或 BFF”会让回答更有架构意识。

## 面试官：Map 一定是 O(1) 吗？

推荐回答：

> 工程复杂度分析中通常将 Map 的 get 和 set 视为平均接近 O(1)，但不应该说最坏情况严格 O(1)。JavaScript 规范并不要求所有引擎采用完全相同的实现，实际性能还会受到键类型、数据规模和引擎优化影响。

## 面试官：为什么不用 reduce 一次完成？

推荐回答：

> reduce 可以完成，但我会优先考虑语义和可读性。建立索引时 `new Map(array.map(...))` 或普通 for 循环更直观；复杂分组或累计转换时 reduce 更合适。不是能用 reduce 就必须用 reduce，过度嵌套反而会降低可维护性。

------

# 二十九、本章自测题

## 口述题

1. JavaScript 数组为什么说是特殊对象？
2. 空槽和 `undefined` 有什么区别？
3. 哪些数组方法会修改原数组？
4. `map` 和 `forEach` 有什么区别？
5. `forEach` 为什么不能通过 `return` 结束外层函数？
6. `filter` 和 `find` 如何选择？
7. `some` 和 `every` 是否支持短路？
8. 为什么空数组的 `every` 返回 `true`？
9. `slice` 和 `splice` 有什么区别？
10. `shift` 为什么通常比 `pop` 慢？
11. `sort` 默认如何排序？
12. 为什么 React 状态数组不能直接 `sort`？
13. `includes` 为什么能找到 `NaN`？
14. `reduce` 不传初始值会发生什么？
15. 空数组调用 `reduce` 为什么可能报错？
16. `Object.keys` 和 `Reflect.ownKeys` 有什么区别？
17. `in` 和 `Object.hasOwn` 有什么区别？
18. `Map` 和 `Object` 有什么区别？
19. Set 为什么不能直接对内容相同的对象去重？
20. 数组转树如何从 `O(n²)` 优化成 `O(n)`？

## 手写题

必须能够脱离答案完成：

1. `myMap`
2. `myFilter`
3. `myReduce`
4. 数组完全扁平化
5. 按字段去重
6. 按字段分组
7. 数组转树
8. 使用 Map 完成两组数据关联

------

# 三十、本章最终背诵总结

把下面这段背下来：

> JavaScript 数组是带有数字索引、length 和数组方法的特殊对象。数组方法可以分为原地修改和返回新结果两类，其中 push、pop、shift、unshift、splice、sort、reverse 会修改原数组，而 map、filter、slice、concat、flat 和 toSorted 通常返回新数组。
>
> map 用于数据映射，forEach 用于副作用；filter 返回所有匹配项，find 返回第一个匹配项；some 判断是否至少一个满足条件，every 判断是否全部满足条件，并且两者都支持短路。slice 不修改原数组，splice 会修改原数组。
>
> reduce 的本质是将数组逐步归并成任意结果，可以用于求和、分组、计数、对象转换和 Promise 串行。没有初始值时，第一个有效元素会作为累计值，空数组没有初始值会报错。
>
> 数组 find 通常需要 O(n) 线性扫描。如果需要对同一批数据进行大量重复查询，可以先建立 Map 索引，建表成本为 O(n)，后续查询平均接近 O(1)，将大量关联查询从可能的 O(n²) 降到接近 O(n)，这是典型的空间换时间。
