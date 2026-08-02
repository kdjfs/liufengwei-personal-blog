---
title: 第一章MySQL和redis的介绍
slug: di-yi-zhang-mysql-he-redis-de-jie-shao
description: 可以。你的目标不是一天成为后端工程师或 DBA，而是达到下面这个标准：
publishDate: '2026-08-02'
category: 后端
tags:
  - JavaScript
  - Node.js
  - MySQL
  - Redis
  - 算法
  - AI
cover: auto
draft: false
featured: false
toc: true
---
可以。你的目标不是一天成为后端工程师或 DBA，而是达到下面这个标准：

> **看得懂常见 SQL 和 Redis 代码，知道项目中为什么使用它们，能回答前端面试中的高频问题，并且经得住两三层追问。**

从你的简历看，你写了“熟悉 Node.js（Express），了解 MySQL、Redis、Spring Boot”，同时项目包含订单状态流转、AI 问诊、长对话、旅行任务进度等业务。面试官很可能会顺着这些内容追问：数据如何存储、为什么用 Redis、缓存如何保证一致性、订单并发怎么处理。

一天不可能真正精通 MySQL 和 Redis，但足以把你训练到**前端实习面试可讲、项目设计可解释、常见追问不露怯**的水平。

------

# 一、你一天内必须达到的水平

学完后，你至少要能回答：

### MySQL

1. MySQL 是什么，关系型数据库是什么意思？
2. 一条 SQL 查询是怎么执行的？
3. `WHERE`、`GROUP BY`、`HAVING`、`ORDER BY` 的区别。
4. `INNER JOIN`、`LEFT JOIN` 的区别。
5. 什么是主键、唯一索引、普通索引、联合索引？
6. 为什么 MySQL 索引使用 B+ 树？
7. 什么情况下索引失效？
8. 什么是最左前缀原则？
9. 什么是覆盖索引、回表？
10. 事务的 ACID 是什么？
11. MySQL 四种隔离级别是什么？
12. 什么是脏读、不可重复读、幻读？
13. MVCC 是什么？
14. 如何定位和优化慢 SQL？
15. 项目中订单状态更新如何避免数据不一致？

### Redis

1. Redis 是什么，为什么比 MySQL 快？
2. Redis 和 MySQL 有什么区别？
3. Redis 五种基础数据类型及使用场景。
4. Redis 如何实现缓存？
5. 什么是缓存穿透、缓存击穿、缓存雪崩？
6. 如何保证 MySQL 和 Redis 的数据一致性？
7. Redis 的过期删除和内存淘汰策略。
8. RDB 和 AOF 的区别。
9. Redis 如何实现分布式锁？
10. 什么是热 Key、大 Key？
11. Redis 能不能完全代替 MySQL？
12. Redis 在你的 AI、订单和旅行项目中可以怎么用？

------

# 二、一天学习顺序

不要平均用力，按面试频率学习。

## 第一阶段：MySQL 基础和 SQL

掌握：

- 数据库、表、行、列
- 主键、外键
- 增删改查
- 条件查询
- 排序、分页、分组
- 多表连接
- 常见聚合函数

## 第二阶段：MySQL 索引和性能优化

这是面试重点：

- B+ 树
- 聚簇索引和二级索引
- 回表
- 覆盖索引
- 联合索引
- 最左前缀
- 索引失效
- `EXPLAIN`
- 慢 SQL 优化

## 第三阶段：事务、MVCC 和锁

这是区分“只会写 SQL”和“真正懂数据库”的部分：

- ACID
- 隔离级别
- 脏读、不可重复读、幻读
- MVCC
- 行锁、表锁
- 乐观锁、悲观锁
- 订单并发修改

## 第四阶段：Redis 数据类型

重点掌握：

- String
- Hash
- List
- Set
- ZSet

了解：

- Bitmap
- HyperLogLog
- Stream

## 第五阶段：缓存和高频面试题

重点：

- Cache Aside
- 缓存穿透
- 缓存击穿
- 缓存雪崩
- 数据一致性
- 分布式锁
- 过期策略
- 淘汰策略
- RDB、AOF

## 第六阶段：结合简历项目模拟拷打

把知识落在：

- 万福鉴酒的订单系统
- 生猪健康系统的药品、疾病和 AI 问诊
- TripStar AI 的异步任务和进度
- Node.js Express 接口

------

# 三、第一课：先彻底区分 MySQL 和 Redis

这是后面所有知识的基础。

## 1. MySQL 是什么

MySQL 是一种**关系型数据库**。

