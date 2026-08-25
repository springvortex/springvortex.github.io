---
layout: mypost
title: 默认 Redis 锁就不用初始化 MySQL 锁表
categories: [ MySQL, Distributed Lock, Configuration ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.1`

项目里的分布式锁支持多种实现，但默认实现是 Redis：

```yaml
zjc:
  distributed-lock:
    provider: redis
    mysql:
      table-name: t_distributed_lock
      lease-time: 30s
      retry-interval: 100ms
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/config/application-lock.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/config/application-lock.yaml)

这次提交删掉了仓库里的 MySQL 租约表初始化 SQL。删除前它只包含一张可选实现的表：

```sql
CREATE TABLE IF NOT EXISTS t_distributed_lock (
    lock_key VARCHAR(191) NOT NULL COMMENT '锁 key',
    lock_owner VARCHAR(120) NOT NULL COMMENT '持有者标识',
    lock_count INT NOT NULL COMMENT '重入次数',
    expire_at DATETIME(3) NOT NULL COMMENT '租约到期时间',
    PRIMARY KEY (lock_key)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4 COMMENT = 'MySQL 分布式锁租约表';
```

> [https://github.com/springvortex/spring-cloud-alibaba/commit/3889e425f12a75f36d94f2dc97b697f359d579d3](https://github.com/springvortex/spring-cloud-alibaba/commit/3889e425f12a75f36d94f2dc97b697f359d579d3)

这不是说 MySQL 锁实现被删了。配置里仍保留 `mysql.table-name`，说明它仍是可切换后端；删除的是“默认初始化清单里的可选后端表”。当 `provider` 是 `redis` 时，新环境不需要这张表，把它放在通用 SQL 里反而会让部署者误解 MySQL 业务库的必需结构。

如果以后真的切换：

```yaml
zjc:
  distributed-lock:
    provider: mysql
```

就必须重新为当前环境准备这张租约表，并把它纳入自己的迁移和备份范围。它是该后端的运行依赖，不再是默认部署的公共依赖。

### 经验总结

初始化 SQL 应该跟随当前默认运行方式，而不是罗列所有可选实现的存储结构。可选后端的 schema 应该放在后端专属的启用文档或迁移里，切谁准备谁的表。
