---
layout: mypost
title: OpenFeign 声明式服务调用
categories: [ Components, OpenFeign, Spring Cloud ]
---

OpenFeign 把 HTTP 服务间调用变成接口声明。Consumer 想调用 Provider，不需要手写 HTTP 客户端、拼接 URL、处理响应反序列化，而是注入一个带注解的接口。

### 一、共享契约

```java
@FeignClient(
        name = "service-provider",
        contextId = "userFeignApi",
        fallbackFactory = UserFeignFallbackFactory.class
)
public interface UserFeignApi {

    @GetMapping("/user/{id}")
    ApiResponse<UserDTO> getUser(@PathVariable("id") Long userId);
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/user/UserFeignApi.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/user/UserFeignApi.java)

这个接口放在 `service-common`，调用方复用同一份契约。`name` 对应 Nacos 服务名，`contextId` 用于隔离不同 Feign 客户端配置。

### 二、启动扫描

```java
@EnableFeignClients(basePackages = {"com.zjc.common.api"})
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/ConsumerApplication.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/ConsumerApplication.java)

Consumer 只扫描公共 API 包，不在本地重复定义 Feign 接口。接口路径和 DTO 改动时，依赖方跟随公共模块一起演进。

### 三、Feign 不只是 HTTP 工具

在这个项目里，它同时连接：

1. Nacos 服务名。
2. LoadBalancer 实例选择。
3. 统一 API 前缀拦截器。
4. FallbackFactory 降级。
5. Micrometer Tracing 上下文传播。

### 四、避坑点

1. 超时参数要区分连接超时和读超时。
2. 降级返回不能掩盖真实异常，fallback factory 要记录原因。
3. 服务名冲突或 `contextId` 缺失会导致配置串线。
4. Feign 契约属于跨服务 API，不能随手改。

### 五、经验总结

OpenFeign 让服务间调用看起来像本地接口调用，但底层仍是远程请求。把契约、超时、降级和链路一起管好，它才真的省心。
