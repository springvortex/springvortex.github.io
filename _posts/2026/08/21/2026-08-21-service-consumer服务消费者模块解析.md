---
layout: mypost
title: service-consumer 服务消费者模块解析
categories: [ Microservices, OpenFeign, Spring Cloud ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

`service-consumer` 是这套微服务里的调用方示例。它自己没有数据库，也不承载核心业务数据，而是通过 OpenFeign 调用
`service-provider`，再对外暴露 `/api/v1/consumer/**` 接口。这个模块把三件事讲清楚：声明式调用怎么写、共享契约怎么复用、下游失败时怎么降级。

### 基本信息

| 项       | 值                       |
|----------|--------------------------|
| 服务名   | `service-consumer`       |
| 端口     | `9002`                   |
| API 前缀 | `/api/v1/consumer`       |
| 数据库   | 无                       |
| 远程调用 | OpenFeign + LoadBalancer |
| 服务发现 | Nacos Discovery          |

Consumer 的代码量很小，这是它最有代表性的地方：当契约被抽到 `service-common` 后，消费者不需要重复定义一堆 Feign 接口和 DTO。

### 启动类设计

```java
@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients(basePackages = {"com.zjc.common.api"})
public class ConsumerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConsumerApplication.class, args);
    }
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/ConsumerApplication.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/ConsumerApplication.java)

三个注解分别解决三件事：

1. `@SpringBootApplication`：启动 Spring Boot 应用。
2. `@EnableDiscoveryClient`：注册到 Nacos，并具备服务发现能力。
3. `@EnableFeignClients(basePackages = {"com.zjc.common.api"})`：扫描公共模块里的 Feign 契约。

这里的重点是指定扫描包。如果只写 `@EnableFeignClients`，默认扫描 Consumer 自己的包，公共模块里的 `UserFeignApi`、`TestApi`、
`MailFeignApi` 不会被创建成 Bean。

### 包结构

```text
com.zjc.consumer
├── ConsumerApplication
├── config
│   └── OpenApiConfig
├── controller
│   ├── UserConsumerController
│   └── TessFeignController
└── service
    ├── FeignService
    └── impl
        └── FeignServiceImpl
```

Controller 不直接封装 HTTP 请求，也不手写 RestTemplate；它注入 Feign 接口，让 OpenFeign 根据 Nacos 服务列表和注解声明生成代理调用。

### 用户消费接口

用户接口直接复用 common 中的 `UserFeignApi`：

```java
@GetMapping("/user/{id}")
public ApiResponse<UserDTO> getUser(@PathVariable("id") Long id) {
    return userFeignApi.getUser(id);
}

@GetMapping("/user/list")
public ApiResponse<List<UserDTO>> list() {
    return userFeignApi.list();
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/controller/UserConsumerController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/controller/UserConsumerController.java)

Feign 契约里只写资源路径 `/user/{id}`，真正发送请求前，common 的 Feign 拦截器会补上目标服务前缀，最终请求：

```text
GET http://service-provider/api/v1/provider/user/1
```

服务名到 IP 的解析交给 Nacos，实例选择交给 LoadBalancer。

### 连通性测试接口

`/feign/port` 是一个很实用的冒烟测试接口：

```java
@GetMapping("/feign/port")
public ApiResponse<String> getServerPort() {
    return feignService.getServerPort();
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/controller/TessFeignController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/controller/TessFeignController.java)

实现层委托给 `TestApi`：

```java
@Override
public ApiResponse<String> getServerPort() {
    return testApi.getServerPort();
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/service/impl/FeignServiceImpl.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/service/impl/FeignServiceImpl.java)

如果 Provider 启动了多个实例，连续调用这个接口看到端口变化，就说明 Nacos 发现和 LoadBalancer 分流都正常。

### 降级策略

`UserFeignApi` 的降级在 common 里实现：

| 接口         | 降级结果                    |
|--------------|-----------------------------|
| 查询单个用户 | `success=true`，`data=null` |
| 查询用户列表 | `success=true`，`data=[]`   |

这层设计让上层 Controller 不需要写 try-catch。Provider 宕机、网络超时或调用异常时，`UserFeignFallbackFactory`
会记录失败原因，然后返回兜底数据。

需要注意的是，这种策略适合演示和可用性优先场景。对强一致性业务，比如扣库存、支付、下单，不能一律“成功返回空数据”；该失败的调用要明确失败，否则上游可能基于不完整数据继续决策。

### Feign 与 Sentinel

Consumer 引入 Sentinel，并在生产配置中开启：

```yaml
feign:
  sentinel:
    enabled: true
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/resources/application-prod.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/resources/application-prod.yaml)

这让 Feign 方法成为可统计资源，并让 fallback factory 生效。当前网关也有自己的 Sentinel 限流和熔断规则；Consumer 侧的 Feign
熔断保护的是服务间调用，两层职责不同。

### 超时配置

生产环境 OpenFeign 超时配置：

```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          default:
            connect-timeout: 3000
            read-timeout: 5000
```

开发环境基线是连接 1000ms、读取 2000ms；生产更宽松一些，避免网络抖动造成过多降级。

如果某个接口明显更慢，可以按 `contextId` 单独配置，例如 `userFeignApi`，避免为了一个慢接口放大所有 Feign 调用的超时。

### 负载均衡与缓存

Consumer 依赖：

| 依赖                                | 作用                          |
|-------------------------------------|-------------------------------|
| `spring-cloud-starter-loadbalancer` | 从服务实例列表选择实例        |
| `caffeine`                          | 缓存服务列表，减少 Nacos 压力 |

Feign 的 `lb://service-provider` 逻辑名会先由 LoadBalancer 解析成具体实例地址。Caffeine 缓存能避免每次请求都重新拉取实例列表。

### 配置组织

基础配置：

```yaml
spring:
  application:
    name: service-consumer
  profiles:
    active: dev
    include:
      - api
      - jasypt
      - zipkin
      - nacos
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/resources/application.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/resources/application.yaml)

dev 和 prod 分别维护：

1. Nacos 地址。
2. Zipkin 地址。
3. Feign 超时。
4. Swagger 开关。
5. 链路采样率。

Nacos 只做服务发现，不用 Nacos Config。

### 链路追踪

一次用户查询会形成：

```text
Client
  -> service-consumer
    -> UserFeignApi
      -> service-provider
```

Consumer 引入 Micrometer Tracing + Zipkin 后，Feign 请求会继续传播 W3C `traceparent`。日志里用 `traceId` 聚合，Zipkin 里能看到
Consumer 发起调用和 Provider 处理请求的 span。

### 常见问题

#### 注入 UserFeignApi 报 Bean 不存在

检查启动类是否指定扫描 `com.zjc.common.api`。`@EnableFeignClients(basePackages = {"com.zjc.common.api"})` 是这个模块的关键配置。

#### 调用返回 404

Feign 契约写的是资源路径，实际需要自动补 `/api/v1/provider` 前缀。如果 common 的路径自动装配没有生效，检查业务服务是否引入
`service-common`，以及 `config/application-api.yaml` 是否被 include。

#### 一直降级

优先验证 Provider 可用，再检查 Nacos 服务列表、Feign 超时和网络安全组。`UserFeignFallbackFactory` 会记录 cause，日志是最直接的排查入口。

#### 列表为空但不知道是正常还是降级

当前降级策略会把列表调用降级为空列表。排查时要看 Consumer 是否输出了降级日志，也可以通过 Zipkin 确认 Provider span 是否存在。

### 模块小结

`service-consumer`
的代码少，但它演示了微服务间调用的关键工程约定：契约集中、声明式调用、路径自动补齐、负载均衡、超时控制、失败降级和链路传播。它是一个很好的“消费者模板”，新增业务消费者时可以按这个结构复制思路，而不是复制代码。
