---
title: 第六章MySQL + Redis 总纲
slug: di-liu-zhang-mysql-redis-zong-gang
description: 可以。我们把整个课程固定成 11 章，不再无限扩展。
publishDate: '2026-08-02'
category: 后端
tags:
  - React
  - Vue
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
可以。我们把整个课程固定成 **11 章**，不再无限扩展。

你的目标不是成为数据库管理员，而是达到：

> **前端面试能讲清原理、看懂后端代码、能结合项目设计、能扛住两三轮追问。**

你的简历里已经写了“了解 MySQL、Redis”，并且有订单状态、AI 问诊、异步行程生成等项目场景，因此重点要放在**索引、事务、缓存、数据一致性、异步任务和并发控制**。

# MySQL + Redis 一天速成总纲

标记说明：

- **★★★：必须背、必须会讲**
- **★★：需要理解，能回答追问**
- **★：了解即可，不深入**

------

## MySQL 部分：第 1～5 章

### 第一章：MySQL 与 Redis 基础区别 ✅

**★★★ 必须掌握**

- MySQL 是关系型数据库
- Redis 是内存型键值数据库
- MySQL 保存核心业务数据
- Redis 主要负责缓存和临时状态
- 前端不能直接连接数据库
- Node.js、Java 等后端负责操作数据库
- 基础增删改查 SQL

你已经学完。

------

### 第二章：MySQL 索引体系 ✅

**★★★ 必须掌握**

- B+ 树为什么适合数据库
- 聚簇索引
- 二级索引
- 回表
- 覆盖索引
- 联合索引
- 最左前缀原则
- 常见索引失效
- 为什么索引不是越多越好

你已经学完。

------

### 第三章：事务、MVCC 与锁 ✅

**★★★ 必须掌握**

- 事务是什么
- ACID
- 脏读、不可重复读、幻读
- 四种隔离级别
- MVCC
- 快照读与当前读
- 乐观锁与悲观锁
- 如何避免库存超卖
- 如何避免订单状态被错误覆盖

你已经学完。

------

### 第四章：SQL 查询实战 ✅

**★★★ 必须掌握**

- `WHERE`
- `ORDER BY`
- `LIMIT`
- `COUNT`、`SUM`、`AVG`
- `GROUP BY`
- `HAVING`
- `INNER JOIN`
- `LEFT JOIN`
- SQL 逻辑执行顺序
- 深分页与游标分页

你已经学完。

------

### 第五章：慢 SQL 与 EXPLAIN ✅

**★★★ 必须掌握**

- 慢 SQL 排查流程
- `EXPLAIN`
- `type`
- `key`
- `rows`
- `Extra`
- `Using index`
- `Using filesort`
- `Using temporary`
- N+1 查询
- 深分页优化
- 不要无脑 `SELECT *`

你已经学完。

------

# Redis 部分：第 6～10 章

### 第六章：Redis 数据类型与 Key 设计

**★★★ 必须掌握**

- String
- Hash
- List
- Set
- ZSet
- Key 命名规范
- 过期时间 TTL
- 验证码、登录状态、排行榜、点赞、AI 任务进度怎么存

这是我们现在学习的内容。

------

### 第七章：Redis 缓存工作流程

**★★★ 必须掌握**

- Cache Aside 旁路缓存
- 缓存命中与缓存未命中
- 查询数据的标准流程
- 更新数据时为什么先更新 MySQL，再删除 Redis
- Redis 和 MySQL 如何保持一致
- 延迟双删了解

------

### 第八章：缓存三大灾难

**★★★ 必须背**

- 缓存穿透
- 缓存击穿
- 缓存雪崩
- 空值缓存
- 布隆过滤器
- 互斥锁
- 随机过期时间
- 热点数据不过期的设计

这是 Redis 面试最高频章节之一。

------

### 第九章：Redis 内存与持久化

**★★ 需要掌握**

