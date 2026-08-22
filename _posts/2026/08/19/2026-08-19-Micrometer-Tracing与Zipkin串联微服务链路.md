---
layout: mypost
title: Micrometer Tracing 与 Zipkin 串联微服务链路
categories: [ Observability, Spring Boot, Microservices ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

一次请求经过 Gateway、Provider、Consumer 后，如果每个服务只有自己的日志，拼事故时间线会很痛苦。项目为四个可运行服务引入
Micrometer Tracing、Brave 和 Zipkin，用同一个 `traceId` 串联调用链。

### 一、依赖

每个服务都引入：

```text
spring-boot-starter-actuator
spring-boot-starter-zipkin
```

Actuator 提供观测基础，Zipkin starter 负责导出链路数据。

### 二、采样策略

开发环境使用：

```yaml
management:
  tracing:
    sampling:
      probability: 1.0
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/application-prod.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/application-prod.yaml)

生产环境降低到 0.1。全采样便于排查，低采样控制成本，这是常见的环境差异。

### 三、请求头传播

服务之间会传播 W3C `traceparent` 请求头。Gateway 发起调用，下游服务继续同一个 trace，并在合适位置创建 span。

### 四、排查路径

1. 从网关日志拿 `traceId`。
2. 在 Zipkin 查询该 trace。
3. 查看各服务 span 的耗时和异常。
4. 用同一个 `traceId` 聚合日志。

### 五、经验总结

链路追踪的价值在跨进程边界。只在一个服务里埋点，看不到网关、Feign、数据库和外部服务之间的完整关系。