它适合存储：

- 用户信息
- 商品信息
- 订单
- 支付记录
- 药品和疾病信息
- 行程计划
- 问诊记录

这些数据通常需要：

- 长期保存
- 支持复杂查询
- 保证数据一致性
- 支持事务
- 建立表与表之间的关系

例如万福鉴酒项目可以设计：

```text
用户表 users
订单表 orders
订单明细表 order_items
鉴定记录表 appraisal_records
退款记录表 refund_records
```

一个用户可以有多个订单，一个订单可以有多条鉴定记录，这就是关系型数据。

------

## 2. Redis 是什么

Redis 是一个基于内存的高性能键值数据库。

它通常用于：

- 缓存热点数据
- 登录状态
- 验证码
- 接口限流
- 排行榜
- 分布式锁
- 临时任务进度
- 消息发布订阅
- Token 黑名单

Redis 的数据主要存放在内存中，所以读取速度通常远快于需要访问磁盘的数据库。

例如：

```text
medicine:1001
```

对应：

```json
{
  "name": "阿莫西林",
  "category": "抗生素",
  "stock": 200
}
```

查询药品时，先从 Redis 获取；Redis 没有，再查询 MySQL，并把结果写入 Redis。

------

## 3. MySQL 和 Redis 的核心区别

| 对比项           | MySQL        | Redis                         |
| ---------------- | ------------ | ----------------------------- |
| 定位             | 关系型数据库 | 内存型键值数据库              |
| 主要存储位置     | 磁盘         | 内存                          |
| 数据结构         | 表、行、列   | String、Hash、List、Set、ZSet |
| 查询能力         | 支持复杂 SQL | 主要根据 Key 访问             |
| 事务能力         | 强           | 相对有限                      |
| 持久化           | 核心能力     | 支持，但不是其最大优势        |
| 典型用途         | 核心业务数据 | 缓存、临时状态、高并发        |
| 能否作为主数据库 | 可以         | 一般不建议用于核心关系数据    |

面试标准回答：

> MySQL 是关系型数据库，适合存储需要长期保存、支持复杂关系查询和事务一致性的核心业务数据。Redis 是基于内存的键值数据库，访问速度快，适合缓存、登录状态、验证码、限流和排行榜等场景。在实际项目中，通常使用 MySQL 保存真实数据，Redis 用于提升访问性能和处理临时状态，而不是简单地二选一。

------

# 四、MySQL 最基础的表结构

以订单系统为例：

```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(64) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  status TINYINT NOT NULL DEFAULT 0,
  amount DECIMAL(10, 2) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_user_status (user_id, status),
  INDEX idx_created_at (created_at)
);
```

你需要认识：

### `PRIMARY KEY`

主键，唯一标识一条记录。

```sql
id BIGINT PRIMARY KEY
```

主键不能重复，也不能为 `NULL`。

### `AUTO_INCREMENT`

自增，每插入一条数据，ID 自动增加。

### `NOT NULL`

字段不能为空。

### `UNIQUE`

字段值不能重复。

订单号通常需要唯一：

```sql
order_no VARCHAR(64) UNIQUE
```

### `DECIMAL`

保存金额应该使用 `DECIMAL`，不要使用 `FLOAT` 或 `DOUBLE`。

因为浮点数存在精度问题：

```sql
amount DECIMAL(10, 2)
```

表示最多十位数字，其中两位小数。

------

# 五、必须掌握的 SQL

## 1. 新增

```sql
INSERT INTO orders (
  order_no,
  user_id,
  status,
  amount,
  created_at,
  updated_at
)
VALUES (
  'ORDER20260730001',
  1001,
  0,
  299.00,
  NOW(),
  NOW()
);
```

## 2. 查询

```sql
SELECT *
FROM orders
WHERE user_id = 1001;
```

生产中不建议长期使用：

```sql
SELECT *
```

更推荐明确指定字段：

```sql
SELECT id, order_no, status, amount
FROM orders
WHERE user_id = 1001;
```

原因是：

- 减少网络传输
- 减少不必要字段读取
- 更容易使用覆盖索引
- 避免表结构变化影响代码

## 3. 修改

```sql
UPDATE orders
SET status = 1,
    updated_at = NOW()
WHERE id = 10001;
```

必须特别注意 `WHERE`。

没有 `WHERE`：

```sql
UPDATE orders SET status = 1;
```

会修改整张表。

## 4. 删除

```sql
DELETE FROM orders
WHERE id = 10001;
```