- Redis 为什么快
- 过期删除策略
- 内存淘汰策略
- RDB
- AOF
- RDB 与 AOF 区别
- 热 Key
- 大 Key
- Redis 为什么不能完全替代 MySQL

------

### 第十章：Redis 高并发实战

**★★★ 必须掌握**

- `SET NX EX`
- 分布式锁
- 锁为什么必须设置过期时间
- 锁误删问题
- Lua 脚本思想
- 接口幂等
- 防止重复提交
- 接口限流
- Redis 原子操作

------

# 综合面试部分：第 11 章

### 第十一章：结合简历项目综合拷打

**★★★ 必须完成**

我们会围绕你的项目整理：

- 万福鉴酒订单系统如何使用 MySQL 和 Redis
- 生猪健康系统如何缓存药品和疾病数据
- AI 会话记录放 MySQL 还是 Redis
- TripStar AI 任务进度如何保存
- WebSocket 房间映射怎么存
- 如何防止重复创建 AI 任务
- 如何设计订单表、任务表和缓存 Key
- 20 道 MySQL 高频题
- 20 道 Redis 高频题
- 项目追问标准答案

------

# 你的学习进度

```text
MySQL
第 1 章 ✅ 基础
第 2 章 ✅ 索引
第 3 章 ✅ 事务与锁
第 4 章 ✅ SQL 查询
第 5 章 ✅ 慢 SQL

Redis
第 6 章 ▶ 数据类型与 Key 设计
第 7 章 ⏳ 缓存流程与一致性
第 8 章 ⏳ 缓存三大问题
第 9 章 ⏳ 持久化与内存
第 10 章 ⏳ 分布式锁与限流

综合
第 11 章 ⏳ 项目面试拷打
```

现在正式进入第六章。

------

# 第六章：Redis 数据类型与 Key 设计

先把 Redis 想象成一家开在内存里的“高速便利店”。

MySQL 像大型仓库：

> 货物保存可靠，分类完整，可以进行复杂查询，但拿货相对慢一些。

Redis 像便利店：

> 东西不一定适合长期保存，但常用商品摆在手边，拿起来特别快。

今天我们只解决三个问题：

1. Redis 怎么保存数据？
2. 五种数据类型分别用在哪里？
3. Key 应该怎么设计？

------

# 一、Redis 数据是怎么存的？

Redis 最基本的形式是：

```text
Key → Value
```

例如：

```text
user:1001:name → 刘凤伟
```

你可以把 Key 理解成变量名，把 Value 理解成变量值。

JavaScript 中：

```js
// 定义一个变量，用来保存用户姓名
const userName = '刘凤伟';
```

Redis 中：

```redis
# 保存用户 1001 的姓名
SET user:1001:name "刘凤伟"
```

注意：

> 下面 Redis 代码中的 `#` 行是中文讲解，真正执行时只执行没有 `#` 的命令。

------

# 二、String：Redis 最常用的数据类型

String 不只是普通字符串。

它还可以保存：

- 文字
- 数字
- JSON 字符串
- Token
- 验证码
- 计数值
- 临时状态

------

## 场景一：保存手机验证码

```redis
# 保存指定手机号的验证码
SET verify:phone:15118978572 "683921"

# 读取指定手机号的验证码
GET verify:phone:15118978572
```

但是这样有一个严重问题：

> 验证码永不过期。

正确做法是设置过期时间。

```redis
# 保存验证码，并设置 300 秒后自动过期
SET verify:phone:15118978572 "683921" EX 300
```

其中：

```text
EX 300：300 秒后过期
```

也就是五分钟。

------

## 场景二：保存登录 Token

```redis
# 保存用户 1001 的登录 Token，并设置两小时后过期
SET login:token:abc123 "1001" EX 7200
```

这里的含义：

```text
Key：login:token:abc123
Value：用户 ID 1001
过期时间：7200 秒
```

当请求携带 Token 时，后端可以通过 Redis 找到对应用户。

------

## 场景三：统计文章浏览量

