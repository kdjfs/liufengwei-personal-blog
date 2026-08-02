---
title: 第四章 MySQL 和 Redis 到底用什么“编程”？
slug: di-si-zhang-mysql-he-redis-dao-di-yong-shen-me-bian-cheng
description: 它不是 JavaScript，也不是 Java。
publishDate: '2026-08-02'
category: 后端
tags:
  - React
  - Vue
  - JavaScript
  - Node.js
  - MySQL
  - Redis
  - 浏览器
  - AI
cover: auto
draft: false
featured: false
toc: true
---
先回答你最容易混淆的问题：

# MySQL 和 Redis 到底用什么“编程”？

## 1. SQL 本身就是一种语言

MySQL 使用的是：

> **SQL，结构化查询语言。**

它不是 JavaScript，也不是 Java。

例如：

```sql
-- 从订单表中查询订单编号为指定值的订单
SELECT *
FROM orders
WHERE order_no = 'ORDER20260730001';
```

这段代码可以直接在这些工具里执行：

- MySQL 命令行
- Navicat
- DataGrip
- MySQL Workbench
- 后端程序

------

## 2. Redis 不使用 SQL

Redis 使用的是自己的命令，例如：

```redis
# 保存用户 1001 的昵称
SET user:1001:name "刘凤伟"

# 读取用户 1001 的昵称
GET user:1001:name
```

所以要记住：

> MySQL 写 SQL，Redis 写 Redis 命令。

------

## 3. JavaScript、Java、Python 负责“调用”它们

实际项目中，通常是后端程序连接 MySQL 和 Redis。

常见组合：

| 后端语言 | MySQL 工具                | Redis 工具        |
| -------- | ------------------------- | ----------------- |
| Node.js  | mysql2、Sequelize、Prisma | redis、ioredis    |
| Java     | JDBC、MyBatis、JPA        | Spring Data Redis |
| Python   | PyMySQL、SQLAlchemy       | redis-py          |
| Go       | database/sql、GORM        | go-redis          |

你是前端开发，最适合先掌握：

> **Node.js + Express + mysql2 + Redis。**

------

## 4. 前端不能直接连接 MySQL

正常项目结构是：

```text
Vue / React 前端
        ↓
通过 Axios 或 Fetch 请求接口
        ↓
Node.js / Java 后端
        ↓
MySQL 和 Redis
```

不能这样做：

```text
Vue 前端 → 直接连接 MySQL
```

原因包括：

- 数据库账号和密码会暴露；
- 用户可以绕过业务规则；
- 容易被恶意修改数据库；
- 浏览器通常也不直接支持数据库连接协议。

------

## 5. Node.js 怎么执行 SQL？

以 `mysql2` 为例：

```js
// 引入 mysql2 的 Promise 版本，用来连接 MySQL
const mysql = require('mysql2/promise');

// 创建 MySQL 数据库连接池
const pool = mysql.createPool({
  host: 'localhost', // MySQL 服务器地址
  user: 'root', // MySQL 用户名
  password: '123456', // MySQL 密码
  database: 'wanfu', // 要连接的数据库名称
});

// 定义查询用户订单的方法
async function getUserOrders(userId) {
  // 执行 SQL，并通过问号占位符安全传入用户 ID
  const [rows] = await pool.execute(
    `
      -- 查询订单编号、状态和金额
      SELECT order_no, status, amount
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    [userId], // 将 userId 替换到 SQL 的问号位置
  );

  // 返回数据库查询结果
  return rows;
}
```

这里的职责是：

```text
JavaScript：控制程序流程
SQL：告诉 MySQL 查什么数据
```

------

## 6. Node.js 怎么操作 Redis？

以官方 `redis` 库为例：

```js
// 引入 Redis 客户端创建方法
const { createClient } = require('redis');

// 创建 Redis 客户端
const redisClient = createClient({
  url: 'redis://localhost:6379', // Redis 服务器连接地址
});

// 连接 Redis
await redisClient.connect();

// 保存用户昵称，并设置 300 秒后过期
await redisClient.set(
  'user:1001:name', // Redis 的 Key
  '刘凤伟', // Redis 的 Value
  {
    EX: 300, // 设置数据 300 秒后自动过期
  },
);

