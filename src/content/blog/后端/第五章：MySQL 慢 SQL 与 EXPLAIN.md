---
title: 第五章：MySQL 慢 SQL 与 EXPLAIN
slug: di-wu-zhang-mysql-man-sql-yu-explain
description: 万福鉴酒的订单列表刚上线时 100 毫秒打开，后来订单越来越多，接口突然需要 5 秒。
publishDate: '2026-08-02'
category: 后端
series: MySQL 与 Redis 前端速成
seriesOrder: 5
tags:
  - JavaScript
  - Node.js
  - MySQL
  - Redis
  - AI
cover: auto
draft: false
featured: false
toc: true
---
这一章我们来当一次“数据库侦探”。

场景是：

> 万福鉴酒的订单列表刚上线时 100 毫秒打开，后来订单越来越多，接口突然需要 5 秒。

产品经理说：

> 是不是前端渲染太慢了？

前端看 Network：

```text
接口等待时间：4.8 秒
页面渲染时间：0.2 秒
```

这说明真正的嫌疑人很可能是：

> 后端接口或数据库查询。

你的简历中有订单列表、药品检索、AI 任务进度等数据场景，面试官很可能追问你：“接口变慢后怎么定位？”

------

# 一、慢 SQL 是什么？

慢 SQL 就是：

> 执行时间明显超过正常范围的 SQL。

但是“超过多少秒算慢”没有绝对答案。

例如：

```text
普通详情接口：500 毫秒可能已经偏慢
复杂统计报表：2 秒可能可以接受
离线数据任务：10 秒也可能正常
```

因此判断 SQL 是否慢，要结合：

- 数据量；
- 接口类型；
- 用户体验；
- 系统性能要求；
- 查询执行频率。

你面试时不要说：

> 超过 1 秒的 SQL 就一定是慢 SQL。

更稳的说法是：

> 慢 SQL 是执行时间超过业务预期，或者消耗大量 CPU、内存和磁盘 IO 的查询，需要结合接口场景和监控数据判断。

------

# 二、发现接口慢，不能直接加索引

很多初学者的第一反应是：

> 查询慢？加索引！

这是不严谨的。

正确排查流程是：

```text
确认接口确实慢
       ↓
找到具体 SQL
       ↓
检查返回数据量
       ↓
使用 EXPLAIN 分析执行计划
       ↓
检查索引和 SQL 写法
       ↓
优化后重新测试
```

面试标准回答：

> 遇到慢 SQL，我不会直接加索引，而是先确认具体慢在哪里，再通过慢查询日志、接口监控和 EXPLAIN 查看执行计划，检查扫描行数、索引使用、排序和临时表情况，然后针对性优化，最后对比优化前后的执行时间。

这一段值得背。

------

# 三、我们的嫌疑 SQL

万福鉴酒需要查询某个用户“进行中”的订单，并按照时间倒序展示：

```sql
-- 查询用户 1001 正在进行中的订单
SELECT
  id,          -- 返回订单主键 ID
  order_no,    -- 返回订单编号
  status,      -- 返回订单状态
  amount,      -- 返回订单金额
  created_at   -- 返回订单创建时间
FROM orders
WHERE user_id = 1001      -- 只查询用户 1001 的订单
  AND status = 20         -- 只查询进行中的订单
ORDER BY created_at DESC  -- 按照创建时间从新到旧排序
LIMIT 20;                 -- 只返回最新二十条
```

当订单表只有 100 条数据时，它很快。

当订单表有 1000 万条时，如果没有合适索引，MySQL 可能需要扫描大量记录。

------

# 四、EXPLAIN：给 SQL 做一次“体检”

在查询前面加上：

```sql
-- 查看这条订单查询的执行计划，不会真正返回完整业务结果
EXPLAIN
SELECT
  id,          -- 返回订单主键 ID
  order_no,    -- 返回订单编号
  status,      -- 返回订单状态
  amount,      -- 返回订单金额
  created_at   -- 返回订单创建时间
FROM orders
WHERE user_id = 1001      -- 根据用户 ID 筛选
  AND status = 20         -- 根据订单状态筛选
ORDER BY created_at DESC  -- 按创建时间倒序排列
LIMIT 20;                 -- 只查询二十条数据
```

