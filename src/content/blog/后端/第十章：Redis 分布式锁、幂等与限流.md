---
title: 第十章：Redis 分布式锁、幂等与限流
slug: di-shi-zhang-redis-fen-bu-shi-suo-mi-deng-yu-xian-liu
description: 这一章是 Redis 最后一章核心内容，也是最容易被面试官追问的一章。
publishDate: '2026-08-02'
category: 后端
tags:
  - JavaScript
  - Node.js
  - MySQL
  - Redis
  - 浏览器
  - 算法
  - AI
cover: auto
draft: false
featured: false
toc: true
---
这一章是 Redis 最后一章核心内容，也是最容易被面试官追问的一章。

今天我们解决三个真实问题：

> 用户连续点击两次“提交订单”，为什么不能生成两笔订单？
> 两台服务器同时抢最后一个任务，谁来执行？
> 有人一秒请求 AI 接口一百次，怎么限制？

本章必须掌握：

1. 为什么普通锁解决不了分布式问题。
2. `SET NX EX` 如何实现分布式锁。
3. 为什么锁必须设置唯一标识和过期时间。
4. 为什么不能直接 `DEL` 释放锁。
5. Lua 脚本有什么作用。
6. 什么是接口幂等。
7. 如何防止重复提交和实现限流。

------

# 一、从一个重复下单事故说起

万福鉴酒中，用户点击“提交订单”。

由于网络卡顿，用户连续点击两次：

```text
第一次点击 → 请求 A
第二次点击 → 请求 B
```

后端可能同时收到两次请求：

```text
请求 A：创建订单成功
请求 B：也创建订单成功
```

最终用户只想买一件商品，却生成两张订单。

前端可以做按钮禁用：

```js
// 标记当前是否正在提交订单
let isSubmitting = false;

// 定义订单提交方法
async function submitOrder() {
  // 如果已经在提交，就直接结束，防止用户连续点击
  if (isSubmitting) {
    return;
  }

  // 将状态改为正在提交
  isSubmitting = true;

  try {
    // 调用后端创建订单接口
    await axios.post('/api/orders', {
      productId: 2001, // 当前购买的商品 ID
    });
  } finally {
    // 无论接口成功还是失败，都恢复按钮状态
    isSubmitting = false;
  }
}
```

但是这只能改善用户体验，不能保证安全。

用户仍然可以：

- 使用抓包工具重复请求；
- 同时打开两个页面；
- 在两台设备上提交；
- 因网络重试再次发送请求。

所以必须由后端保证：

> 同一笔业务不能重复执行。

------

# 二、普通本地锁为什么不够？

Node.js 中可以使用一个变量模拟本地锁：

```js
// 保存当前进程是否正在创建订单
let isCreatingOrder = false;

// 定义创建订单的方法
async function createOrder() {
  // 当前进程已经有请求在创建订单时，拒绝重复执行
  if (isCreatingOrder) {
    throw new Error('订单正在创建，请勿重复提交');
  }

  // 锁住当前进程
  isCreatingOrder = true;

  try {
    // 执行订单创建逻辑
    await doCreateOrder();
  } finally {
    // 业务结束后释放当前进程的锁
    isCreatingOrder = false;
  }
}
```

如果系统只有一台 Node.js 服务器，这种锁可能暂时有效。

但企业系统通常有多台服务器：

```text
用户请求 A → Node.js 服务器 1
用户请求 B → Node.js 服务器 2
```

服务器 1 的变量：

```text
isCreatingOrder = true
```

服务器 2 的变量仍然是：

```text
isCreatingOrder = false
```

两台服务器的内存互相看不到，所以两边都会执行。

因此需要一个所有服务器都能访问的锁：

```text
服务器 1 ┐
服务器 2 ├── Redis
服务器 3 ┘
```

这就是：

> **分布式锁。**

------

# 三、什么是分布式锁？

分布式锁用于保证：

> 在多个进程、多个服务器共同运行时，同一时刻只有一个执行者能够操作某项共享资源。

例如：