// 根据 Key 读取用户昵称
const name = await redisClient.get('user:1001:name');

// 打印读取到的用户名
console.log(name);
```

------

## 7. 数据库本身是用什么语言写的？

这是另外一个问题。

- MySQL 核心主要由 C、C++ 实现；
- Redis 核心主要由 C 实现；
- 但我们开发业务时，不需要自己编写数据库底层；
- 我们只需要通过 SQL、Redis 命令和客户端库操作它们。

一句话总结：

> MySQL 本身主要由 C/C++ 实现，但业务开发使用 SQL 操作；Redis 本身主要由 C 实现，但业务开发使用 SET、GET、HSET 等 Redis 命令操作。Node.js、Java 等语言负责连接数据库并执行这些命令。

------

# 第四章：MySQL 查询实战

今天你是一名“订单侦探”。

万福鉴酒系统里有几万条订单，产品经理跑来问你：

> 刘凤伟这个月买了多少瓶酒？
> 哪种订单状态最多？
> 哪些用户订单超过五单？
> 为什么列表第一页正常，第五千页却特别慢？

这一章就是教你回答这些问题。

你的万福鉴酒项目有订单状态机，生猪健康系统有药品和疾病检索，TripStar AI 有任务和行程记录，这些都是 SQL 高频使用场景。

------

# 一、先认识我们的订单表

假设有一张订单表：

```sql
-- 创建订单表
CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, -- 订单主键，自增 ID
  order_no VARCHAR(64) NOT NULL UNIQUE, -- 订单编号，不能重复
  user_id BIGINT NOT NULL, -- 下单用户 ID
  status TINYINT NOT NULL, -- 订单状态
  amount DECIMAL(10, 2) NOT NULL, -- 订单金额
  created_at DATETIME NOT NULL -- 订单创建时间
);
```

假设状态含义是：

```text
10：待接单
20：进行中
30：已完成
40：已退款
```

------

# 二、WHERE：先把无关的人赶出去

`WHERE` 用来筛选符合条件的数据。

## 查询用户 1001 的订单

```sql
-- 查询用户 1001 的所有订单
SELECT id, order_no, status, amount
FROM orders
WHERE user_id = 1001;
```

## 查询用户 1001 的进行中订单

```sql
-- 查询用户 1001 并且状态为进行中的订单
SELECT id, order_no, status, amount
FROM orders
WHERE user_id = 1001
  AND status = 20;
```

这里的 `AND` 表示：

> 两个条件必须同时满足。

------

## 查询进行中或已完成的订单

```sql
-- 查询状态为进行中或者已完成的订单
SELECT id, order_no, status, amount
FROM orders
WHERE status = 20
   OR status = 30;
```

更推荐使用 `IN`：

```sql
-- 查询状态属于进行中或已完成的订单
SELECT id, order_no, status, amount
FROM orders
WHERE status IN (20, 30);
```

记忆：

```text
AND：并且
OR：或者
IN：属于其中任意一个
```

------

# 三、BETWEEN：查询某个范围

查询金额在 100 元到 500 元之间的订单：

```sql
-- 查询金额在 100 元到 500 元之间的订单，包含 100 和 500
SELECT id, order_no, amount
FROM orders
WHERE amount BETWEEN 100 AND 500;
```

`BETWEEN` 通常包含左右边界。

它相当于：

```sql
-- 查询金额大于等于 100，并且小于等于 500 的订单
SELECT id, order_no, amount
FROM orders
WHERE amount >= 100
  AND amount <= 500;
```

------

# 四、日期查询千万不要乱写

查询 2026 年 7 月 30 日创建的订单。

不太推荐：

```sql
-- 对 created_at 字段调用 DATE 函数，可能影响普通索引使用
SELECT id, order_no, created_at
FROM orders
WHERE DATE(created_at) = '2026-07-30';
```

更推荐：

```sql
-- 查询 2026 年 7 月 30 日零点之后创建的订单
SELECT id, order_no, created_at
FROM orders
WHERE created_at >= '2026-07-30 00:00:00'
  AND created_at < '2026-07-31 00:00:00';
