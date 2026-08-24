---
layout: mypost
title: Redisson 复用 Spring Redis 连接配置
categories: [ Redis, Redisson, Configuration ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - 提交：`fca5763`
> - JDK：`21`
> - Spring Boot：`4.1.0`

引入 Redisson 后，最容易出现的配置漂移是：Spring Cache 连接一套 Redis，Redisson 又维护一套地址、密码和超时。环境一多，两边不同步的风险就会变成线上问题。

这次提交使用 Redisson Core，并在 Provider 中手动装配客户端：

```java
singleServer.setAddress("redis://" + redisProperties.getHost() + ":" + redisProperties.getPort())
        .setDatabase(redisProperties.getDatabase())
        .setConnectTimeout((int) redisProperties.getConnectTimeout().toMillis())
        .setTimeout((int) redisProperties.getTimeout().toMillis());
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/RedissonConfiguration.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/RedissonConfiguration.java)

连接字段来自：

```yaml
spring:
  data:
    redis:
      host: ...
      port: 6379
      password: ...
      timeout: 2s
      connect-timeout: 2s
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/config/application-redis.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/config/application-redis.yaml)

这样 dev/prod 只维护一份 Redis 地址。用户名和密码为空时不传给 Redisson，避免把空字符串当成有效凭据。

客户端还有两个细节：

```java
config.setLazyInitialization(true);
config.setLockWatchdogTimeout(30_000);
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/RedissonConfiguration.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/RedissonConfiguration.java)

懒初始化让应用启动时不因为 Redis 暂不可用而提前失败，第一条命令执行时才建立连接；看门狗基础值设为 30 秒，后续使用不带 `leaseTime` 的 `lock()` 或 `tryLock(...)` 时会自动续期。显式传入 `leaseTime` 则不同，锁到期后自动释放，不再由看门狗续期。

Redisson 对象名不会经过 Spring Cache 的 key 前缀处理，所以业务代码必须自己约定命名：

```text
zjc:provider:seckill:lock:1001
zjc:provider:seckill:delay-queue
zjc:provider:ratelimit:user:10001
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/README.md)

### 经验总结

Redisson 提供的是分布式协调能力，连接来源仍应该服从应用配置。复用 `spring.data.redis`，再显式约束对象名和看门狗语义，可以减少环境配置和运行行为的不确定性。
