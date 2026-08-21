---
layout: mypost
title: service-gateway 统一入口模块解析
categories: [ Spring Cloud, Gateway, Microservices ]
---

`service-gateway` 是整套微服务的流量入口，基于 Spring Cloud Gateway 和 WebFlux。它不实现业务接口，也不访问数据库；它的职责是把外部请求路由到
Provider、Consumer、Mail，并在入口处做限流、熔断、日志、追踪和统一错误响应。

这个模块最重要的工程判断有两个：第一，Gateway 不依赖 `service-common`，避免 WebFlux 应用被带入 Spring MVC 体系；第二，网关只转发完整
API 前缀，不做 `RewritePath`。

### 基本信息

| 项       | 值                                      |
|----------|-----------------------------------------|
| 服务名   | `service-gateway`                       |
| 默认端口 | `80`                                    |
| 编程模型 | WebFlux                                 |
| 服务发现 | Nacos Discovery                         |
| 负载均衡 | LoadBalancer + Caffeine                 |
| 防护     | Sentinel 接口限流、单 IP 限流、路由熔断 |

默认端口是 80，但 Linux 上普通用户不能绑定 1024 以下端口。生产部署建议改成 `9000`，或由 Nginx、云负载均衡统一收口。

### 路由模型

生产路由配置：

