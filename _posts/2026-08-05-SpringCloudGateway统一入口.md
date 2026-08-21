---
layout: mypost
title: Spring Cloud Gateway 统一入口
categories: [ Components, Spring Cloud, Gateway ]
---

Gateway 是外部请求进入这套微服务系统的唯一入口。浏览器、脚本或第三方调用方只需要知道 Gateway 地址和统一路径规则，不需要知道 Provider、Consumer、Mail 分别部署在哪个端口和哪台机器上。

### 一、路由按服务名转发

```yaml
- id: provider-route
  uri: lb://service-provider
  predicates:
    - Path=/api/*/provider/**
  order: 1
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/application-dev.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/application-dev.yaml)

`lb://service-provider` 表示先通过服务发现拿到实例，再由 LoadBalancer 选择一个实例转发。路由规则保留 `/api/{version}/provider` 这类统一前缀，下游服务继续使用自己的资源路径。

### 二、WebFlux 是它的基本模型

Gateway 基于 Reactor，过滤器返回 `Mono<Void>`。全局过滤器使用 `doFinally` 记录结束日志：

```java
return chain.filter(exchange)
        .doFinally(signalType -> {
            long endTime = System.currentTimeMillis();
            log.info("结束请求 {} {}，耗时：{}ms，信号：{}", method, uri, endTime - startTime, signalType);
        });
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/filter/ServiceGlobalFilter.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/filter/ServiceGlobalFilter.java)

这不是为了炫技，而是 Gateway 的执行模型决定的。

### 三、职责边界

Gateway 负责：

1. 统一路径和服务路由。
2. 全局请求日志。
3. Sentinel 限流与路由熔断入口。
4. OpenAPI 文档聚合入口。
5. 统一 JSON 错误响应。

它不承载业务规则，也不直接访问业务数据库。这个边界让入口层可以专心处理流量问题。

### 四、避坑点

1. Gateway 是 WebFlux，不能复用 MVC 的 `RestControllerAdvice`。
2. 路由重写要少用，路径前缀尽量由公共 API 模块统一。
3. 生产环境不应把所有服务端口一起暴露，只暴露 Gateway。
4. CORS、可信代理、客户端 IP 解析要在入口层统一想清楚。

### 五、经验总结

Gateway 的价值是把“外部访问”和“内部服务拓扑”拆开。内部服务可以换端口、加实例、换机器，外部契约仍然稳定。
