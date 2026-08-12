---
title: 第七章：Redis 缓存流程与 MySQL 数据一致性
slug: di-qi-zhang-redis-huan-cun-liu-cheng-yu-mysql-shu-ju-yi-zhi-xing
description: 用户已经把昵称从“刘凤伟”改成“前端高手”，MySQL 里是新名字，但 Redis 里还是旧名字。页面到底会显示什么？
publishDate: '2026-08-02'
category: 后端
series: MySQL 与 Redis 前端速成
seriesOrder: 7
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
这一章只围绕一个故事展开：

> 用户已经把昵称从“刘凤伟”改成“前端高手”，MySQL 里是新名字，但 Redis 里还是旧名字。页面到底会显示什么？

这就是 Redis 最核心的问题之一：

> **缓存很快，但缓存和数据库可能不一致。**

你的生猪健康系统有药品、疾病等读多写少的数据，TripStar AI 有任务状态和生成结果，万福鉴酒有订单状态，这些场景都可能涉及缓存设计。

本章你重点掌握五件事：

1. 什么是缓存命中和缓存未命中？
2. 查询数据的标准流程是什么？
3. 修改数据时，为什么通常先更新 MySQL，再删除 Redis？
4. 为什么不推荐直接更新缓存？
5. 如何降低缓存与数据库不一致的风险？

------

# 一、为什么需要缓存？

假设生猪健康系统有一个热门药品详情接口：

```text
GET /api/medicines/5001
```

每天可能被访问十万次。

如果每次都查询 MySQL：

```text
十万个请求
    ↓
十万次查询 MySQL
    ↓
数据库压力变大
```

加入 Redis 后：

```text
第一次请求：查询 MySQL，并写入 Redis
后续请求：直接查询 Redis
```

大部分请求不再访问 MySQL。

你可以把它理解成：

- MySQL 是仓库；
- Redis 是前台货架；
- 热门商品提前摆在货架上；
- 顾客不用每次都跑进仓库。

------

# 二、什么是缓存命中？

后端查询 Redis 时，找到了数据：

```redis
# 从 Redis 中查询药品 5001 的详情缓存
GET medicine:detail:5001
```

返回：

```json
{
  "id": 5001,
  "name": "阿莫西林",
  "price": 39.9
}
```

这叫：

> **缓存命中，Cache Hit。**

此时直接返回给前端，不需要访问 MySQL。

流程：

```text
前端请求
   ↓
查询 Redis
   ↓
Redis 有数据
   ↓
直接返回
```

------

# 三、什么是缓存未命中？

查询 Redis，没有找到数据：

```redis
# 查询药品 5001 的缓存，但这个 Key 不存在
GET medicine:detail:5001
```

Redis 返回空值。

这叫：

> **缓存未命中，Cache Miss。**

后端需要：

1. 查询 MySQL；
2. 把结果写入 Redis；
3. 返回给前端。

流程：

```text
前端请求
   ↓
查询 Redis
   ↓
Redis 没有数据
   ↓
查询 MySQL
   ↓
写入 Redis
   ↓
返回结果
```

------

# 四、最重要的缓存模式：Cache Aside

Cache Aside 中文通常叫：

> **旁路缓存模式。**

它是实际项目中非常常见的缓存使用方式。

“旁路”的意思是：

> 应用程序自己管理 Redis 和 MySQL，而不是让 Redis 自动管理数据库。

后端代码主动决定：

- 什么时候查 Redis；
- 什么时候查 MySQL；
- 什么时候写缓存；
- 什么时候删除缓存。

------

# 五、查询数据的标准流程

以药品详情为例。

## 第一步：先查 Redis