`EXPLAIN` 不会直接告诉你：

> 这条 SQL 应该怎么改。

它会给出执行计划，让你自己判断 MySQL 打算怎么查询。

你现在只重点看五项：

```text
type
possible_keys
key
rows
Extra
```

------

# 五、type：MySQL 怎么找数据？

`type` 表示 MySQL 访问数据的大致方式。

从常见较优到较差，可以先记：

```text
const
eq_ref
ref
range
index
ALL
```

不需要把所有类型一次背完，重点记下面五个。

------

## 1. const：直接锁定一条数据

例如根据主键查询：

```sql
-- 根据主键 ID 查询唯一的一条订单
SELECT
  id,        -- 返回订单 ID
  order_no,  -- 返回订单编号
  status     -- 返回订单状态
FROM orders
WHERE id = 1001; -- 主键等值查询，最多匹配一条记录
```

这种查询通常非常快。

你可以理解成：

> 已经知道学生的唯一学号，直接找到本人。

------

## 2. ref：普通索引等值查询

例如 `user_id` 有索引：

```sql
-- 查询用户 1001 的全部订单
SELECT
  id,        -- 返回订单 ID
  order_no   -- 返回订单编号
FROM orders
WHERE user_id = 1001; -- 根据普通索引字段进行等值查询
```

一个用户可能有很多订单，因此不是唯一的一条。

------

## 3. range：索引范围查询

例如：

```sql
-- 查询订单金额在 100 元到 500 元之间的数据
SELECT
  id,       -- 返回订单 ID
  amount    -- 返回订单金额
FROM orders
WHERE amount >= 100  -- 金额不能低于 100 元
  AND amount <= 500; -- 金额不能高于 500 元
```

如果 `amount` 有索引，MySQL 可能进行索引范围扫描。

------

## 4. index：扫描整个索引

`index` 不等于“查询特别快”。

它可能表示：

> 没有扫描整张数据表，但是把整个索引都扫了一遍。

就像没有翻整本书，但把整本目录从头看到尾。

------

## 5. ALL：全表扫描

如果看到：

```text
type = ALL
```

表示 MySQL 可能需要扫描整张表。

但是不要机械地说：

> 看到 ALL 就一定有问题。

如果表中只有 20 条数据，全表扫描可能比走索引更简单。

真正需要警惕的是：

```text
大表
高频 SQL
type = ALL
rows 很大
```

------

# 六、possible_keys 和 key

## possible_keys

表示：

> MySQL 认为可能可以使用哪些索引。

## key

表示：

> MySQL 最终实际选择了哪个索引。

假设结果是：

```text
possible_keys：idx_user_id, idx_status
key：idx_user_id
```

表示 MySQL 认为两个索引都有可能，但最终选择了 `idx_user_id`。

如果：

```text
key：NULL
```

一般表示这条查询没有实际使用索引。

记忆：

> `possible_keys` 是候选人，`key` 是最终录取的人。

------

# 七、rows：预计扫描多少行

`rows` 表示 MySQL 估计需要检查的记录数量。

例如：

```text
rows = 10
```

一般压力不大。

如果：

```text
rows = 8000000
```

就要重点关注。

但是注意：

> `rows` 是优化器的估算值，不一定等于真实扫描数量。

你可以把它理解成高德地图说：

> 预计还有 20 分钟到达。

它有参考价值，但不一定精确到每一秒。

------

# 八、Extra：数据库额外做了什么？

`Extra` 是排查 SQL 时非常有价值的一项。

重点认识四个结果。

------

## 1. Using index

表示查询需要的字段可以直接从索引获得，通常说明使用了覆盖索引。

例如索引是：

```sql
-- 给用户 ID 和订单状态建立联合索引
CREATE INDEX idx_user_status
ON orders (
  user_id, -- 联合索引第一列：用户 ID
  status   -- 联合索引第二列：订单状态
);
```

查询：

