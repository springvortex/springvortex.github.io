---
layout: mypost
title: Micrometer Tracing 链路上下文组件
categories: [ Components, Observability, Spring Boot ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

Micrometer Tracing 负责 traceId、spanId 的创建和跨进程传播。它是日志与调用链能串起来的前提，不负责存储和展示调用链。

### 一、Reactor 场景要开启上下文传播

```java
@PostConstruct
public void enableReactorContextPropagation() {
    Hooks.enableAutomaticContextPropagation();
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/config/ObservabilityConfiguration.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/config/ObservabilityConfiguration.java)

Gateway 是异步链路，线程会切换。开启自动上下文传播后，traceId 才能恢复到回调线程的 MDC，被日志输出。

### 二、跨服务靠标准请求头

服务之间传播 W3C `traceparent` 请求头。一个请求从 Gateway 进入，再调用 Provider 或 Mail，仍然保持同一个 traceId。

### 三、采样是成本开关

开发环境使用全采样，方便排查；生产环境使用低采样率，控制链路数据量。采样策略要跟环境目标匹配。

### 四、避坑点

1. 异步线程、线程池、Reactor 回调都可能丢上下文。
2. 日志格式要包含 traceId/spanId 才能真正使用。
3. 有 traceId 不代表每个服务都导出了 span。
4. 采样率越高，观测越细，成本也越高。

### 五、经验总结

Micrometer Tracing 是可观测性的上下文基础。它让一次请求在不同服务、不同线程之间仍然可以被识别为同一件事。