- 同一个用户只能创建一次订单；
- 同一个 AI 任务只能由一台服务器执行；
- 同一张优惠券不能被重复领取；
- 同一个定时任务只能运行一次；
- 最后一件库存不能被多台服务器同时扣减。

面试标准答案：

> 分布式锁是在分布式系统中协调多个进程或服务器访问共享资源的一种机制，目标是保证同一业务资源在同一时刻只被一个执行者处理。

------

# 四、`SET NX EX`：Redis 分布式锁的核心

Redis 获取锁的常见命令：

```redis
# 只有锁不存在时才创建，并设置十秒过期时间
SET lock:order:user:1001 "request-abc" NX EX 10
```

其中：

```text
SET：设置一个 Key
NX：Key 不存在时才设置成功
EX 10：十秒后自动过期
```

执行成功时返回：

```text
OK
```

锁已经存在时返回空值。

------

## 为什么 `NX` 可以实现锁？

第一个请求：

```redis
# 请求 A 尝试获取用户 1001 的订单创建锁
SET lock:order:user:1001 "request-A" NX EX 10
```

返回：

```text
OK
```

说明请求 A 获得锁。

第二个请求：

```redis
# 请求 B 尝试获取同一用户的订单创建锁
SET lock:order:user:1001 "request-B" NX EX 10
```

因为 Key 已经存在，所以设置失败。

于是：

```text
请求 A：获得锁，可以创建订单
请求 B：没有获得锁，不能重复创建
```

------

# 五、为什么不能把 `SETNX` 和 `EXPIRE` 分开执行？

一种错误写法：

```redis
# 第一步：尝试创建锁
SETNX lock:order:user:1001 "request-A"

# 第二步：给锁设置十秒过期时间
EXPIRE lock:order:user:1001 10
```

风险在于两条命令不是一个原子操作。

可能发生：

```text
SETNX 成功
    ↓
应用程序突然崩溃
    ↓
EXPIRE 没有执行
```

结果锁永久存在：

```text
lock:order:user:1001 永不过期
```

以后所有请求都无法获得锁，这就是死锁风险。

因此应该使用一条命令：

```redis
# 获取锁与设置过期时间在一条命令中原子完成
SET lock:order:user:1001 "request-A" NX EX 10
```

必须背：

> 获取分布式锁时，设置锁和过期时间必须保证原子性，通常使用 `SET key value NX EX seconds`。

------

# 六、为什么锁必须设置过期时间？

假设请求 A 获得锁后：

- Node.js 进程崩溃；
- 服务器突然断电；
- 程序抛出异常；
- 网络连接中断。

如果锁没有过期时间，请求 A 就没有机会释放它。

后面的请求永远获取不到锁。

设置过期时间相当于：

> 即使锁的持有者发生故障，Redis 也会在一定时间后自动释放锁。

但是锁的过期时间也不能太短。

业务需要五秒，锁却只设置两秒：

```text
第 0 秒：请求 A 获得锁
第 2 秒：锁自动过期
第 3 秒：请求 B 获得锁
第 4 秒：请求 A 还没执行结束
```

此时 A、B 又同时执行了。

所以锁的过期时间必须覆盖正常业务执行时间，并考虑续期机制。

------

# 七、为什么锁的 Value 不能都写成 `locked`？

初学者容易这样写：

```redis
# 不推荐：所有请求都使用相同的锁值
SET lock:order:user:1001 "locked" NX EX 10
```

锁的 Value 应该保存每个请求独有的标识，例如 UUID：

```text
请求 A：5c8b-a123
请求 B：9e17-b456
```

Node.js 示例：

```js
// 引入 Node.js 内置的 UUID 生成方法
const { randomUUID } = require('node:crypto');

// 为当前请求生成唯一的锁标识
const lockToken = randomUUID();
```

获取锁：