```sql
-- 查询用户 1001 的进行中订单，只返回索引中已有的字段
SELECT
  user_id, -- 返回用户 ID
  status   -- 返回订单状态
FROM orders
WHERE user_id = 1001 -- 根据用户 ID 筛选
  AND status = 20;   -- 根据订单状态筛选
```

查询所需字段都在索引中，就可能不需要回表。

------

## 2. Using where

表示 MySQL 读取数据后，还需要根据 `WHERE` 条件进行过滤。

它不一定是坏事。

大多数带条件的查询都可能出现。

------

## 3. Using filesort

表示排序不能完全直接利用索引，需要进行额外排序。

例如：

```sql
-- 查询用户订单，但按照没有合适索引支持的金额字段排序
SELECT
  id,        -- 返回订单 ID
  amount     -- 返回订单金额
FROM orders
WHERE user_id = 1001 -- 根据用户筛选
ORDER BY amount DESC; -- 按照金额倒序，需要额外排序
```

`Using filesort` 里的 `filesort` 不一定表示真的写入了磁盘文件。

它主要表示：

> MySQL 需要额外执行排序，而不是直接按照索引顺序读取。

数据量小时问题不大；数据量很大、查询频繁时需要关注。

------

## 4. Using temporary

表示查询过程中可能使用了临时表。

常见于：

- 复杂分组；
- 复杂排序；
- `DISTINCT`；
- 某些多表查询。

看到它也不是直接判死刑，但如果 SQL 很慢，就需要重点检查。

------

# 九、第一次破案：没有联合索引

原 SQL：

```sql
-- 查询指定用户的进行中订单
SELECT
  id,          -- 返回订单 ID
  order_no,    -- 返回订单编号
  status,      -- 返回订单状态
  amount,      -- 返回订单金额
  created_at   -- 返回订单创建时间
FROM orders
WHERE user_id = 1001      -- 根据用户 ID 筛选
  AND status = 20         -- 根据订单状态筛选
ORDER BY created_at DESC  -- 按创建时间倒序排列
LIMIT 20;                 -- 返回最新二十条
```

它的查询规律是：

```text
user_id：等值查询
status：等值查询
created_at：排序
```

可以考虑建立：

```sql
-- 创建用户、状态和创建时间的联合索引
CREATE INDEX idx_user_status_created
ON orders (
  user_id,    -- 先按照用户 ID 排序
  status,     -- 相同用户下再按照状态排序
  created_at  -- 相同用户和状态下再按照创建时间排序
);
```

这样 MySQL 可以：

```text
先定位用户 1001
再定位状态 20
然后按照 created_at 的索引顺序取前 20 条
```

减少：

- 扫描记录数；
- 额外筛选；
- 额外排序。

------

# 十、联合索引字段顺序怎么定？

不要只背：

> 区分度高的字段放前面。

这个说法不够完整。

更合理的是结合查询方式分析。

例如：

```sql
-- 查询用户的指定状态订单，并按照时间排序
SELECT
  id,          -- 返回订单 ID
  order_no,    -- 返回订单编号
  created_at   -- 返回订单创建时间
FROM orders
WHERE user_id = 1001      -- 用户 ID 等值查询
  AND status = 20         -- 状态等值查询
ORDER BY created_at DESC; -- 创建时间用于排序
```

联合索引可以是：

```text
(user_id, status, created_at)
```

因为：

```text
user_id：主要业务查询范围
status：继续缩小范围
created_at：支持排序
```

一句话背诵：

> 联合索引字段顺序应该结合实际查询中的等值条件、范围条件、排序和分组设计，通常先放高频等值查询字段，再考虑范围和排序字段。

------

# 十一、第二次破案：SELECT * 导致大量回表

假设有索引：

```sql
-- 给用户 ID、状态和创建时间建立联合索引
CREATE INDEX idx_user_status_created
ON orders (
  user_id,    -- 用户 ID
  status,     -- 订单状态
  created_at  -- 创建时间
);
```

查询却写成：