```redis
# 将文章 1001 的浏览次数增加一
INCR article:1001:view_count
```

第一次执行：

```text
1
```

再执行一次：

```text
2
```

`INCR` 是原子操作。

意思是：

> 即使很多请求同时增加计数，Redis 也会按照安全的方式执行每次增加。

适合：

- 浏览量
- 点赞数量
- 接口访问次数
- 短时间限流计数
- AI 调用次数

------

## 场景四：保存 JSON

```js
// 定义需要缓存的用户对象
const user = {
  id: 1001, // 用户 ID
  name: '刘凤伟', // 用户姓名
  role: 'student', // 用户角色
};

// 将 JavaScript 对象转换成 JSON 字符串
const userJson = JSON.stringify(user);

// 将 JSON 字符串保存到 Redis，并设置十分钟过期
await redisClient.set('user:1001', userJson, {
  EX: 600, // 600 秒后缓存自动失效
});
```

读取：

```js
// 从 Redis 中读取用户 JSON 字符串
const userJson = await redisClient.get('user:1001');

// 如果缓存存在，就将 JSON 字符串转换回 JavaScript 对象
const user = userJson ? JSON.parse(userJson) : null;
```

------

## String 背诵答案

> String 是 Redis 最基础、最常用的数据类型，可以保存字符串、数字和序列化后的 JSON，常用于缓存对象、验证码、Token、计数器和分布式锁。

------

# 三、Hash：保存一个对象的多个字段

Hash 很像 JavaScript 对象。

JavaScript：

```js
// 定义一个用户对象
const user = {
  name: '刘凤伟', // 用户姓名
  age: 22, // 用户年龄
  role: 'student', // 用户角色
};
```

Redis Hash：

```redis
# 为用户 1001 保存姓名字段
HSET user:1001 name "刘凤伟"

# 为用户 1001 保存年龄字段
HSET user:1001 age "22"

# 为用户 1001 保存角色字段
HSET user:1001 role "student"
```

也可以一次设置多个字段：

```redis
# 一次性保存用户 1001 的多个属性
HSET user:1001 name "刘凤伟" age "22" role "student"
```

------

## 查询单个字段

```redis
# 查询用户 1001 的姓名
HGET user:1001 name
```

## 查询全部字段

```redis
# 查询用户 1001 的全部属性
HGETALL user:1001
```

## 修改某个字段

```redis
# 将用户 1001 的角色修改为前端开发者
HSET user:1001 role "frontend-developer"
```

------

## Hash 适合什么场景？

适合保存：

- 用户基本信息
- 商品简单信息
- 任务进度
- 配置对象
- 购物车商品数量

例如 TripStar AI 任务：

```redis
# 保存 AI 行程生成任务的多个状态字段
HSET trip:task:3001 status "generating" progress "60" destination "东京"

# 查询任务当前生成进度
HGET trip:task:3001 progress
```

这比把所有字段拼成一个大字符串更加方便修改。

------

## String JSON 和 Hash 怎么选？

### 使用 String JSON

```text
整个对象经常一起读取
对象修改频率不高
希望代码处理简单
```

### 使用 Hash

```text
经常单独修改某一个字段
需要只读取对象的部分字段
字段结构相对稳定
```

面试回答：

> 如果对象通常整体读写，可以序列化为 JSON 存入 String；如果需要频繁单独修改某些字段，可以使用 Hash。但最终还要结合数据大小、访问方式和维护成本选择。

------

# 四、List：有顺序、允许重复

List 可以理解成一个双端队列。

它的特点：

- 有顺序
- 可以重复
- 可以从左边加入
- 可以从右边加入
- 可以从两端取出

------

## 从左边加入消息

```redis
# 将第一条消息添加到列表左边
LPUSH message:list "第一条消息"

# 将第二条消息添加到列表左边
LPUSH message:list "第二条消息"
```

列表现在大概是：

```text
第二条消息
第一条消息
```

因为新消息从左边进入。

------