实际企业项目中，很多数据不会物理删除，而是使用逻辑删除：

```sql
UPDATE orders
SET deleted = 1
WHERE id = 10001;
```

因为订单、支付、日志等数据通常需要追溯。

------

# 六、条件查询和分页

## 条件查询

```sql
SELECT id, order_no, status
FROM orders
WHERE user_id = 1001
  AND status = 1;
```

## 模糊查询

```sql
SELECT id, order_no
FROM orders
WHERE order_no LIKE 'ORDER2026%';
```

注意：

```sql
LIKE 'ORDER%'
```

通常可以利用索引。

但：

```sql
LIKE '%ORDER%'
```

因为前面存在通配符，普通 B+ 树索引通常难以有效使用。

## 排序

```sql
SELECT id, order_no, created_at
FROM orders
WHERE user_id = 1001
ORDER BY created_at DESC;
```

## 分页

```sql
SELECT id, order_no, created_at
FROM orders
ORDER BY id DESC
LIMIT 10 OFFSET 20;
```

等价于：

```sql
LIMIT 20, 10
```

表示跳过 20 条，再取 10 条。

深分页存在性能问题：

```sql
LIMIT 100000, 10
```

数据库需要先扫描或定位大量记录，再丢弃前面的数据。

优化思路是使用上一页最后一个 ID：

```sql
SELECT id, order_no, created_at
FROM orders
WHERE id < 88888
ORDER BY id DESC
LIMIT 10;
```

这叫游标分页或基于索引的分页。

你的前端回答可以这样说：

> 普通后台管理列表页可以使用 pageIndex 和 pageSize，但对于数据量很大的信息流或日志列表，深分页性能较差，可以改为基于上一页最后一条记录 ID 的游标分页。前端保存 lastId，下一页请求时传给后端。

------

# 七、多表连接

假设有用户表：

```text
users
- id
- username
```

订单表：

```text
orders
- id
- user_id
- order_no
```

## INNER JOIN

只返回两张表都能匹配的数据：

```sql
SELECT
  o.order_no,
  o.amount,
  u.username
FROM orders o
INNER JOIN users u
  ON o.user_id = u.id;
```

## LEFT JOIN

返回左表所有数据，即使右表匹配不到：

```sql
SELECT
  o.order_no,
  o.amount,
  u.username
FROM orders o
LEFT JOIN users u
  ON o.user_id = u.id;
```

面试标准回答：

> `INNER JOIN` 只返回两张表能够匹配上的记录；`LEFT JOIN` 会保留左表全部记录，右表匹配不到时对应字段为 `NULL`。例如查询全部订单，即使部分用户信息已经不存在，也要展示订单，这时更适合使用 `LEFT JOIN`。

------

# 八、Redis 五种基础类型

## 1. String

最常用，可以保存字符串、数字、JSON。

适合：

- 验证码
- Token
- 缓存 JSON
- 计数器
- 接口限流

```redis
SET user:1001:name "刘凤伟"
GET user:1001:name
```

设置过期时间：

```redis
SET verify:phone:15118978572 "683921" EX 300
```

五分钟后自动过期。

计数：

```redis
INCR article:1001:view
```

## 2. Hash

类似 JavaScript 对象。

```redis
HSET user:1001 name "刘凤伟" age 22
HGET user:1001 name
HGETALL user:1001
```

适合存储：

- 用户信息
- 商品信息
- 配置信息

## 3. List

有序、允许重复，类似数组或双端队列。

```redis
LPUSH message:list "message1"
LPUSH message:list "message2"
RPOP message:list
```

适合：

- 简单消息队列
- 最新消息列表
- 操作记录

但复杂可靠消息系统更适合 Kafka、RabbitMQ 等专业消息队列。

## 4. Set

无序、不允许重复。

```redis
SADD article:1001:likes user1
SADD article:1001:likes user2
SISMEMBER article:1001:likes user1
```

适合：

- 点赞用户集合
- 标签
- 共同关注
- 数据去重

## 5. ZSet

有序集合，每个成员对应一个分数。

```redis
ZADD ranking 98 user1
ZADD ranking 88 user2
ZREVRANGE ranking 0 9 WITHSCORES
```

适合：

- 排行榜
- 热门文章
- 用户积分
- 延迟任务

面试口诀：

> String 做缓存和计数，Hash 存对象，List 做队列，Set 做去重和集合运算，ZSet 做排行榜和按分数排序。

------

# 九、结合你的简历，MySQL 和 Redis 应该怎么讲