```sql
-- 查询订单的全部字段
SELECT *
FROM orders
WHERE user_id = 1001      -- 根据用户 ID 筛选
  AND status = 20         -- 根据订单状态筛选
ORDER BY created_at DESC; -- 根据创建时间倒序排列
```

索引里没有：

```text
order_no
amount
address
remark
refund_reason
……
```

MySQL 找到索引记录后，需要频繁回表获取完整数据。

如果页面只需要四个字段，可以改成：

```sql
-- 只查询页面实际需要展示的订单字段
SELECT
  id,          -- 返回订单 ID
  status,      -- 返回订单状态
  created_at   -- 返回订单创建时间
FROM orders
WHERE user_id = 1001      -- 根据用户 ID 筛选
  AND status = 20         -- 根据订单状态筛选
ORDER BY created_at DESC  -- 按创建时间倒序
LIMIT 20;                 -- 只返回二十条数据
```

但注意：

> 不能为了覆盖索引，把几十个业务字段全部塞进索引。

索引会变得非常大，写入成本也会提高。

正确原则是：

> 查询真正需要的字段，并围绕高频查询设计索引。

------

# 十二、第三次破案：给索引字段套函数

假设 `created_at` 已经有索引。

不推荐：

```sql
-- 对创建时间调用 DATE 函数，可能影响普通索引定位
SELECT
  id,          -- 返回订单 ID
  created_at   -- 返回订单创建时间
FROM orders
WHERE DATE(created_at) = '2026-07-30'; -- 将每条时间转换成日期再比较
```

因为 MySQL 可能需要对大量记录执行：

```text
DATE(created_at)
```

推荐改为范围查询：

```sql
-- 查询 2026 年 7 月 30 日全天创建的订单
SELECT
  id,          -- 返回订单 ID
  created_at   -- 返回订单创建时间
FROM orders
WHERE created_at >= '2026-07-30 00:00:00' -- 从当天零点开始
  AND created_at < '2026-07-31 00:00:00'; -- 不包含第二天零点
```

这样更容易利用 `created_at` 的有序索引。

------

# 十三、第四次破案：前置模糊查询

假设订单号有索引。

下面这条通常容易使用索引前缀：

```sql
-- 查询订单编号以 ORDER2026 开头的订单
SELECT
  id,        -- 返回订单 ID
  order_no   -- 返回订单编号
FROM orders
WHERE order_no LIKE 'ORDER2026%'; -- 已知订单号开头
```

下面这条通常难以高效使用普通 B+ 树索引：

```sql
-- 查询订单编号任意位置包含 0730 的订单
SELECT
  id,        -- 返回订单 ID
  order_no   -- 返回订单编号
FROM orders
WHERE order_no LIKE '%0730%'; -- 开头未知，难以快速确定索引起点
```

因为 B+ 树按照字段开头顺序排列。

类比查字典：

```text
查“刘开头的名字”：可以直接翻到刘
查“名字中含有凤”：可能需要从头翻
```

------

# 十四、第五次破案：深分页

普通分页：

```sql
-- 查询第 10001 页订单，每页十条
SELECT
  id,          -- 返回订单 ID
  order_no,    -- 返回订单编号
  created_at   -- 返回订单创建时间
FROM orders
ORDER BY id DESC      -- 按主键从大到小排列
LIMIT 100000, 10;     -- 跳过十万条，再返回十条
```

MySQL 可能需要先扫描大量记录，再丢弃前面的数据。

可以改为游标分页：

```sql
-- 查询 ID 小于上一页最后一条 ID 的后续订单
SELECT
  id,          -- 返回订单 ID
  order_no,    -- 返回订单编号
  created_at   -- 返回订单创建时间
FROM orders
WHERE id < 88888 -- 88888 是上一页最后一条订单的 ID
ORDER BY id DESC -- 按照 ID 从大到小排列
LIMIT 10;        -- 返回下一页十条数据
```

游标分页的优点：

- 不需要跳过大量记录；
- 数据越多，优势越明显；
- 很适合信息流和下拉加载。

缺点：

- 不方便直接跳转到任意页；
- 需要前端保存 `lastId`；
- 数据排序字段最好稳定且唯一。

------