```js
// 定义查询药品详情的方法
async function getMedicineDetail(medicineId) {
  // 根据药品 ID 生成统一的 Redis Key
  const cacheKey = `medicine:detail:${medicineId}`;

  // 优先从 Redis 中读取药品详情缓存
  const cachedMedicine = await redisClient.get(cacheKey);

  // 如果缓存存在，说明缓存命中
  if (cachedMedicine) {
    // 将 JSON 字符串转换成 JavaScript 对象并返回
    return JSON.parse(cachedMedicine);
  }

  // 缓存不存在时，再查询 MySQL
  const [rows] = await pool.execute(
    `
      -- 根据药品主键查询药品详情
      SELECT
        id,           -- 返回药品 ID
        name,         -- 返回药品名称
        price,        -- 返回药品价格
        description   -- 返回药品描述
      FROM medicines
      WHERE id = ?    -- 根据传入的药品 ID 查询
      LIMIT 1         -- 最多只返回一条记录
    `,
    [medicineId], // 将药品 ID 安全地传入 SQL 占位符
  );

  // 获取查询到的第一条药品记录
  const medicine = rows[0];

  // 如果 MySQL 中也不存在该药品，就返回空值
  if (!medicine) {
    return null;
  }

  // 将 MySQL 查询结果写入 Redis，并设置十分钟过期
  await redisClient.set(
    cacheKey, // 药品详情缓存的 Key
    JSON.stringify(medicine), // 将药品对象转换成 JSON 字符串
    {
      EX: 600, // 设置缓存 600 秒后自动失效
    },
  );

  // 将最终药品详情返回给调用方
  return medicine;
}
```

你现在只需要记住：

```text
先查缓存
缓存有：直接返回
缓存没有：查数据库
数据库有：写缓存并返回
```

------

# 六、为什么不能先查 MySQL，再查 Redis？

错误流程：

```text
先查 MySQL
   ↓
再查 Redis
```

既然 MySQL 已经查完了，再查 Redis 就没有意义了。

缓存的目的就是：

> 尽量避免访问较慢、压力更大的数据源。

因此查询时通常是：

> **先 Redis，后 MySQL。**

------

# 七、缓存第一次什么时候产生？

缓存不是一定提前就有。

常见方式叫：

> 懒加载缓存。

第一次有人查询：

```text
Redis 没有
   ↓
查询 MySQL
   ↓
写入 Redis
```

后面再查询：

```text
Redis 有
   ↓
直接返回
```

因此第一次查询可能稍慢，后续查询更快。

这种方式也叫：

> Lazy Loading，懒加载。

------

# 八、现在出现问题了：用户修改数据

假设当前数据是：

```text
MySQL：昵称 = 刘凤伟
Redis：昵称 = 刘凤伟
```

用户把昵称修改成：

```text
前端高手
```

后端更新 MySQL：

```sql
-- 将用户 1001 的昵称修改为“前端高手”
UPDATE users
SET nickname = '前端高手' -- 保存新的用户昵称
WHERE id = 1001;          -- 只修改用户 1001
```

现在：

```text
MySQL：前端高手
Redis：刘凤伟
```

前端下一次查询时，Redis 仍然返回：

```text
刘凤伟
```

这就是：

> **缓存与数据库不一致。**

------

# 九、修改数据时有四种常见选择

我们来逐个判断。

## 方案一：先更新 Redis，再更新 MySQL

流程：

```text
先更新 Redis
   ↓
再更新 MySQL
```

看似合理，实际有风险。

假设：

```text
Redis 更新成功：前端高手
MySQL 更新失败：仍然是刘凤伟
```

最终：

```text
Redis：前端高手
MySQL：刘凤伟
```

缓存与真实数据不一致。

而且 Redis 中的数据通常只是副本，MySQL 才是主要数据源。

所以通常不推荐。

------

# 十、方案二：先更新 MySQL，再更新 Redis

流程：

```text
先更新 MySQL
   ↓
再更新 Redis
```

仍然有问题。

假设：

```text
MySQL 更新成功
Redis 更新失败
```

结果：

```text
MySQL：前端高手
Redis：刘凤伟
```

还是不一致。

此外，直接更新缓存还可能发生并发覆盖问题。

------

# 十一、直接更新缓存为什么容易出问题？

假设两个请求同时更新用户信息。

请求 A：

```text
昵称改成：前端工程师
```

请求 B：

```text
昵称改成：大厂候选人
```

执行顺序可能是：

```text
请求 A 更新 MySQL
请求 B 更新 MySQL
请求 B 更新 Redis
请求 A 最后才更新 Redis
```

最终结果：

```text
MySQL：大厂候选人
Redis：前端工程师
```