```js
// 根据用户 ID 生成订单创建锁的 Key
const lockKey = `lock:order:create:${userId}`;

// 为当前请求生成唯一锁标识
const lockToken = randomUUID();

// 尝试获取分布式锁
const lockResult = await redisClient.set(
  lockKey, // 当前业务资源对应的锁 Key
  lockToken, // 当前请求独有的锁标识
  {
    NX: true, // 只有锁不存在时才允许设置
    EX: 10, // 十秒后自动过期，防止永久死锁
  },
);

// 返回 OK 表示成功获得锁
const acquired = lockResult === 'OK';
```

------

# 八、为什么不能直接 `DEL` 释放锁？

假设请求 A 获得锁：

```text
锁 Value = request-A
过期时间 = 5 秒
```

但是 A 执行业务花了八秒。

执行过程：

```text
第 0 秒：A 获得锁
第 5 秒：A 的锁自动过期
第 6 秒：B 获得同一个锁
第 8 秒：A 执行结束
```

如果 A 直接执行：

```redis
# 危险：没有判断锁属于谁，就直接删除
DEL lock:order:user:1001
```

它删除的其实是 B 的锁。

于是请求 C 又可以进入：

```text
请求 B 正在执行
请求 C 也开始执行
```

锁彻底失效。

所以释放锁之前必须判断：

> Redis 中保存的锁标识，是否仍然属于当前请求？

------

# 九、为什么“先 GET 再 DEL”仍然不安全？

看似合理的写法：

```js
// 读取当前锁的持有者标识
const currentToken = await redisClient.get(lockKey);

// 判断锁是否属于当前请求
if (currentToken === lockToken) {
  // 如果属于当前请求，就删除锁
  await redisClient.del(lockKey);
}
```

问题是 `GET` 和 `DEL` 是两条命令。

可能发生：

```text
请求 A：GET，发现锁属于自己
锁刚好过期
请求 B：获得新锁
请求 A：执行 DEL
```

A 还是会删除 B 的锁。

因此：

> 判断锁归属和删除锁必须原子执行。

这时需要 Lua 脚本。

------

# 十、Lua 脚本安全释放锁

Lua 脚本可以让多条 Redis 操作作为一个整体执行。

```lua
-- 判断 Redis 中锁的 Value 是否等于当前请求的唯一标识
if redis.call('GET', KEYS[1]) == ARGV[1] then
  -- 锁属于当前请求时，删除这个锁
  return redis.call('DEL', KEYS[1])
else
  -- 锁不属于当前请求时，不执行删除
  return 0
end
```

Node.js 调用：

```js
// 定义安全释放 Redis 锁的 Lua 脚本
const releaseLockScript = `
  -- 判断锁中的唯一标识是否属于当前请求
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    -- 只有锁属于当前请求时才删除
    return redis.call('DEL', KEYS[1])
  else
    -- 不属于当前请求时不删除任何内容
    return 0
  end
`;

// 执行 Lua 脚本，安全释放分布式锁
const releaseResult = await redisClient.eval(releaseLockScript, {
  keys: [
    lockKey, // KEYS[1]，需要释放的锁 Key
  ],
  arguments: [
    lockToken, // ARGV[1]，当前请求的唯一锁标识
  ],
});
```

Lua 脚本的意义：

> Redis 会把脚本中的判断与删除连续完成，中间不会插入其他命令，因此能够避免误删其他请求的锁。

------

# 十一、一个相对完整的分布式锁示例

```js
// 引入 UUID 生成方法
const { randomUUID } = require('node:crypto');

// 定义安全释放锁的 Lua 脚本
const releaseLockScript = `
  -- 判断当前锁是否属于本次请求
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    -- 属于当前请求时删除锁
    return redis.call('DEL', KEYS[1])
  else
    -- 不属于当前请求时不删除
    return 0
  end