注意：下面是**合理的设计思路**。只有项目真实实现或你已经补充实现后，才能说成“我做过”，否则应该表达为“如果让我设计，我会这样处理”。

## 1. 万福鉴酒订单系统

### MySQL 保存

- 用户信息
- 订单主表
- 鉴定明细
- 退款记录
- 订单状态变更记录

因为这些数据需要长期保存，并且订单与用户、鉴定记录之间存在明确关系。

### Redis 可以用于

- 短信验证码
- 用户登录状态
- 热门鉴酒商品缓存
- 防止重复提交订单
- 订单接口限流
- 分布式锁

面试回答：

> 订单核心数据必须落 MySQL，因为订单创建、状态变更和退款涉及事务一致性。Redis 更适合保存验证码、登录状态和热点商品缓存。对于用户连续点击提交订单的问题，可以使用前端按钮防抖配合后端幂等 Key，Redis 中通过 `SET NX EX` 防止短时间重复提交。

------

## 2. 生猪健康管理系统

### MySQL 保存

- 药品信息
- 疾病信息
- 文章信息
- 用户问诊记录
- AI 对话记录
- 养殖场和生猪健康数据

### Redis 可以用于

- 热门药品和疾病缓存
- AI 会话临时上下文
- 接口调用次数限制
- Token 黑名单
- AI 流式任务状态

面试回答：

> 药品和疾病详情属于读多写少的数据，可以放入 Redis 缓存，减少 MySQL 查询压力。用户查询时先读取 Redis，缓存未命中再查询 MySQL，并设置合理过期时间。AI 对话的长期记录仍存 MySQL，短期上下文或生成中的任务状态可以放 Redis。

------

## 3. TripStar AI

### MySQL 保存

- 用户
- 旅行计划
- 每日行程
- 景点
- 酒店
- 预算明细
- 历史生成记录

### Redis 可以用于

- AI 生成任务状态
- WebSocket 房间映射
- 生成进度
- 临时结果
- 接口限流
- 防重复创建任务

例如：

```text
trip:task:1001:status = generating
trip:task:1001:progress = 60
```

设置一小时过期：

```redis
SET trip:task:1001:status "generating" EX 3600
```

面试回答：

> AI 行程生成属于异步长任务，可以将任务进度和临时状态放 Redis，前端通过 WebSocket 或轮询获得进度。最终生成完成后，将正式行程写入 MySQL。这样既保证了最终数据可持久化，也能利用 Redis 高频读写的优势。

------

# 十、今天不要深入学习的内容

下面只需知道名字，不要浪费一天时间钻研：

- MySQL 主从复制详细原理
- 分库分表中间件
- MySQL 源码
- redo log、undo log、binlog 每个字节的格式
- Redis Cluster 槽迁移细节
- 哨兵选举算法源码
- Redlock 算法证明
- 存储过程和触发器
- 数据库内核调优

你的重点是：

> SQL、索引、事务、MVCC、Redis 数据类型、缓存问题、一致性、分布式锁、项目场景。

------

# 十一、你现在先背下来的第一组标准答案

## MySQL 和 Redis 为什么经常一起使用？

> MySQL 负责保存核心业务数据，支持关系查询、事务和持久化；Redis 基于内存，读取速度快，负责缓存热点数据、临时状态和高并发场景。两者组合可以兼顾数据可靠性和访问性能。

## Redis 为什么快？

> Redis 的主要数据存储在内存中，避免了大量磁盘随机 IO；同时其核心命令执行模型简单，数据结构经过专门优化。Redis 还采用事件驱动和 IO 多路复用处理大量连接。需要注意，Redis 不是因为“完全只有单线程”才快，新版本在网络 IO 等环节也引入了多线程，但命令执行仍主要保持顺序性。

## Redis 能完全替代 MySQL 吗？

> 通常不能。Redis 擅长高性能键值访问，但不擅长复杂关系查询和强事务业务，而且内存成本较高。订单、支付、用户等核心数据通常保存在 MySQL，Redis 主要作为缓存和辅助存储。

## 前端为什么要学习 MySQL 和 Redis？

> 前端虽然不一定直接维护数据库，但需要理解接口数据来源、分页和搜索性能、缓存导致的数据延迟、重复提交、登录状态和异步任务进度。掌握数据库基础后，能够更合理地设计请求参数、状态管理和异常处理，也能更好地与后端协作。

下一轮直接进入最重要的 **MySQL 索引体系：B+ 树、聚簇索引、回表、覆盖索引、联合索引、最左前缀和索引失效**。