## 从右边取出消息

```redis
# 从列表右边取出并删除一条消息
RPOP message:list
```

这样可以形成：

```text
左边进入 → 右边离开
```

类似简单队列。

------

## 查看列表内容

```redis
# 查看列表中第 0 到第 9 个元素
LRANGE message:list 0 9
```

Redis 下标：

```text
0：第一个元素
1：第二个元素
-1：最后一个元素
```

------

## List 适合什么？

- 简单消息队列
- 最近浏览记录
- 最新通知列表
- 操作历史
- 简单任务队列

但是必须记住：

> List 可以实现简单队列，但复杂可靠的消息系统通常使用 RabbitMQ、Kafka 等专业消息中间件。

------

## 你的项目场景

例如保存用户最近查看的旅行计划：

```redis
# 将旅行计划 3001 加入用户最近查看列表的左边
LPUSH user:1001:recent_trips "3001"

# 只保留最近十条旅行计划记录
LTRIM user:1001:recent_trips 0 9
```

`LTRIM` 表示截断列表，只保留指定范围。

------

## List 背诵答案

> List 是有序且允许重复的字符串列表，支持从两端添加和取出元素，适合最近记录、简单消息队列和时间顺序列表。

------

# 五、Set：自动去重的集合

Set 的特点：

- 无序
- 元素不能重复
- 支持集合运算

JavaScript 中也有 Set：

```js
// 创建一个不允许出现重复值的集合
const userSet = new Set();

// 添加用户 1001
userSet.add(1001);

// 再次添加用户 1001，不会产生重复元素
userSet.add(1001);
```

Redis Set 也是类似的。

------

## 保存点赞用户

```redis
# 用户 1001 点赞文章 2001
SADD article:2001:liked_users "1001"

# 用户 1002 点赞文章 2001
SADD article:2001:liked_users "1002"

# 用户 1001 再次点赞，不会重复添加
SADD article:2001:liked_users "1001"
```

------

## 判断用户是否点赞

```redis
# 判断用户 1001 是否点赞了文章 2001
SISMEMBER article:2001:liked_users "1001"
```

结果：

```text
1：存在，说明已经点赞
0：不存在，说明没有点赞
```

------

## 取消点赞

```redis
# 从文章点赞集合中移除用户 1001
SREM article:2001:liked_users "1001"
```

------

## 统计点赞人数

```redis
# 统计文章 2001 的点赞用户数量
SCARD article:2001:liked_users
```

------

## Set 的集合运算

假设：

```text
用户 A 关注：Vue、React、Node.js
用户 B 关注：React、Node.js、Redis
```

共同关注就是：

```text
React、Node.js
```

Redis 可以求交集：

```redis
# 查询用户 1001 和用户 1002 的共同关注对象
SINTER user:1001:follows user:1002:follows
```

------

## Set 适合什么？

- 点赞用户
- 收藏用户
- 标签去重
- 共同好友
- 共同关注
- 抽奖参与者
- 已经处理过的任务 ID

------

## Set 背诵答案

> Set 是无序且元素不重复的集合，适合数据去重、点赞关系、标签、共同关注和集合运算。

------

# 六、ZSet：会自动排名的 Set

ZSet 全称：

> Sorted Set，有序集合。

它与 Set 的相同点：

- 成员不能重复。

它比 Set 多了一个：

> score，分数。

Redis 会根据 score 自动排序。

------

## 添加排行榜数据

```redis
# 将用户 1001 添加到积分排行榜，分数为 98
ZADD user:ranking 98 "1001"

# 将用户 1002 添加到积分排行榜，分数为 88
ZADD user:ranking 88 "1002"

# 将用户 1003 添加到积分排行榜，分数为 100
ZADD user:ranking 100 "1003"
```

------

## 查询积分最高的前十名

```redis
# 按照分数从高到低查询排行榜前十名，并返回分数
ZREVRANGE user:ranking 0 9 WITHSCORES
```

其中：