```

这里为什么不用：

```text
小于等于 23:59:59
```

因为数据库时间可能还包含毫秒或微秒。

所以日期范围常用：

> 大于等于今天零点，小于明天零点。

------

# 五、LIKE：模糊搜索

例如前端有一个订单号搜索框。

## 查询以 `ORDER2026` 开头的订单

```sql
-- 查询订单编号以 ORDER2026 开头的订单
SELECT id, order_no
FROM orders
WHERE order_no LIKE 'ORDER2026%';
```

这里 `%` 表示任意多个字符。

------

## 查询中间包含 `730` 的订单

```sql
-- 查询订单编号中任意位置包含 730 的订单
SELECT id, order_no
FROM orders
WHERE order_no LIKE '%730%';
```

但要记住：

> 前面带 `%` 的模糊查询，通常难以高效利用普通 B+ 树索引。

------

# 六、ORDER BY：给结果排队

## 按创建时间倒序

```sql
-- 查询订单，并按照创建时间从新到旧排序
SELECT id, order_no, created_at
FROM orders
ORDER BY created_at DESC;
```

`DESC`：

> 从大到小、从新到旧。

`ASC`：

> 从小到大、从旧到新。

------

## 先按状态，再按时间排序

```sql
-- 先按照订单状态升序，再按照创建时间倒序
SELECT id, order_no, status, created_at
FROM orders
ORDER BY status ASC, created_at DESC;
```

可以想象成：

```text
先把相同状态的人分到一个队伍
再让每个队伍里最新订单站前面
```

------

# 七、LIMIT：只取一部分数据

## 查询最新的十条订单

```sql
-- 按照订单创建时间倒序排列，只返回前十条
SELECT id, order_no, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

## 查询第二页

假设一页十条：

```sql
-- 跳过前十条订单，再返回十条，相当于查询第二页
SELECT id, order_no, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10 OFFSET 10;
```

计算公式：

```text
OFFSET = (pageIndex - 1) × pageSize
```

例如第 3 页，每页 10 条：

```text
OFFSET = (3 - 1) × 10 = 20
```

SQL：

```sql
-- 跳过前二十条数据，再查询十条，相当于第三页
SELECT id, order_no, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10 OFFSET 20;
```

------

# 八、为什么深分页很慢？

第 10001 页：

```sql
-- 跳过前十万条订单，再返回十条，可能产生深分页性能问题
SELECT id, order_no, created_at
FROM orders
ORDER BY id DESC
LIMIT 10 OFFSET 100000;
```

MySQL 并不是瞬间传送到第十万条。

它可能需要：

```text
先找到前 100010 条
丢掉前 100000 条
只留下最后 10 条
```

因此会浪费大量扫描。

------

## 使用 lastId 优化

假设上一页最后一条订单 ID 是 `88888`：

```sql
-- 查询 ID 小于上一页最后一个 ID 的订单
SELECT id, order_no, created_at
FROM orders
WHERE id < 88888
ORDER BY id DESC
LIMIT 10;
```

前端请求可以传：

```js
// 请求下一页订单数据
axios.get('/api/orders', {
  params: {
    lastId: 88888, // 上一页最后一条订单的 ID
    pageSize: 10, // 本次需要查询的订单数量
  },
});
```

这种方式叫：

> 游标分页。

面试回答：

> 普通后台列表可以使用 pageIndex 和 pageSize，但大数据量的深分页会扫描并丢弃大量记录。信息流场景可以基于上一页最后一个 ID 进行游标分页。

------

# 九、聚合函数：让数据库帮你做数学题

常见聚合函数：

| 函数    | 用途     |
| ------- | -------- |
| `COUNT` | 统计数量 |
| `SUM`   | 求和     |
| `AVG`   | 求平均值 |
| `MAX`   | 求最大值 |
| `MIN`   | 求最小值 |

------

## 1. 统计订单数量

```sql
-- 统计订单表中一共有多少条订单
SELECT COUNT(*) AS order_count
FROM orders;
```

`AS order_count` 表示给结果起别名。

结果类似：

```text
order_count：5000
```

------

## 2. 统计用户 1001 的订单数量

```sql
-- 统计用户 1001 一共有多少条订单
SELECT COUNT(*) AS order_count
FROM orders
WHERE user_id = 1001;
```

------

## 3. 统计用户的总消费金额