# 十五、第六次破案：返回了太多数据

下面这条可能查出几十万条：

```sql
-- 查询用户 1001 的所有历史订单
SELECT
  id,          -- 返回订单 ID
  order_no,    -- 返回订单编号
  status,      -- 返回订单状态
  amount,      -- 返回订单金额
  created_at   -- 返回订单创建时间
FROM orders
WHERE user_id = 1001; -- 查询该用户全部订单，没有分页限制
```

即使索引使用正常，也可能很慢，因为：

- 数据库需要读取大量数据；
- 后端需要序列化大量 JSON；
- 网络需要传输大量内容；
- 前端需要渲染大量节点。

应该增加分页：

```sql
-- 分页查询用户 1001 的最新订单
SELECT
  id,          -- 返回订单 ID
  order_no,    -- 返回订单编号
  status,      -- 返回订单状态
  amount,      -- 返回订单金额
  created_at   -- 返回订单创建时间
FROM orders
WHERE user_id = 1001      -- 根据用户筛选
ORDER BY created_at DESC  -- 按时间从新到旧排序
LIMIT 20;                 -- 每次只返回二十条
```

所以接口慢不一定只是“没有索引”。

还可能是：

> 返回数据量本身不合理。

------

# 十六、第七次破案：N+1 查询

这个问题在 Node.js 项目中非常常见。

需求：

> 查询 100 条订单，再查询每个订单对应的用户。

错误思路：

```js
// 先查询全部订单
const orders = await getOrders();

// 遍历每一条订单
for (const order of orders) {
  // 每遍历一条订单，就再查询一次用户信息
  order.user = await getUserById(order.userId);
}
```

如果有 100 条订单：

```text
查询订单：1 次
查询用户：100 次
总查询次数：101 次
```

这就是典型的 N+1 查询问题。

可以使用 `JOIN` 一次查询：

```sql
-- 一次查询订单及其对应的用户名
SELECT
  o.id,          -- 返回订单 ID
  o.order_no,    -- 返回订单编号
  o.amount,      -- 返回订单金额
  u.id AS user_id, -- 返回用户 ID
  u.username     -- 返回用户名
FROM orders AS o
LEFT JOIN users AS u
  ON o.user_id = u.id -- 根据订单中的用户 ID 关联用户表
ORDER BY o.created_at DESC -- 按订单创建时间倒序
LIMIT 100;                 -- 只返回一百条订单
```

也可以先批量收集用户 ID，再一次性查询：

```sql
-- 一次查询多个指定用户的信息
SELECT
  id,        -- 返回用户 ID
  username   -- 返回用户名
FROM users
WHERE id IN (1001, 1002, 1003); -- 批量查询多个用户
```

面试回答：

> N+1 问题是先查询一批主数据，再在循环中为每条数据单独执行一次查询，导致数据库请求次数快速增加。可以通过 JOIN、批量 IN 查询或者 ORM 的预加载机制解决。

------

# 十七、第八次破案：JOIN 字段没有索引

查询订单及用户：

```sql
-- 查询订单和对应用户信息
SELECT
  o.order_no, -- 返回订单编号
  u.username  -- 返回用户名
FROM orders AS o
INNER JOIN users AS u
  ON o.user_id = u.id; -- 根据用户 ID 关联两张表
```

这里应该关注：

```text
orders.user_id
users.id
```

`users.id` 通常是主键，已经有索引。

但如果 `orders.user_id` 没有索引，大数据关联时可能效率较差。

可以建立：

```sql
-- 给订单表的用户 ID 字段建立普通索引
CREATE INDEX idx_orders_user_id
ON orders (
  user_id -- 用于关联用户表和查询用户订单
);
```

标准回答：

> 多表关联时，需要重点检查 JOIN 条件字段是否有索引，尤其是大表之间的关联，否则可能扫描大量数据。

------

# 十八、慢查询日志是什么？

MySQL 可以记录执行时间超过指定阈值的 SQL。

这些记录通常称为：

> 慢查询日志。

它能帮助开发者找到：