```yaml
spring:
  cloud:
    gateway:
      server:
        webflux:
          routes:
            - id: provider-route
              uri: lb://service-provider
              predicates:
                - Path=/api/*/provider/**
              order: 1
            - id: consumer-route
              uri: lb://service-consumer
              predicates:
                - Path=/api/*/consumer/**
              order: 2
            - id: mail-route
              uri: lb://service-mail
              predicates:
                - Path=/api/*/mail/**
              order: 3
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/application-prod.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/application-prod.yaml)

路径里的 `*` 表示版本号：

```text
/api/v1/provider/user/1 -> service-provider
/api/v1/consumer/user/1 -> service-consumer
/api/v1/mail/send       -> service-mail
```

### 为什么不做 RewritePath

下游服务已经通过 `service-common` 接收完整前缀：

```text
Provider: /api/v1/provider/**
Consumer: /api/v1/consumer/**
Mail:     /api/v1/mail/**
```

所以 Gateway 按模块匹配后原样转发即可。如果在网关剥离前缀，下游再自动补前缀，路径语义会绕一圈，排查时也看不出原始路径和目标路径的对应关系。

保留完整前缀还有一个好处：后续 `/api/v2/provider/**` 只需要在下游启用 v2，Gateway 路由模式不用跟着改。

### 包结构

```text
com.zjc.gateway
├── GatewayApplication
├── config
│   ├── ObservabilityConfiguration
│   ├── SentinelGatewayConfiguration
│   ├── SentinelGatewayProperties
│   └── SentinelGatewayCircuitBreakerFilterFactory
├── controller
│   └── GatewayFallbackController
├── exception
│   ├── GatewayErrorWebExceptionHandler
│   └── SentinelGatewayBlockRequestHandler
└── filter
    └── ServiceGlobalFilter
```

每一层职责都很明确：

1. 启动类只负责 Gateway 应用和 Nacos 发现。
2. `filter` 记录请求开始、结束和耗时。
3. `config/Sentinel*` 装配限流和熔断。
4. `exception` 输出 WebFlux 版统一 JSON 错误。
5. `controller` 提供熔断后的内部兜底响应。

### 全局请求日志过滤器

`ServiceGlobalFilter` 实现 `GlobalFilter` 和 `Ordered`：

```java
log.info("开始请求{} {}", method, uri);

return chain.filter(exchange)
        .doFinally(signalType -> {
            long endTime = System.currentTimeMillis();
            log.info("结束请求 {} {}，耗时：{}ms，信号：{}",
                    method, uri, endTime - startTime, signalType);
        });
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/filter/ServiceGlobalFilter.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/filter/ServiceGlobalFilter.java)

这里用 `doFinally`，不用 `doOnSuccess`。WebFlux 请求可能正常结束、异常结束，也可能被取消；`doFinally`
三种情况都会记录，网关日志不会在异常场景缺一条结束记录。

过滤器 order 是 `0`，后续如果加鉴权、签名、灰度或租户过滤器，可以用 order 控制执行顺序。

### Reactor 上下文传播

Gateway 是异步链路，回调线程可能和发起线程不同。项目专门加了这个配置：

```java
@PostConstruct
public void enableReactorContextPropagation() {
    Hooks.enableAutomaticContextPropagation();
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/config/ObservabilityConfiguration.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/config/ObservabilityConfiguration.java)

开启后，Micrometer Tracing 才能把 Reactor Context 中的 trace 上下文恢复到回调线程的 MDC。没有它，开始日志和结束日志可能拿不到稳定的
`traceId`、`spanId`。

### Sentinel 接口限流

Sentinel 公共配置定义了两类接口规则：

| 规则                   | 路径模式                       | 全局 QPS | 单 IP QPS |
|------------------------|--------------------------------|---------|----------|
| `provider-user-detail` | `/api/[^/]+/provider/user/\d+` |      100 |        10 |
| `mail-send`            | `/api/[^/]+/mail/send`         |       20 |         2 |

```yaml
zjc:
  gateway:
    sentinel:
      interfaces:
        - name: provider-user-detail
          pattern: /api/[^/]+/provider/user/\d+
          total-qps: 100
          per-ip-qps: 10
          interval-sec: 1
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/config/application-sentinel.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/config/application-sentinel.yaml)

`SentinelGatewayConfiguration` 会把每条规则转换成两条 Gateway Flow Rule：一条接口全局 QPS，一条按 `CLIENT_IP` 参数限流。

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/config/SentinelGatewayConfiguration.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/config/SentinelGatewayConfiguration.java)

被限流时由 `SentinelGatewayBlockRequestHandler` 返回 HTTP 429 和统一 JSON 结构。

### 可信代理与真实 IP

单 IP 限流最怕伪造 `X-Forwarded-For`。这个项目的策略是：

1. 先拿 TCP 直连地址。
2. 只有直连地址在 `trusted-proxies` 里，才采信 `X-Forwarded-For` 的第一个 IP。
3. 否则使用直连地址。

默认可信代理只有：

```text
127.0.0.1
::1
0:0:0:0:0:0:0:1
```

如果生产环境前面有 Nginx、云负载均衡或 WAF，必须把它们的内网直连地址加入 `trusted-proxies`。否则看到的一直是代理
IP；反过来，也不能把不可信客户端放进白名单。

### 路由熔断

Gateway 通过默认过滤器挂载 CircuitBreaker：

```yaml
default-filters:
  - name: CircuitBreaker
    args:
      statusCodes:
        - INTERNAL_SERVER_ERROR
        - BAD_GATEWAY
        - SERVICE_UNAVAILABLE
        - GATEWAY_TIMEOUT
```

熔断阈值：

| 配置                           | 含义           |
|--------------------------------|----------------|
| `min-request-amount`           | 最小统计请求数 |
| `exception-ratio`              | 异常比例阈值   |
| `slow-request-rt-threshold-ms` | 慢请求 RT 阈值 |
| `slow-request-ratio`           | 慢请求比例阈值 |
| `stat-interval-ms`             | 统计窗口       |
| `recovery-seconds`             | 半开放恢复等待 |

触发熔断后请求进入 `/gateway/fallback/{route}`，返回 HTTP 503：

```json
{
  "success": false,
  "code": 503,
  "message": "下游服务暂不可用，请稍后再试",
  "data": null,
  "timestamp": 1787191865837
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/controller/GatewayFallbackController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/controller/GatewayFallbackController.java)

### 统一错误响应

Gateway 不能复用 `service-common` 里的 `@RestControllerAdvice`，因为那是 Spring MVC 的处理机制。这里实现了 WebFlux 的
`ErrorWebExceptionHandler`：

```java
public class GatewayErrorWebExceptionHandler
        implements ErrorWebExceptionHandler, Ordered {
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/exception/GatewayErrorWebExceptionHandler.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/exception/GatewayErrorWebExceptionHandler.java)

状态映射：

| HTTP | 业务码 | 提示           |
|-----|-------|----------------|
|  400 |    101 | 请求体格式错误 |
|  401 |    401 | 未认证         |
|  403 |    403 | 无权限         |
|  404 |    102 | 请求路径不存在 |
|  500 |    500 | 服务内部错误   |
|  503 |    503 | 服务不可用     |

这样前端在网关错误和业务错误上看到的是同一种响应结构。注意它不会拦截已经成功转发的业务响应；下游返回什么，Gateway 原样透传。

### CORS 边界

CORS 只在 dev Profile 开启，生产默认不配置。开发环境示例：

```yaml
globalcors:
  cors-configurations:
    '[/**]':
      allowed-origin-patterns:
        - '*'
      allowed-methods:
        - '*'
      allowed-headers:
        - '*'
      allow-credentials: false
      max-age: 3600
```

开发环境可以宽松；生产如果前端独立域名，应配置明确来源。`allow-credentials: true` 时不能继续使用 `*`。

### 链路追踪

生产 Zipkin endpoint：

```text
http://127.0.0.1:9411/api/v2/spans
```

采样率 `0.1`。Gateway 传播 W3C `traceparent`，下游继续同一条链路：

```text
Client -> Gateway -> Provider
Client -> Gateway -> Consumer -> Provider
Client -> Gateway -> Mail
```

排查入口请求时，先拿 Gateway 日志里的 `traceId`，再去 Zipkin 查整棵调用树。

### 端口暴露策略

生产只暴露 Gateway：

| 服务     |                   端口 | 公网 |
|----------|-----------------------|------|
| Gateway  |        80 / 443 / 9000 | 允许 |
| Provider |                   9001 | 禁止 |
| Consumer |                   9002 | 禁止 |
| Mail     |                   9004 | 禁止 |
| Nacos    | 8848、9848、9849、7848 | 禁止 |
| MySQL    |                   3306 | 禁止 |
| Zipkin   |                   9411 | 禁止 |

业务服务的 Swagger UI 也只适合内网调试，不要绕过 Gateway 直接暴露。

### 模块小结

`service-gateway` 是整个系统的安全边界和流量边界。它把“入口该做的事情”集中处理：路由、负载均衡、限流、熔断、日志、追踪、统一错误和端口收敛。同时它刻意保持轻量，不写业务逻辑，也不引入公共
MVC 模块，这让 WebFlux 网关和 MVC 业务服务的边界保持干净。