```text
ZREV：倒序，也就是从高到低
RANGE：查询一个范围
WITHSCORES：同时返回分数
```

------

## 增加用户积分

```redis
# 将用户 1001 的排行榜积分增加五分
ZINCRBY user:ranking 5 "1001"
```

------

## 查询用户排名

```redis
# 查询用户 1001 从高到低的排名位置
ZREVRANK user:ranking "1001"
```

Redis 排名从 `0` 开始：

```text
返回 0：第一名
返回 1：第二名
```

页面展示时通常加一。

------

## ZSet 适合什么？

- 积分排行榜
- 热门文章排行
- 销量排行
- 游戏排名
- 按时间执行的延迟任务
- 按权重排序的推荐内容

------

## 结合生猪健康系统

例如药品热度排行：

```redis
# 将药品 5001 的访问热度增加一分
ZINCRBY medicine:hot_ranking 1 "5001"

# 查询热度最高的十种药品
ZREVRANGE medicine:hot_ranking 0 9 WITHSCORES
```

------

## ZSet 背诵答案

> ZSet 是带分数的有序集合，成员不能重复，Redis 会按照 score 排序，适合排行榜、热度排序和延迟任务。

------

# 七、五种数据类型一句话记忆

```text
String：一个 Key 对应一个值
Hash：一个 Key 对应一个对象
List：有顺序、可重复
Set：无顺序、自动去重
ZSet：自动去重，还能按照分数排序
```

面试口诀：

> **String 缓存计数，Hash 保存对象，List 保存队列，Set 负责去重，ZSet 负责排名。**

这句话必须背。

------

# 八、Redis Key 应该怎么命名？

很多初学者会这样命名：

```redis
# 不推荐：Key 含义不清楚
SET data "刘凤伟"

# 不推荐：不知道这个数字表示什么
SET 1001 "刘凤伟"
```

看到 `data`，你完全不知道是什么数据。

推荐使用：

```text
业务名:对象类型:对象ID:属性
```

例如：

```text
user:1001:name
order:2001:status
medicine:5001:detail
trip:task:3001:progress
verify:phone:15118978572
```

冒号只是命名约定，让层级更清楚。

------

## 项目 Key 设计示例

### 用户信息

```text
user:1001
```

### 手机验证码

```text
verify:phone:15118978572
```

### 药品详情缓存

```text
medicine:detail:5001
```

### 订单防重复提交

```text
order:submit:user:1001
```

### AI 任务进度

```text
trip:task:3001
```

### 用户最近旅行计划

```text
user:1001:recent_trips
```

### 药品热度排行榜

```text
medicine:hot_ranking
```

------

## Key 命名原则

必须记住四点：

1. **看到 Key 就知道它是什么。**
2. **使用冒号划分层级。**
3. **不要使用过长的 Key。**
4. **不要随意使用中文和空格。**

面试回答：

> Redis Key 应该具有清晰的业务含义，通常按照“业务模块、对象类型、对象 ID、属性”的方式使用冒号分隔。同时避免 Key 过长、含义模糊或命名冲突。

------

# 九、TTL：Redis 数据的寿命

TTL 表示：

> Time To Live，剩余生存时间。

查询一个 Key 还能存活多久：

```redis
# 查询验证码 Key 还剩多少秒过期
TTL verify:phone:15118978572
```

可能返回：

```text
120：还剩 120 秒
-1：Key 存在，但是没有设置过期时间
-2：Key 不存在
```

------

## 给现有 Key 设置过期时间

```redis
# 设置用户登录信息在 3600 秒后过期
EXPIRE login:user:1001 3600
```

------

## 删除过期时间

```redis
# 移除 Key 的过期时间，使其长期存在
PERSIST login:user:1001
```

一般登录信息不应该随便变成永久存在。

------

# 十、哪些数据必须设置过期时间？

通常需要过期：

- 验证码
- 登录状态
- 接口限流计数
- 临时缓存
- AI 任务进度
- 防重复提交 Key
- 分布式锁
- 临时 WebSocket 房间映射