```sql
-- 计算用户 1001 所有订单金额的总和
SELECT SUM(amount) AS total_amount
FROM orders
WHERE user_id = 1001;
```

------

## 4. 统计平均订单金额

```sql
-- 计算所有订单的平均金额
SELECT AVG(amount) AS average_amount
FROM orders;
```

------

## 5. 查询最高和最低订单金额

```sql
-- 查询订单中的最高金额和最低金额
SELECT
  MAX(amount) AS maximum_amount, -- 计算最高订单金额
  MIN(amount) AS minimum_amount -- 计算最低订单金额
FROM orders;
```

------

# 十、COUNT 三兄弟的区别

## `COUNT(*)`

统计符合条件的行数：

```sql
-- 统计订单表中符合条件的所有记录数量
SELECT COUNT(*)
FROM orders;
```

## `COUNT(id)`

统计 `id` 不为 `NULL` 的数量：

```sql
-- 统计 id 字段不为 NULL 的记录数量
SELECT COUNT(id)
FROM orders;
```

由于主键 `id` 不会为 `NULL`，通常结果和 `COUNT(*)` 相同。

## `COUNT(refund_reason)`

```sql
-- 只统计退款原因字段不为 NULL 的订单数量
SELECT COUNT(refund_reason)
FROM orders;
```

它不会统计 `refund_reason` 为 `NULL` 的记录。

面试记忆：

> `COUNT(*)` 统计行数，`COUNT(字段)` 只统计该字段不为 NULL 的行数。

------

# 十一、GROUP BY：把订单分组统计

产品经理问：

> 每种状态分别有多少条订单？

这时不能只用 `COUNT`，因为需要按照状态分组。

```sql
-- 按照订单状态分组，并统计每种状态的订单数量
SELECT
  status, -- 返回订单状态
  COUNT(*) AS order_count -- 统计当前状态对应的订单数量
FROM orders
GROUP BY status;
```

结果可能是：

```text
状态 10：20 条
状态 20：15 条
状态 30：100 条
状态 40：8 条
```

你可以把 `GROUP BY` 想象成体育老师分队：

```text
待接单去第一队
进行中去第二队
已完成去第三队
已退款去第四队
```

然后分别数每一队有多少人。

------

# 十二、按照用户分组统计消费

```sql
-- 按照用户 ID 分组，统计每个用户的订单数量和消费总额
SELECT
  user_id, -- 返回用户 ID
  COUNT(*) AS order_count, -- 统计当前用户的订单数量
  SUM(amount) AS total_amount -- 计算当前用户的消费总额
FROM orders
GROUP BY user_id;
```

结果：

```text
用户 1001：5 单，共 1200 元
用户 1002：8 单，共 3000 元
用户 1003：2 单，共 500 元
```

------

# 十三、WHERE 和 HAVING 到底有什么区别？

这是面试高频。

## WHERE：分组前过滤

例如只统计已完成订单：

```sql
-- 先筛选出已完成订单，再按照用户分组
SELECT
  user_id, -- 返回用户 ID
  COUNT(*) AS completed_count -- 统计用户已完成订单数量
FROM orders
WHERE status = 30
GROUP BY user_id;
```

执行思路：

```text
先把不是已完成的订单赶走
再按照用户分组
```

------

## HAVING：分组后过滤

例如只查询订单数量超过 5 单的用户：

```sql
-- 按照用户分组后，只保留订单数量超过五单的用户
SELECT
  user_id, -- 返回用户 ID
  COUNT(*) AS order_count -- 统计每个用户的订单数量
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;
```

执行思路：

```text
先按照用户分组
再统计每组订单数量
最后留下数量超过 5 的组
```

一句话背诵：

> `WHERE` 过滤原始数据，`HAVING` 过滤分组后的结果。

------

# 十四、WHERE 和 HAVING 一起使用

需求：

> 统计已完成订单中，总消费超过 1000 元的用户。

```sql
-- 查询已完成订单中，累计消费金额超过 1000 元的用户
SELECT
  user_id, -- 返回用户 ID
  SUM(amount) AS total_amount -- 计算用户已完成订单的总金额
FROM orders
WHERE status = 30 -- 分组前只保留已完成订单
GROUP BY user_id -- 按照用户进行分组
HAVING SUM(amount) > 1000; -- 分组后筛选总金额超过 1000 元的用户
```