- 哪些 SQL 执行时间长；
- 哪些 SQL 调用次数高；
- 哪些查询扫描数据多；
- 哪些接口值得优先优化。

一天速成不需要背具体配置命令。

你只需要知道：

> EXPLAIN 分析的是某一条已知 SQL，慢查询日志帮助我们从整个系统中找到可疑 SQL。

------

# 十九、EXPLAIN ANALYZE 是什么？

普通 `EXPLAIN` 主要展示优化器估计的执行计划。

较新的 MySQL 版本还可以使用：

```sql
-- 实际执行查询，并展示真实执行过程和耗时信息
EXPLAIN ANALYZE
SELECT
  id,          -- 返回订单 ID
  order_no,    -- 返回订单编号
  created_at   -- 返回创建时间
FROM orders
WHERE user_id = 1001      -- 根据用户 ID 筛选
ORDER BY created_at DESC  -- 按创建时间倒序
LIMIT 20;                 -- 返回二十条数据
```

区别可以简单记成：

```text
EXPLAIN：预计怎么执行
EXPLAIN ANALYZE：实际执行后告诉你发生了什么
```

但是要注意：

> `EXPLAIN ANALYZE` 会真实执行查询，在生产环境中使用时要谨慎，特别是耗时查询或修改型语句。

------

# 二十、哪些字段适合建立索引？

通常重点考虑：

- 经常出现在 `WHERE` 中的字段；
- 经常用于 `JOIN` 的字段；
- 经常用于 `ORDER BY` 的字段；
- 经常用于 `GROUP BY` 的字段；
- 唯一性要求高的字段。

例如订单号：

```sql
-- 给订单编号建立唯一索引，保证订单号不能重复
CREATE UNIQUE INDEX uk_order_no
ON orders (
  order_no -- 唯一的业务订单编号
);
```

用户订单查询：

```sql
-- 给用户 ID、状态和创建时间建立联合索引
CREATE INDEX idx_user_status_created
ON orders (
  user_id,    -- 查询某个用户
  status,     -- 筛选订单状态
  created_at  -- 支持时间排序
);
```

------

# 二十一、哪些字段不一定适合单独建索引？

## 区分度特别低的字段

例如：

```text
gender：男、女
deleted：0、1
status：少量几个状态
```

假设 100 万条数据中：

```text
deleted = 0 有 99 万条
```

查询：

```sql
-- 查询所有未删除订单，可能命中绝大多数记录
SELECT
  id,        -- 返回订单 ID
  order_no   -- 返回订单编号
FROM orders
WHERE deleted = 0; -- 该条件区分度很低
```

即使 `deleted` 有索引，MySQL 也可能认为：

> 查出 99 万个主键再回表，不如直接扫描表。

但是低区分度字段不是绝对不能进入索引。

例如：

```text
(user_id, status, created_at)
```

虽然 `status` 区分度不高，但放在 `user_id` 后面，可以继续缩小某个用户的订单范围。

所以不能机械背成：

> 状态字段永远不能建索引。

------

# 二十二、索引越多越好吗？

不是。

假设订单表有十个索引。

每次新增订单时，MySQL 不仅要插入业务数据，还要维护十棵索引结构。

因此索引过多会导致：

- 占用更多磁盘空间；
- 插入变慢；
- 更新变慢；
- 删除变慢；
- 增加维护成本。

标准答案：

> 索引是一种空间换时间的方案，能够提高查询效率，但会占用额外存储，并增加增删改时的维护成本。因此应该根据高频查询模式设计索引，而不是给每个字段都建立索引。

------

# 二十三、结合你的三个项目回答

下面是设计思路。只有项目真实使用或你已经补充实现，才能说成“我实际做过”。

## 万福鉴酒：订单列表慢

面试官问：

> 订单列表接口越来越慢，你怎么处理？

可以回答：

> 我会先通过接口耗时和慢查询日志定位具体 SQL，再使用 EXPLAIN 检查是否全表扫描、扫描行数和排序情况。订单列表通常按 user_id、status 筛选并按 created_at 排序，可以考虑建立 `(user_id, status, created_at)` 联合索引。同时避免 SELECT *，对列表字段做精简，并对深分页使用 lastId 游标分页。