例如：

```redis
# 保存 AI 任务进度，并设置一小时后自动清理
SET trip:task:3001:progress "60" EX 3600
```

------

## 哪些数据可以不设置过期？

例如：

- 长期排行榜
- 某些系统配置
- 需要主动维护的集合

但不能因为“可以”就永远不清理。

Redis 内存有限，Key 太多最终会占满内存。

------

# 十一、为什么不能所有缓存同时过期？

假设十万个商品缓存都设置：

```text
每天凌晨 00:00 过期
```

凌晨一到：

```text
十万个缓存同时消失
         ↓
大量请求全部访问 MySQL
         ↓
数据库压力突然暴涨
```

这可能造成缓存雪崩。

更合理的方式：

```text
基础过期时间 + 随机时间
```

Node.js 示例：

```js
// 设置基础过期时间为十分钟
const baseExpireSeconds = 600;

// 生成零到五分钟之间的随机过期时间
const randomExpireSeconds = Math.floor(Math.random() * 300);

// 计算最终缓存过期时间
const expireSeconds = baseExpireSeconds + randomExpireSeconds;

// 将商品详情写入 Redis，并设置随机过期时间
await redisClient.set(
  'medicine:detail:5001', // 药品详情缓存 Key
  JSON.stringify(medicine), // 将药品对象转换成 JSON 字符串
  {
    EX: expireSeconds, // 避免大量缓存同时过期
  },
);
```

缓存雪崩会在第八章详细讲，现在先知道：

> 缓存过期时间最好根据业务设置，并适当增加随机值，避免大量 Key 同时失效。

------

# 十二、前端常见项目应该怎么选类型？

## 1. 手机验证码

选择：

```text
String + 过期时间
# 保存手机验证码，并设置五分钟后过期
SET verify:phone:15118978572 "683921" EX 300
```

------

## 2. 用户登录状态

选择：

```text
String 或 Hash + 过期时间
# 保存 Token 对应的用户 ID，并设置两小时过期
SET login:token:abc123 "1001" EX 7200
```

------

## 3. AI 任务进度

选择：

```text
Hash + 过期时间
# 保存 AI 行程任务的状态和进度
HSET trip:task:3001 status "generating" progress "60"

# 设置任务信息在一小时后过期
EXPIRE trip:task:3001 3600
```

------

## 4. 文章点赞用户

选择：

```text
Set
# 将用户 1001 加入文章 2001 的点赞集合
SADD article:2001:liked_users "1001"
```

------

## 5. 最近访问记录

选择：

```text
List
# 将行程计划 3001 加入用户最近访问列表
LPUSH user:1001:recent_trips "3001"

# 只保留最近十条访问记录
LTRIM user:1001:recent_trips 0 9
```

------

## 6. 热门药品排行

选择：

```text
ZSet
# 将药品 5001 的热度增加一分
ZINCRBY medicine:hot_ranking 1 "5001"
```

------

# 十三、Redis 数据一定要和 MySQL 重复保存吗？

不一定。

Redis 中的数据可以分为两类。

## 第一类：MySQL 数据的缓存副本

例如：

```text
MySQL：药品完整信息
Redis：热门药品详情缓存
```

Redis 丢失以后，可以重新从 MySQL 查询并恢复。

------

## 第二类：临时业务数据

例如：

```text
验证码
接口限流次数
AI 任务临时进度
短期登录状态
分布式锁
```

这些数据可能本来就不需要长期保存到 MySQL。

------

## 标准答案

> Redis 中的数据不一定都来自 MySQL。热点商品详情等数据属于 MySQL 数据的缓存副本；验证码、限流计数和分布式锁等属于临时业务数据，可以只存在 Redis。是否写入 MySQL，要根据数据是否需要长期保存和审计决定。

------

# 十四、结合你的项目回答

以下是合理设计，不要把没有实际实现的部分说成已经上线。