`;

// 定义创建订单的方法
async function createOrderWithLock(userId, productId) {
  // 根据用户 ID 生成订单创建锁
  const lockKey = `lock:order:create:${userId}`;

  // 为本次请求生成唯一锁标识
  const lockToken = randomUUID();

  // 尝试获得分布式锁
  const lockResult = await redisClient.set(
    lockKey, // 锁对应的 Redis Key
    lockToken, // 本次请求唯一标识
    {
      NX: true, // 锁不存在时才设置成功
      EX: 10, // 十秒后自动过期
    },
  );

  // 获取锁失败，说明相同业务正在被其他请求处理
  if (lockResult !== 'OK') {
    throw new Error('订单正在创建，请勿重复提交');
  }

  try {
    // 查询数据库，检查是否已经存在相同业务订单
    const [existingOrders] = await pool.execute(
      `
        -- 查询是否存在相同用户、相同商品的待处理订单
        SELECT
          id,        -- 返回订单 ID
          order_no   -- 返回订单编号
        FROM orders
        WHERE user_id = ?      -- 根据用户 ID 查询
          AND product_id = ?   -- 根据商品 ID 查询
          AND status IN (10, 20) -- 只查询待处理或进行中的订单
        LIMIT 1                -- 找到一条即可停止
      `,
      [
        userId, // 安全传入用户 ID
        productId, // 安全传入商品 ID
      ],
    );

    // 已存在业务订单时，不再重复创建
    if (existingOrders.length > 0) {
      return existingOrders[0];
    }

    // 创建新的订单编号
    const orderNo = `ORDER-${Date.now()}`;

    // 向 MySQL 中插入正式订单
    await pool.execute(
      `
        -- 创建一条新的订单记录
        INSERT INTO orders (
          order_no,   -- 订单编号
          user_id,    -- 下单用户 ID
          product_id, -- 商品 ID
          status,     -- 订单状态
          created_at  -- 创建时间
        )
        VALUES (
          ?,          -- 传入订单编号
          ?,          -- 传入用户 ID
          ?,          -- 传入商品 ID
          10,         -- 10 表示待接单
          NOW()       -- 使用数据库当前时间
        )
      `,
      [
        orderNo, // 订单编号
        userId, // 用户 ID
        productId, // 商品 ID
      ],
    );

    // 返回创建成功的订单信息
    return {
      orderNo, // 新订单编号
      status: 10, // 新订单状态
    };
  } finally {
    // 无论业务成功还是失败，都尝试安全释放锁
    await redisClient.eval(releaseLockScript, {
      keys: [
        lockKey, // 需要释放的锁 Key
      ],
      arguments: [
        lockToken, // 当前请求的唯一锁标识
      ],
    });
  }
}
```

这段代码表达了四个核心点：

```text
SET NX EX 获取锁
唯一 Token 标记锁持有者
try...finally 保证执行释放逻辑
Lua 判断归属后原子删除
```

------

# 十二、锁过期了，但业务还没完成怎么办？

例如 AI 行程任务初始化需要 30 秒，但锁只设置 10 秒。

可能出现锁提前失效。

常见方案有两个。

## 方案一：合理估算锁时间

业务通常三秒完成，可以把锁设置成十秒。

优点是简单。

缺点是遇到慢请求时仍可能过期。

## 方案二：自动续期

获得锁后，后台定期检查：

> 锁仍然属于当前请求吗？

如果属于，就延长过期时间。

这类自动续期机制常被叫作：

> 看门狗机制，Watchdog。

流程：

```text
获得锁，过期时间 10 秒
       ↓
每隔约 3 秒检查一次
       ↓
业务还没结束，延长到 10 秒
       ↓
业务结束，停止续期并释放锁
```

实际项目通常优先使用成熟锁库，不建议每次手写完整续期逻辑。

Node.js 中可以考虑成熟方案，例如基于 Redis 的分布式锁库，但你面试时重点讲清原理即可。

------

# 十三、分布式锁是不是万能的？

不是。

Redis 锁可能面对：

- Redis 网络异常；
- 锁提前过期；
- 服务暂停或卡顿；
- 主从切换时的数据同步问题；
- 锁释放失败；
- 业务执行成功但响应丢失。

因此重要业务不能只靠 Redis 锁。

例如订单防重复，最好同时使用：

```text
Redis 分布式锁
        +
MySQL 唯一索引
        +
业务状态条件
```

Redis 锁是第一道门。