旧请求反而最后写入缓存，覆盖了新数据。

这叫：

> 并发写入顺序错乱。

因此很多项目不会在数据库修改后直接更新缓存，而是：

> **删除缓存。**

------

# 十二、为什么删除缓存比更新缓存更合适？

数据库更新成功后，删除缓存：

```text
MySQL：新数据
Redis：缓存不存在
```

下一次查询时：

```text
Redis 未命中
   ↓
查询 MySQL 新数据
   ↓
重新写入 Redis
```

缓存会自然恢复成最新数据。

这符合一个重要原则：

> 缓存是数据库数据的副本，副本失效时可以重新生成。

------

# 十三、推荐流程：先更新 MySQL，再删除 Redis

这就是 Cache Aside 的常见写入流程：

```text
更新 MySQL
   ↓
删除 Redis 缓存
```

Node.js 示例：

```js
// 定义修改用户昵称的方法
async function updateUserNickname(userId, newNickname) {
  // 先更新 MySQL 中的真实用户数据
  await pool.execute(
    `
      -- 修改指定用户的昵称
      UPDATE users
      SET nickname = ? -- 将昵称更新为传入的新昵称
      WHERE id = ?     -- 只修改指定用户
    `,
    [
      newNickname, // 替换第一个问号，传入新昵称
      userId, // 替换第二个问号，传入用户 ID
    ],
  );

  // 根据用户 ID 生成用户缓存 Key
  const cacheKey = `user:detail:${userId}`;

  // 数据库更新成功后，删除旧的 Redis 缓存
  await redisClient.del(cacheKey);

  // 返回修改成功结果
  return {
    success: true, // 表示修改成功
  };
}
```

下一次查询：

```js
// 查询用户详情时，会优先读取 Redis
const cachedUser = await redisClient.get(`user:detail:${userId}`);

// 如果 Redis 缓存不存在，就会重新查询 MySQL
```

------

# 十四、为什么不是先删除缓存，再更新 MySQL？

我们看一个并发故事。

初始数据：

```text
MySQL：刘凤伟
Redis：刘凤伟
```

请求 A 要修改昵称：

```text
前端高手
```

它先删除 Redis。

此时请求 B 正好查询用户：

```text
请求 A：删除缓存
请求 B：发现缓存不存在
请求 B：查询 MySQL，读到旧值“刘凤伟”
请求 B：把“刘凤伟”重新写入 Redis
请求 A：把 MySQL 更新成“前端高手”
```

最终：

```text
MySQL：前端高手
Redis：刘凤伟
```

旧缓存又被写回去了。

因此通常更推荐：

> **先更新数据库，再删除缓存。**

这样发生不一致的时间窗口通常更小。

------

# 十五、先更新数据库，再删除缓存就绝对安全吗？

不绝对。

假设：

```text
MySQL 更新成功
   ↓
删除 Redis 时网络异常
   ↓
Redis 中仍然是旧数据
```

仍然可能出现短暂不一致。

所以必须理解：

> 简单的 Cache Aside 通常追求的是最终一致性，不是绝对强一致性。

------

# 十六、什么是最终一致性？

最终一致性的意思是：

> 数据在短时间内可能不一致，但经过缓存过期、重试或重新加载后，最终会恢复一致。

例如：

```text
16:00:00 MySQL 更新成功
16:00:01 Redis 删除失败
16:10:00 Redis 缓存自动过期
16:10:01 下一次请求重新查询 MySQL
```

最终 Redis 恢复正确数据。

面试时不要说：

> Redis 和 MySQL 可以做到百分之百永远一致。

更专业的说法是：

> 普通缓存方案通常只能尽量降低不一致概率，并通过过期时间、删除重试和消息队列等方式保证最终一致性。

------

# 十七、删除缓存失败怎么办？

可以采用几种补救方式。

## 1. 设置合理过期时间

即使缓存删除失败，过一段时间也会自动失效。

```js
// 将用户详情写入 Redis 缓存
await redisClient.set(
  `user:detail:${userId}`, // 用户详情缓存 Key
  JSON.stringify(user), // 将用户数据转换成 JSON 字符串
  {
    EX: 600, // 缓存十分钟后自动过期
  },
);
```