故事顺序：

```text
第一步：只留下已完成订单
第二步：按用户分组
第三步：计算每个用户总金额
第四步：留下超过 1000 元的用户
```

------

# 十五、JOIN：把两张表拼起来

假设用户表：

```sql
-- 创建用户表
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, -- 用户主键 ID
  username VARCHAR(50) NOT NULL -- 用户名
);
```

订单表中只保存了：

```text
user_id = 1001
```

但是页面想展示：

```text
用户：刘凤伟
订单：ORDER001
金额：999 元
```

这时需要连接用户表和订单表。

------

## INNER JOIN

```sql
-- 查询能够匹配到用户信息的订单
SELECT
  o.order_no, -- 返回订单编号
  o.amount, -- 返回订单金额
  u.username -- 返回用户名
FROM orders AS o
INNER JOIN users AS u
  ON o.user_id = u.id;
```

`o` 和 `u` 是表的别名：

```text
o：orders
u：users
```

`INNER JOIN` 只返回：

> 两张表都能匹配上的数据。

------

## LEFT JOIN

```sql
-- 查询全部订单，即使某些订单匹配不到用户信息也保留
SELECT
  o.order_no, -- 返回订单编号
  o.amount, -- 返回订单金额
  u.username -- 返回用户名，匹配不到时为 NULL
FROM orders AS o
LEFT JOIN users AS u
  ON o.user_id = u.id;
```

`LEFT JOIN` 会保留左边订单表的全部数据。

记忆：

```text
INNER JOIN：双方对得上才进来
LEFT JOIN：左边的人全部进来
```

------

# 十六、一个非常真实的列表查询

万福鉴酒后台需要：

- 查询指定用户；
- 查询进行中和已完成订单；
- 显示用户名；
- 按创建时间倒序；
- 每页二十条。

```sql
-- 查询指定用户的进行中和已完成订单列表
SELECT
  o.id, -- 返回订单主键 ID
  o.order_no, -- 返回订单编号
  o.status, -- 返回订单状态
  o.amount, -- 返回订单金额
  o.created_at, -- 返回订单创建时间
  u.username -- 返回下单用户名
FROM orders AS o
LEFT JOIN users AS u
  ON o.user_id = u.id -- 根据用户 ID 关联用户表
WHERE o.user_id = 1001 -- 只查询用户 1001 的订单
  AND o.status IN (20, 30) -- 只查询进行中和已完成状态
ORDER BY o.created_at DESC -- 按照创建时间从新到旧排序
LIMIT 20; -- 只返回前二十条记录
```

这已经是一条很像真实项目的 SQL。

------

# 十七、SQL 的实际执行顺序

SQL 虽然是这样写：

```sql
-- 查询每个用户已完成订单的总金额
SELECT
  user_id, -- 返回用户 ID
  SUM(amount) AS total_amount -- 计算总金额
FROM orders
WHERE status = 30 -- 筛选已完成订单
GROUP BY user_id -- 按用户分组
HAVING SUM(amount) > 1000 -- 筛选总金额大于 1000 的分组
ORDER BY total_amount DESC -- 按总金额从高到低排序
LIMIT 10; -- 只返回前十名
```

但大致逻辑执行顺序是：

```text
1. FROM：先确定从哪张表查询
2. JOIN：连接其他表
3. WHERE：过滤原始数据
4. GROUP BY：进行分组
5. HAVING：过滤分组结果
6. SELECT：选择返回字段
7. ORDER BY：排序
8. LIMIT：限制返回数量
```

记忆小故事：

> **先找表，再连接；先过滤，再分组；分完再过滤，最后选字段、排序、截取。**

------

# 十八、为什么不能在 WHERE 中直接使用聚合结果？

错误思路：

```sql
-- 错误示例：WHERE 阶段还没有完成分组统计
SELECT
  user_id, -- 返回用户 ID
  COUNT(*) AS order_count -- 统计订单数量
FROM orders
WHERE COUNT(*) > 5 -- 这里不能直接使用聚合结果
GROUP BY user_id;
```

因为 `WHERE` 执行时，还没有进行 `GROUP BY` 和 `COUNT`。

正确写法：