MySQL 唯一约束是最后一道防线。

------

# 十四、用 MySQL 唯一索引兜底

假设每次前端提交订单时生成一个唯一业务请求号：

```text
request_no = req-20260730-abc123
```

在订单表中建立唯一索引：

```sql
-- 给业务请求编号建立唯一索引，防止同一个请求重复创建订单
CREATE UNIQUE INDEX uk_orders_request_no
ON orders (
  request_no -- 每次业务请求的唯一编号
);
```

第一次插入成功：

```sql
-- 根据唯一请求号创建订单
INSERT INTO orders (
  request_no, -- 业务请求唯一编号
  order_no,   -- 正式订单编号
  user_id,    -- 下单用户 ID
  status      -- 订单状态
)
VALUES (
  'req-20260730-abc123', -- 本次请求唯一编号
  'ORDER20260730001',    -- 正式订单编号
  1001,                  -- 用户 ID
  10                     -- 待接单状态
);
```

第二次插入同一个 `request_no`，MySQL 会因为唯一索引拒绝。

这比单纯依赖 Redis 更可靠。

------

# 十五、什么是幂等？

幂等的含义是：

> 同一个操作执行一次和执行多次，对系统产生的最终结果相同。

例如：

```text
第一次取消订单：订单变成已取消
第二次取消订单：订单仍然是已取消
```

不能变成：

```text
第一次取消：退款 100 元
第二次取消：又退款 100 元
```

常见需要保证幂等的场景：

- 创建订单；
- 支付回调；
- 退款操作；
- 优惠券领取；
- 表单提交；
- AI 任务创建；
- 消息队列消费；
- 第三方接口重试。

------

# 十六、哪些请求天然幂等？

## 查询通常天然幂等

```sql
-- 查询订单信息，不修改数据库状态
SELECT
  id,        -- 返回订单 ID
  status     -- 返回订单状态
FROM orders
WHERE id = 1001; -- 查询指定订单
```

执行十次，数据库数据通常不会发生变化。

## 设置为固定值通常更容易幂等

```sql
-- 将订单状态固定设置为已取消
UPDATE orders
SET status = 40 -- 40 表示已取消
WHERE id = 1001; -- 修改指定订单
```

执行多次，最终仍然是状态 40。

## 累加操作通常不是天然幂等

```sql
-- 每执行一次都会把余额增加一百元
UPDATE accounts
SET balance = balance + 100 -- 账户余额增加一百
WHERE user_id = 1001;       -- 修改指定用户账户
```

重复执行两次就增加两百元。

这种操作必须有幂等保护。

------

# 十七、接口幂等的常见方案

## 方案一：唯一请求号

前端或后端生成：

```text
idempotencyKey
```

例如：

```js
// 引入 UUID 生成方法
import { randomUUID } from 'crypto';

// 为本次订单提交生成唯一幂等 Key
const idempotencyKey = randomUUID();

// 调用订单创建接口
await axios.post(
  '/api/orders',
  {
    productId: 2001, // 当前商品 ID
  },
  {
    headers: {
      // 将幂等 Key 放入请求头
      'Idempotency-Key': idempotencyKey,
    },
  },
);
```

移动端不一定能直接使用 Node.js 的 `crypto` 导入，浏览器环境可使用：

```js
// 使用浏览器提供的方法生成 UUID
const idempotencyKey = crypto.randomUUID();
```

后端检查这个 Key 是否已经处理过。

------

## 方案二：Redis 防重复提交

```js
// 读取客户端传入的幂等 Key
const idempotencyKey = request.headers['idempotency-key'];

// 根据幂等 Key 生成 Redis 防重复提交 Key
const redisKey = `idempotency:order:${idempotencyKey}`;

// 尝试记录当前请求
const result = await redisClient.set(
  redisKey, // 幂等记录 Key
  'processing', // 表示请求正在处理中
  {
    NX: true, // Key 已存在时设置失败
    EX: 300, // 五分钟后自动过期
  },
);

// 设置失败说明请求已经提交过
if (result !== 'OK') {
  throw new Error('请勿重复提交订单');
}
```