TTL 是最基本的兜底。

------

## 2. 删除失败后重试

```js
// 定义删除缓存的方法
async function deleteCacheWithRetry(cacheKey) {
  // 最多尝试删除三次
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      // 尝试删除指定缓存
      await redisClient.del(cacheKey);

      // 删除成功后立即结束方法
      return true;
    } catch (error) {
      // 记录本次删除失败的信息
      console.error(`第 ${attempt} 次删除缓存失败`, error);
    }
  }

  // 三次都失败时返回 false
  return false;
}
```

实际企业中通常不会一直在主请求里死循环重试，否则接口会变慢。

可以把失败任务交给消息队列或后台任务处理。

------

## 3. 使用消息队列异步删除

流程：

```text
更新 MySQL
   ↓
发送“删除缓存”消息
   ↓
消费者删除 Redis
   ↓
失败则重试
```

优点：

- 可以重试；
- 与主业务解耦；
- 降低偶发网络问题影响。

但系统复杂度也会提高。

你是前端实习面试，知道思路即可。

------

# 十八、什么是延迟双删？

延迟双删大致是：

```text
删除缓存
   ↓
更新数据库
   ↓
等待一小段时间
   ↓
再次删除缓存
```

第二次删除，是为了清理并发过程中可能重新写入的旧缓存。

伪代码：

```js
// 定义延迟等待方法
function sleep(milliseconds) {
  // 返回一个会在指定时间后完成的 Promise
  return new Promise((resolve) => {
    // 使用定时器等待指定毫秒数
    setTimeout(resolve, milliseconds);
  });
}

// 定义使用延迟双删更新用户昵称的方法
async function updateNicknameWithDoubleDelete(userId, newNickname) {
  // 生成用户详情缓存 Key
  const cacheKey = `user:detail:${userId}`;

  // 第一次删除旧缓存
  await redisClient.del(cacheKey);

  // 更新 MySQL 中的真实昵称
  await pool.execute(
    `
      -- 修改指定用户的昵称
      UPDATE users
      SET nickname = ? -- 设置新的用户昵称
      WHERE id = ?     -- 根据用户 ID 修改
    `,
    [
      newNickname, // 传入新的昵称
      userId, // 传入用户 ID
    ],
  );

  // 等待一段时间，让并发中的旧查询尽量执行完成
  await sleep(500);

  // 第二次删除可能被旧查询重新写入的缓存
  await redisClient.del(cacheKey);
}
```

但是不要神化延迟双删。

它有问题：

- 延迟时间很难准确设置；
- 会增加代码复杂度；
- 请求等待可能变长；
- 仍然不能从数学上保证百分之百一致。

面试回答：

> 延迟双删可以降低并发读取旧数据并重新写入缓存的概率，但延迟时间难以精确设置，通常还需要结合过期时间、重试机制或消息队列保证最终一致性。

------

# 十九、是不是所有数据都应该缓存？

不是。

适合缓存的数据通常是：

- 读多写少；
- 查询频繁；
- 计算成本高；
- 允许短暂不一致；
- 数据量可控。

例如：

```text
药品详情
疾病详情
热门文章
系统配置
热门旅行目的地
```

不太适合直接缓存的情况：

- 数据频繁修改；
- 必须实时强一致；
- 查询频率很低；
- 数据特别大；
- 每个用户的数据都不同且访问一次就不用了。

------

# 二十、订单状态适合缓存吗？

订单状态变化较频繁，而且用户对实时性要求较高。

例如：

```text
待支付
已支付
进行中
已完成
已退款
```

如果缓存时间设置为 30 分钟，用户退款以后仍然看到“进行中”，体验会很差。

因此订单缓存需要更谨慎：

- TTL 设置较短；
- 状态修改后及时删除缓存；
- 关键支付和库存判断直接以 MySQL 为准；
- Redis 不能作为最终交易依据。

必须记住：

> **缓存可以加速订单查询，但不能成为支付、库存和退款的最终事实来源。**

------

# 二十一、AI 任务进度放 Redis，最终结果放 MySQL

TripStar AI 中，任务生成过程可能是：

```text
等待中
生成中
30%
60%
90%
已完成
```