```sql
-- 正确示例：使用 HAVING 筛选分组后的统计结果
SELECT
  user_id, -- 返回用户 ID
  COUNT(*) AS order_count -- 统计用户订单数量
FROM orders
GROUP BY user_id -- 先按照用户进行分组
HAVING COUNT(*) > 5; -- 再筛选订单数量超过五单的用户
```

------

# 十九、DISTINCT：删除重复结果

例如查询所有下过单的用户 ID：

```sql
-- 查询订单表中不重复的用户 ID
SELECT DISTINCT user_id
FROM orders;
```

假设原数据是：

```text
1001
1001
1002
1002
1003
```

结果变成：

```text
1001
1002
1003
```

但不要无脑使用 `DISTINCT`。

因为数据库需要做去重处理，数据量大时也会有成本。

------

# 二十、结合生猪健康系统

产品经理问：

> 每种药品分类分别有多少种药品？

```sql
-- 按照药品分类统计每个分类中的药品数量
SELECT
  category_id, -- 返回药品分类 ID
  COUNT(*) AS medicine_count -- 统计该分类下的药品数量
FROM medicines
GROUP BY category_id;
```

查询药品数量超过十种的分类：

```sql
-- 查询药品数量超过十种的分类
SELECT
  category_id, -- 返回药品分类 ID
  COUNT(*) AS medicine_count -- 统计分类下的药品数量
FROM medicines
GROUP BY category_id -- 按照药品分类进行分组
HAVING COUNT(*) > 10; -- 只保留药品数量超过十种的分类
```

------

# 二十一、结合 TripStar AI

查询用户最近完成的旅行计划：

```sql
-- 查询用户 1001 最近完成的十个旅行计划
SELECT
  id, -- 返回旅行计划 ID
  destination, -- 返回目的地
  status, -- 返回任务状态
  created_at -- 返回创建时间
FROM trip_tasks
WHERE user_id = 1001 -- 只查询用户 1001 的任务
  AND status = 'completed' -- 只查询已完成任务
ORDER BY created_at DESC -- 按照创建时间从新到旧排序
LIMIT 10; -- 只返回最新十条
```

统计每天生成了多少个旅行计划：

```sql
-- 按照日期统计每天创建的旅行计划数量
SELECT
  DATE(created_at) AS create_date, -- 提取任务创建日期
  COUNT(*) AS task_count -- 统计当天创建的任务数量
FROM trip_tasks
GROUP BY DATE(created_at) -- 按照创建日期分组
ORDER BY create_date DESC; -- 按照日期从新到旧排序
```

注意：

> 在统计报表中对日期使用函数很常见；但在高频 WHERE 查询中，要注意函数可能影响索引使用。

------

# 本章必须背的五个问题

## 1. WHERE 和 HAVING 有什么区别？

> WHERE 在分组前过滤原始数据，不能直接筛选聚合结果；HAVING 在 GROUP BY 分组后过滤统计结果，常与 COUNT、SUM 等聚合函数配合使用。

## 2. INNER JOIN 和 LEFT JOIN 有什么区别？

> INNER JOIN 只返回左右两张表能够匹配的记录；LEFT JOIN 会保留左表全部记录，右表匹配不到时对应字段为 NULL。

## 3. COUNT(*) 和 COUNT(字段) 有什么区别？

> COUNT(*) 统计符合条件的记录行数，COUNT(字段) 只统计该字段不为 NULL 的记录数量。

## 4. 深分页为什么慢？

> OFFSET 很大时，MySQL 可能需要扫描并丢弃大量前置数据。可以使用合适索引以及基于 lastId 的游标分页优化。

## 5. SQL 的逻辑执行顺序是什么？

> 大致是 FROM、JOIN、WHERE、GROUP BY、HAVING、SELECT、ORDER BY、LIMIT。

------

# 本章一句话知识链

```text
WHERE 负责找人
ORDER BY 负责排队
LIMIT 负责截取
COUNT 和 SUM 负责算账
GROUP BY 负责分组
HAVING 负责淘汰分组
JOIN 负责把多张表拼起来
```

下一章进入 **MySQL 慢 SQL 优化与 EXPLAIN 实战**：一条接口为什么从 100 毫秒变成 5 秒，怎样像排查前端性能问题一样一步步找出数据库凶手。