但要注意：

> Redis 记录成功后，如果数据库创建订单失败，需要合理处理这个幂等 Key，否则用户可能短时间内无法重试。

可以根据业务把状态设计为：

```text
processing：处理中
success：处理成功
failed：处理失败
```

------

## 方案三：数据库唯一索引

这是非常重要的最终兜底。

```sql
-- 保证同一个幂等请求号在订单表中只能出现一次
CREATE UNIQUE INDEX uk_request_no
ON orders (
  request_no -- 业务请求唯一标识
);
```

必须背：

> Redis 可以快速拦截重复请求，数据库唯一索引用于最终保证数据不重复。

------

## 方案四：状态机条件更新

万福鉴酒的订单只能按照规定状态流转：

```text
待接单 → 进行中 → 已完成
```

更新时带上旧状态：

```sql
-- 只有订单仍处于待接单状态时，才允许更新为进行中
UPDATE orders
SET
  status = 20,       -- 将状态更新为进行中
  updated_at = NOW() -- 更新修改时间
WHERE id = 1001      -- 指定订单 ID
  AND status = 10;   -- 确保当前仍然是待接单
```

第一次执行：

```text
影响行数 = 1
```

第二次执行：

```text
影响行数 = 0
```

因为状态已经不是 10。

这也是一种幂等与并发控制。

------

# 十八、防重复提交和分布式锁的区别

二者看起来很像，但关注点不同。

## 防重复提交

重点是：

> 同一个业务请求不能重复执行。

通常依赖：

- 幂等 Key；
- 唯一索引；
- 业务单号；
- 状态机。

## 分布式锁

重点是：

> 某个共享资源同一时刻只能被一个执行者操作。

通常依赖：

- Redis 锁；
- 数据库锁；
- 分布式协调组件。

一句话：

> 幂等关注“重复执行结果是否相同”，分布式锁关注“能不能同时执行”。

------

# 十九、接口限流是什么？

假设生猪 AI 问诊接口调用大模型，每次都要消耗资源。

某个用户一秒请求 100 次：

```text
用户疯狂请求
     ↓
大量调用大模型
     ↓
服务器和费用压力暴涨
```

限流就是：

> 限制一个用户、IP 或接口在一定时间内允许请求多少次。

例如：

```text
同一用户一分钟最多调用 AI 接口 10 次
```

超过后返回：

```text
请求过于频繁，请稍后再试
```

------

# 二十、固定窗口限流

最简单的思路：

```text
时间窗口：一分钟
最大请求数：10 次
```

Redis Key：

```text
rate_limit:ai:user:1001
```

每次请求执行：

```redis
# 将用户在当前窗口内的请求次数增加一
INCR rate_limit:ai:user:1001

# 设置计数器六十秒后过期
EXPIRE rate_limit:ai:user:1001 60
```

但 `INCR` 和 `EXPIRE` 分开执行存在类似问题：

```text
INCR 成功
程序崩溃
EXPIRE 没执行
```

Key 可能永远不过期。

所以可以使用 Lua 保证原子性。

------

# 二十一、Lua 实现简单限流

```lua
-- 将当前用户的请求计数增加一
local current = redis.call('INCR', KEYS[1])

-- 如果这是当前窗口内的第一次请求
if current == 1 then
  -- 为计数器设置窗口过期时间
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end

-- 返回当前请求次数
return current
```

Node.js 调用：

```js
// 定义固定窗口限流 Lua 脚本
const rateLimitScript = `
  -- 将当前窗口中的请求次数增加一
  local current = redis.call('INCR', KEYS[1])

  -- 第一次请求时设置窗口过期时间
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end

  -- 返回当前请求次数
  return current