这些状态变化非常频繁，适合放 Redis：

```redis
# 保存 AI 行程生成任务的当前状态
HSET trip:task:3001 status "generating"

# 更新 AI 任务的生成进度为 60
HSET trip:task:3001 progress "60"

# 设置任务临时状态在一小时后自动过期
EXPIRE trip:task:3001 3600
```

最终行程结果需要长期保存，应写入 MySQL：

```sql
-- 保存 AI 最终生成的旅行计划
INSERT INTO trip_plans (
  user_id,       -- 旅行计划所属用户
  destination,   -- 旅行目的地
  plan_content,  -- 完整行程内容
  created_at     -- 创建时间
)
VALUES (
  1001,          -- 用户 ID
  '东京',        -- 旅行目的地
  '完整行程内容', -- AI 生成的正式行程
  NOW()          -- 使用当前数据库时间
);
```

一句话：

> 高频临时进度放 Redis，最终可靠结果落 MySQL。

------

# 二十二、旁路缓存完整查询代码

这是一段非常典型的 Node.js 代码。

```js
// 定义查询用户详情的方法
async function getUserDetail(userId) {
  // 生成用户详情缓存 Key
  const cacheKey = `user:detail:${userId}`;

  // 第一步：优先查询 Redis 缓存
  const cachedUser = await redisClient.get(cacheKey);

  // 第二步：缓存命中时直接返回
  if (cachedUser) {
    // 将缓存中的 JSON 字符串转换为用户对象
    return JSON.parse(cachedUser);
  }

  // 第三步：缓存未命中时查询 MySQL
  const [rows] = await pool.execute(
    `
      -- 根据用户 ID 查询用户详情
      SELECT
        id,        -- 返回用户 ID
        nickname,  -- 返回用户昵称
        avatar     -- 返回用户头像
      FROM users
      WHERE id = ? -- 根据用户主键查询
      LIMIT 1      -- 最多返回一条用户数据
    `,
    [userId], // 安全传入用户 ID
  );

  // 获取 MySQL 查询结果中的第一条记录
  const user = rows[0];

  // 第四步：数据库中也找不到用户时返回空值
  if (!user) {
    return null;
  }

  // 第五步：将数据库结果写入 Redis
  await redisClient.set(
    cacheKey, // 用户详情缓存 Key
    JSON.stringify(user), // 将用户对象转换成 JSON 字符串
    {
      EX: 600, // 设置缓存十分钟后过期
    },
  );

  // 第六步：返回最终用户详情
  return user;
}
```

------

# 二十三、旁路缓存完整更新代码

```js
// 定义修改用户资料的方法
async function updateUserDetail(userId, nickname, avatar) {
  // 第一步：更新 MySQL 中的真实数据
  await pool.execute(
    `
      -- 修改指定用户的昵称和头像
      UPDATE users
      SET
        nickname = ?, -- 更新用户昵称
        avatar = ?    -- 更新用户头像
      WHERE id = ?    -- 根据用户 ID 修改
    `,
    [
      nickname, // 安全传入新的昵称
      avatar, // 安全传入新的头像地址
      userId, // 安全传入用户 ID
    ],
  );

  // 第二步：生成用户详情缓存 Key
  const cacheKey = `user:detail:${userId}`;

  // 第三步：删除旧缓存，而不是直接覆盖缓存
  await redisClient.del(cacheKey);

  // 第四步：返回修改成功结果
  return {
    success: true, // 表示用户资料修改成功
  };
}
```

核心链路：

```text
读取：先 Redis，未命中再 MySQL，最后回填 Redis
写入：先更新 MySQL，再删除 Redis
```

这两句话必须背。

------

# 二十四、除了 Cache Aside，还有哪些模式？

面试中了解名字即可。

## Read Through

应用只请求缓存。

缓存组件发现没有数据时，自动去数据库加载。

```text
应用 → 缓存 → 数据库
```

## Write Through

应用更新缓存，缓存组件同步更新数据库。

```text
应用 → 缓存 → 数据库
```

## Write Behind

应用先更新缓存，缓存异步批量写入数据库。

性能高，但数据可靠性设计更复杂。

