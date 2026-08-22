---
layout: mypost
title: Reactor 自动上下文传播让 traceId 进日志
categories: [ Spring Cloud, Gateway, Observability ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

Gateway 开了链路追踪后，可能会遇到一个诡异现象：Zipkin 有 trace，日志里却没有 `traceId`。原因通常是 Reactor
异步切换线程后，ThreadLocal 里的 MDC 上下文没有跟过去。

### 一、问题根源

传统日志 MDC 依赖 ThreadLocal，而 WebFlux 的执行链可能在多个线程之间切换。上下文不传播，日志就找不到当前 trace。

### 二、开启自动传播

项目在 Gateway 配置里执行：

```java
Hooks.enableAutomaticContextPropagation();
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/config/ObservabilityConfiguration.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/config/ObservabilityConfiguration.java)

它会把 Reactor Context 和 ThreadLocal 上下文关联起来，让 Micrometer Tracing 在回调线程上恢复 MDC。

### 三、日志格式要预留字段

Logback pattern 中输出 `traceId` 和 `spanId`。上下文恢复后，网关开始和结束日志就能和 Zipkin 对上。

### 四、异步代码仍要谨慎

如果自己创建线程池或包装 Subscriber，可能仍然绕开自动传播。尽量使用框架管理的异步边界；自定义并发逻辑要显式携带上下文。

### 五、经验总结

这是 WebMVC 和 WebFlux 的思维差异：后者要把上下文当成数据流的一部分，而不是默认挂在线程上。