`;

// 定义检查用户 AI 接口限流的方法
async function checkAiRateLimit(userId) {
  // 生成当前用户的限流 Key
  const rateLimitKey = `rate_limit:ai:user:${userId}`;

  // 设置时间窗口为六十秒
  const windowSeconds = 60;

  // 设置窗口内最多允许请求十次
  const maxRequests = 10;

  // 原子增加请求次数，并在第一次请求时设置过期时间
  const currentRequests = await redisClient.eval(rateLimitScript, {
    keys: [
      rateLimitKey, // KEYS[1]，当前用户限流 Key
    ],
    arguments: [
      String(windowSeconds), // ARGV[1]，窗口持续秒数
    ],
  });

  // 当前请求次数超过限制时拒绝请求
  if (Number(currentRequests) > maxRequests) {
    throw new Error('AI 问诊请求过于频繁，请稍后再试');
  }

  // 未超过限制时允许继续执行
  return true;
}
```

------

# 二十二、固定窗口有什么问题？

假设规则：

```text
一分钟最多 10 次
```

用户可能这样请求：

```text
12:00:59 请求 10 次
12:01:00 又请求 10 次
```

两秒钟内实际通过了 20 次请求。

这叫固定窗口的边界问题。

更精确的方案包括：

- 滑动窗口；
- 令牌桶；
- 漏桶。

一天速成阶段，你只需了解：

> 固定窗口实现简单，但窗口边界处可能出现流量突增；更严格的系统可以使用滑动窗口、令牌桶或漏桶算法。

------

# 二十三、ZSet 实现滑动窗口的思想

ZSet 可以把每个请求记录为：

```text
成员：请求唯一 ID
score：请求时间戳
```

每次请求：

```text
删除一分钟以前的请求
统计最近一分钟请求数
未超限时加入当前请求
```

逻辑命令大致如下：

```redis
# 删除一分钟以前的请求记录
ZREMRANGEBYSCORE rate_limit:ai:user:1001 0 过去一分钟的时间戳

# 统计最近一分钟内的请求数量
ZCARD rate_limit:ai:user:1001

# 将当前请求按照当前时间戳加入集合
ZADD rate_limit:ai:user:1001 当前时间戳 "当前请求唯一ID"
```

实际使用时这些步骤也应通过 Lua 原子执行。

你目前不用手写完整版本，能讲出原理即可。

------

# 二十四、结合你的项目怎么回答？

下面属于设计思路。没有真实实现时，应说“如果让我设计”。

## 万福鉴酒：防止重复接单

面试官问：

> 两名鉴定师同时抢同一笔订单怎么办？

推荐回答：

> 我会把数据库条件更新作为最终保证，只有订单状态仍然是待接单时，才更新为进行中，并检查受影响行数。Redis 分布式锁可以减少并发冲突，但不能代替 MySQL 状态条件。

```sql
-- 只有订单仍是待接单状态时，当前鉴定师才能成功接单
UPDATE orders
SET
  status = 20,            -- 将订单改为进行中
  appraiser_id = 3001,    -- 记录成功接单的鉴定师
  updated_at = NOW()      -- 更新订单修改时间
WHERE id = 1001           -- 指定目标订单
  AND status = 10;        -- 确保订单仍然处于待接单状态
```

谁先成功，谁的影响行数为 1。

另一人影响行数为 0，前端提示：

> 订单已被其他鉴定师接取。

------

## TripStar AI：防止重复创建任务

面试官问：

> 用户连续点击“生成行程”，如何避免生成两个 AI 任务？

可以回答：

> 前端先禁用按钮改善体验，后端要求每次提交携带幂等 Key。Redis 使用 `SET NX EX` 快速拦截短时间重复请求，任务表再对 request_no 建唯一索引作为最终兜底。

------

## 生猪健康系统：AI 接口限流

面试官问：

> 如何防止某个用户频繁调用 AI 问诊？

可以回答：

> 可以使用 Redis 计数器实现用户维度的限流，例如一分钟最多调用十次。简单场景使用固定窗口和 `INCR`，通过 Lua 保证计数与设置过期时间的原子性；要求更高时可以使用 ZSet 实现滑动窗口。

------

# 二十五、Redis 分布式锁的正确流程

这条必须背下来：