## 万福鉴酒

可以使用：

```text
String：短信验证码、Token、防重复提交
Hash：临时订单状态
Set：点赞或收藏用户
ZSet：热门商品排行榜
```

面试可以说：

> 如果为鉴酒业务设计 Redis，我会把验证码和登录状态放 String，把热门商品或订单详情作为缓存，把点赞用户放 Set，把热门鉴酒商品排行放 ZSet。订单核心数据仍然存入 MySQL。

------

## 生猪健康系统

可以使用：

```text
String：药品详情 JSON 缓存
Hash：AI 问诊任务进度
ZSet：热门药品和热门文章
Set：用户收藏的药品
```

------

## TripStar AI

可以使用：

```text
Hash：任务状态和进度
String：WebSocket 房间映射
List：最近旅行计划
ZSet：热门目的地排行
```

例如：

```redis
# 保存任务状态和当前生成进度
HSET trip:task:3001 status "generating" progress "60"

# 保存任务对应的 WebSocket 房间编号
SET trip:task:3001:room "room_abc123" EX 3600
```

------

# 十五、本章必须背下来的内容

## 1. Redis 有哪五种基础数据类型？

> Redis 五种基础数据类型是 String、Hash、List、Set 和 ZSet。String 常用于缓存、计数和验证码；Hash 用于保存对象字段；List 用于有序列表和简单队列；Set 用于去重和集合运算；ZSet 用于排行榜和按分数排序。

## 2. String 和 Hash 怎么选择？

> 对象经常整体读写时，可以序列化成 JSON 存入 String；如果需要频繁读取或修改对象的部分字段，可以考虑使用 Hash。

## 3. Set 和 ZSet 有什么区别？

> Set 是无序且不重复的集合；ZSet 同样不允许成员重复，但每个成员具有 score，Redis 会根据 score 进行排序。

## 4. Redis Key 怎么设计？

> Redis Key 应该具有明确的业务含义，通常使用冒号按业务模块、对象、ID 和属性划分层级，同时避免 Key 过长和命名冲突。

## 5. 为什么要设置过期时间？

> Redis 内存有限，验证码、登录状态、缓存和临时任务状态应该设置合理的过期时间，避免无用数据长期占用内存。

------

# 十六、只看这一张记忆卡

```text
Redis = 高速内存仓库

String
缓存、验证码、Token、计数

Hash
用户对象、任务状态、购物车

List
最近记录、简单队列

Set
点赞、去重、共同关注

ZSet
排行榜、热门数据、延迟任务

TTL
控制数据什么时候自动消失
```

------

# 十七、本章闯关题

## 第 1 题

保存五分钟验证码，使用什么类型？

答案：

> String，并设置 300 秒过期时间。

```redis
# 保存验证码，并设置五分钟过期
SET verify:phone:15118978572 "683921" EX 300
```

------

## 第 2 题

保存 AI 任务的状态、进度和目的地，选择什么？

答案：

> Hash，因为需要分别读取和修改多个字段。

------

## 第 3 题

保存文章的点赞用户，要求不能重复，选择什么？

答案：

> Set。

------

## 第 4 题

实现药品热度排行榜，选择什么？

答案：

> ZSet，通过 score 保存热度分数。

------

## 第 5 题

为什么验证码不能只执行普通 `SET`？

答案：

> 因为验证码需要自动失效。如果不设置过期时间，验证码可能长期存在，既占用内存，也存在安全风险。

------

## 第 6 题

Redis 能否代替 MySQL 保存订单？

答案：

> 通常不能。订单属于需要长期持久化、事务一致性和复杂查询的核心业务数据，应该存入 MySQL；Redis 主要保存订单缓存、临时状态和防重复提交信息。

下一章学习 **Redis 的真实缓存流程和 MySQL 数据一致性**：用户修改昵称以后，MySQL 已经是新名字，但 Redis 还是旧名字，到底应该先删缓存还是先更新数据库。