一天速成阶段重点只掌握：

> **Cache Aside。**

------

# 二十五、结合项目怎么回答？

## 生猪健康系统

面试官问：

> 药品详情如何使用 Redis？

可以回答：

> 药品详情属于读多写少的数据，可以采用 Cache Aside 模式。查询时先读 Redis，未命中再查询 MySQL，并把结果写入 Redis。后台修改药品数据时，先更新 MySQL，再删除对应 Redis Key，并设置合理 TTL 作为兜底。

------

## 万福鉴酒

面试官问：

> 订单状态能不能长期缓存在 Redis？

可以回答：

> 订单状态对实时性要求较高，不适合设置很长的缓存时间。状态变更后要及时删除缓存，支付、库存和退款等关键判断必须以 MySQL 为准，Redis 只用于加速读取，不能作为最终事实来源。

------

## TripStar AI

面试官问：

> AI 任务数据为什么既用 Redis 又用 MySQL？

可以回答：

> Redis 适合保存生成中的任务进度、WebSocket 房间映射等高频临时状态，最终完成的旅行计划需要长期保存和复杂查询，因此写入 MySQL。Redis 数据可以设置过期时间自动清理。

------

# 二十六、本章必须背的五段答案

## 1. 什么是 Cache Aside？

> Cache Aside 是常见的旁路缓存模式。查询时先读取 Redis，缓存未命中再查询 MySQL，并将结果写入 Redis；更新时通常先更新 MySQL，再删除 Redis 缓存。

## 2. 为什么更新后删除缓存，而不是更新缓存？

> 删除缓存的逻辑更简单，可以避免并发请求按照错误顺序更新缓存。缓存删除后，下一次查询会从 MySQL 加载最新数据并重新建立缓存。

## 3. 为什么先更新数据库，再删除缓存？

> 如果先删除缓存再更新数据库，并发查询可能在数据库更新前读取旧数据并重新写入缓存。先更新数据库再删除缓存，通常能缩小旧数据重新进入缓存的概率。

## 4. Redis 和 MySQL 能绝对一致吗？

> 简单缓存方案通常难以保证绝对强一致，更多是通过合理的更新顺序、TTL、删除重试和消息队列降低不一致概率，保证最终一致性。

## 5. 哪些数据适合缓存？

> 读多写少、访问频繁、查询成本高，并且能够容忍短暂不一致的数据比较适合缓存。

------

# 二十七、一分钟知识链

```text
查询数据
   ↓
先查 Redis
   ↓
命中：直接返回
未命中：查询 MySQL
   ↓
写入 Redis
   ↓
返回数据

修改数据
   ↓
先更新 MySQL
   ↓
再删除 Redis
   ↓
下一次查询重新建立缓存
```

------

# 二十八、本章闯关题

## 第 1 题

查询药品详情时，应该先查 Redis 还是 MySQL？

答案：

> 先查 Redis，缓存未命中时再查询 MySQL。

------

## 第 2 题

修改药品详情后，通常怎么处理缓存？

答案：

> 先更新 MySQL，再删除对应的 Redis 缓存。

------

## 第 3 题

为什么不推荐直接更新缓存？

答案：

> 多个并发请求可能按照错误的顺序更新缓存，导致旧数据覆盖新数据；删除缓存让下次查询重新从 MySQL 建立正确缓存，逻辑更简单。

------

## 第 4 题

删除 Redis 缓存失败怎么办？

答案：

> 可以设置合理 TTL 兜底，并通过重试、消息队列或后台补偿任务再次删除。

------

## 第 5 题

AI 任务进度和最终旅行计划分别存哪里？

答案：

> 生成中的临时进度适合放 Redis，最终旅行计划需要长期保存，应写入 MySQL。

------

## 第 6 题

Cache Aside 能保证百分之百强一致吗？

答案：

> 不能。它主要通过更新顺序、缓存过期和失败重试实现最终一致性。

下一章进入 Redis 面试频率最高的内容：

> **缓存穿透、缓存击穿、缓存雪崩。**

你可以提前记一句：

```text
穿透：查询不存在的数据
击穿：一个热门 Key 突然失效
雪崩：大量 Key 同时失效
```