```text
生成当前请求的唯一 Token
        ↓
SET key token NX EX seconds 获取锁
        ↓
获取失败：等待或返回“处理中”
        ↓
获取成功：执行核心业务
        ↓
使用 Lua 判断 Token 后删除锁
```

还要加一句：

> 重要业务需要数据库唯一索引、状态条件或事务作为最终兜底。

------

# 二十六、本章必须背的七段答案

## 1. 什么是分布式锁？

> 分布式锁用于协调多个进程或服务器访问共享资源，保证同一业务资源在同一时刻只被一个执行者处理。

## 2. Redis 如何实现分布式锁？

> 常用 `SET key value NX EX seconds` 获取锁。NX 保证锁不存在时才能设置成功，EX 设置自动过期时间，Value 应使用当前请求的唯一标识。

## 3. 为什么锁必须设置过期时间？

> 防止服务崩溃或异常退出后无法释放锁，造成永久死锁。但过期时间也要合理，否则业务未完成时锁可能提前失效。

## 4. 为什么不能直接使用 DEL 释放锁？

> 因为当前请求的锁可能已经过期，并被其他请求重新获得。直接 DEL 可能误删别人的锁，所以要用唯一 Token 判断归属，并通过 Lua 原子地完成判断和删除。

## 5. 什么是接口幂等？

> 幂等表示同一个操作执行一次或多次，对系统产生的最终结果相同。可以通过幂等 Key、数据库唯一索引、状态机条件和业务单号实现。

## 6. 分布式锁和幂等有什么区别？

> 分布式锁解决多个执行者能否同时操作共享资源的问题；幂等解决同一个请求重复执行时，结果是否会被重复改变的问题。

## 7. Redis 如何实现限流？

> 可以通过 INCR 计数并设置过期时间实现固定窗口限流，通过 Lua 保证操作原子性；更精确的场景可以使用 ZSet 实现滑动窗口，或者采用令牌桶、漏桶算法。

------

# 二十七、一分钟背诵卡

```text
分布式锁
SET key token NX EX 10

NX
锁不存在才能获取

EX
防止永久死锁

Token
标记锁属于哪个请求

Lua
判断 Token + 删除锁原子执行

幂等
同一请求执行多次，最终结果相同

最终兜底
MySQL 唯一索引 + 状态条件

限流
INCR + EXPIRE，使用 Lua 保证原子性
```

------

# 二十八、本章闯关题

## 第 1 题

为什么不能只使用前端按钮禁用防止重复下单？

答案：

> 用户可以重复发送网络请求、打开多个页面或使用抓包工具，因此后端必须保证接口幂等。

## 第 2 题

`SET lock value NX EX 10` 中，NX 和 EX 分别是什么？

答案：

> NX 表示锁不存在时才能设置成功；EX 10 表示锁十秒后自动过期。

## 第 3 题

为什么锁的 Value 要使用 UUID？

答案：

> 用于标记锁的持有者，释放时只有 Token 相同的请求才能删除锁，避免误删其他请求的锁。

## 第 4 题

为什么释放锁要使用 Lua？

答案：

> 因为判断锁归属和删除锁必须原子完成，避免两条命令之间锁过期并被其他请求重新获得。

## 第 5 题

Redis 分布式锁是否可以完全替代数据库唯一索引？

答案：

> 不能。Redis 可能发生网络、过期和故障切换问题，重要业务仍需要数据库唯一索引、条件更新或事务作为最终保证。

## 第 6 题

固定窗口限流有什么缺点？

答案：

> 在两个窗口交界处可能短时间通过超过预期的请求数量，更精确时可以使用滑动窗口或令牌桶。

## 第 7 题

两名鉴定师同时接一张订单，最可靠的最终控制是什么？

答案：

> 在 MySQL 更新时带上旧状态条件，只有订单仍为待接单时才允许更新，并检查受影响行数。

下一章是最终章：**结合你的简历进行 MySQL 与 Redis 面试拷打**，包括高频问题、项目标准答案、面试官连续追问，以及你需要最终背下来的整套答案。
