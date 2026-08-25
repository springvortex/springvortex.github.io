---
layout: mypost
title: Spring Boot 优雅停机配置进公共 Profile
categories: [ Spring Boot, Deployment, Microservices ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.1`

容器重启不是只有“进程消失”一种结果。如果应用正在处理请求，直接杀掉会把用户请求、邮件发送和链路记录一起切断。这次四个服务统一启用了 Spring Boot 优雅停机。

Provider、Consumer、Gateway 的配置是：

```yaml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/config/application-shutdown.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/config/application-shutdown.yaml)

Mail 的等待时间更长：

```yaml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 60s
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/resources/config/application-shutdown.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/resources/config/application-shutdown.yaml)

`server.shutdown: graceful` 让 Web 服务器停止接收新请求，并给正在处理的请求留出完成时间；`timeout-per-shutdown-phase` 约束 Spring 生命周期各阶段的停止等待。Mail 依赖外部 SMTP，慢请求的概率更高，所以单独放宽到 60 秒。

配置不是散落在四个 `application.yaml` 里，而是作为公共 Profile 引入：

```yaml
spring:
  profiles:
    include:
      - shutdown
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/application.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/application.yaml)

并且有配置结构测试兜底：

```java
assertThat(path(application, "spring.profiles.include")).asList().contains("shutdown");
assertThat(path(shutdown, "server.shutdown")).isEqualTo("graceful");
assertThat(path(shutdown, "spring.lifecycle.timeout-per-shutdown-phase"))
        .isEqualTo("30s");
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/test/java/com/zjc/provider/config/ProfileConfigurationTest.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/test/java/com/zjc/provider/config/ProfileConfigurationTest.java)

Docker 侧也要配合留时间。普通服务的 `stop_grace_period` 是 40 秒，Mail 是 70 秒，都比应用等待多 10 秒：

```yaml
stop_grace_period: 40s
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/docker-compose.yml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/docker-compose.yml)

如果 Docker 的宽限期小于应用等待时间，应用还没处理完请求就被强制杀掉；多留 10 秒是给信号传播、收尾日志和 Compose 调度过程留缓冲。

### 经验总结

优雅停机要同时看应用和容器两层：Spring 负责拒绝新请求并等待旧请求，Docker 负责给 SIGTERM 后的进程足够时间。公共 Profile 统一配置，测试固定约定，Compose 宽限期略高于应用等待。