------

## 生猪健康系统：药品搜索慢

面试官问：

> 药品列表搜索慢怎么办？

可以回答：

> 首先区分是分类筛选慢还是关键词模糊搜索慢。分类列表可以围绕 `(category_id, created_at)` 建立联合索引；如果是 `LIKE '%关键词%'`，普通 B+ 树索引帮助有限，数据量较小时可以接受，数据规模扩大后再考虑全文索引或专门搜索服务。同时控制分页大小，避免一次返回大量药品。

------

## TripStar AI：任务历史列表慢

面试官问：

> 用户查看历史生成任务越来越慢怎么办？

可以回答：

> 任务列表通常根据 user_id 筛选，并按 created_at 倒序，因此可以建立 `(user_id, created_at)` 联合索引。如果还经常按照任务状态筛选，可以根据实际查询设计 `(user_id, status, created_at)`。对于无限下拉列表，使用 lastId 或最后创建时间进行游标分页。

------

# 二十四、慢 SQL 优化标准答案

这段是本章最重要的内容，建议完整背下来：

> 遇到慢 SQL，我会先确认是数据库查询慢，而不是网络、后端逻辑或前端渲染问题；然后通过慢查询日志找到具体 SQL，使用 EXPLAIN 查看访问类型、实际索引、预计扫描行数和 Extra 信息。接着检查 WHERE、JOIN、ORDER BY 和 GROUP BY 字段是否有合适索引，是否存在 SELECT *、前置模糊查询、函数计算、隐式类型转换、深分页和 N+1 查询。优化后还要重新测试执行时间和扫描行数，避免只根据理论判断。

------

# 二十五、EXPLAIN 标准答案

> EXPLAIN 用于查看 SQL 的执行计划。我会重点关注 type、possible_keys、key、rows 和 Extra。type 可以判断访问方式，key 表示实际使用的索引，rows 表示预计扫描行数，Extra 中需要关注 Using index、Using filesort 和 Using temporary 等信息。

------

# 二十六、这一章只背这条主线

```text
接口很慢
   ↓
先确认是不是数据库问题
   ↓
找到具体 SQL
   ↓
使用 EXPLAIN
   ↓
看 type、key、rows、Extra
   ↓
检查索引和 SQL 写法
   ↓
检查 SELECT *、函数、模糊搜索、深分页、N+1
   ↓
优化后重新测试
```

------

# 二十七、本章闯关

## 第一题

`EXPLAIN` 中：

```text
type = ALL
rows = 8000000
```

说明什么？

> 可能进行了全表扫描，并预计检查约 800 万行。如果这是一张大表上的高频查询，需要重点优化。

------

## 第二题

`possible_keys` 有值，但 `key` 是 `NULL`，说明什么？

> MySQL 认为存在候选索引，但最终没有选择实际使用这些索引，可能是优化器认为全表扫描成本更低，或者查询写法影响了索引使用。

------

## 第三题

看到 `Using filesort` 是否说明磁盘坏了？

> 不是。它主要表示 MySQL 需要执行额外排序，不能完全直接利用索引顺序，不一定真的使用磁盘文件。

------

## 第四题

为什么 `LIMIT 100000, 10` 可能很慢？

> 因为数据库可能需要先扫描前 100010 条数据，再丢弃前 100000 条。可以考虑基于上一页最后一个 ID 的游标分页。

------

## 第五题

为什么不能每查出一个订单，就单独查询一次用户？

> 这可能产生 N+1 查询，导致数据库请求次数随着订单数量增加。可以使用 JOIN 或批量 IN 查询解决。

------

## 第六题

一条 SQL 加索引后还是很慢，可能有哪些原因？

> 可能返回数据过多、索引区分度低、发生大量回表、存在额外排序或临时表、使用深分页，或者 SQL 本身存在复杂关联和函数计算。

下一章进入 **Redis 第一核心章：五种数据类型、Key 设计、过期时间，以及验证码、登录状态、排行榜和 AI 任务进度分别应该怎么存**。
