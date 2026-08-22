---
layout: mypost
title: OpenFeign 服务间调用入门
categories: [ Spring Cloud, OpenFeign, Microservices ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.0`

微服务之间不能把下游服务 IP 写死。服务发现负责找到实例，OpenFeign 负责用接口声明的方式发起 HTTP 调用。

### 一、启用 Feign

启动类上开启扫描：

```java
@EnableFeignClients(basePackages = {"com.zjc.common.api"})
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/ConsumerApplication.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/ConsumerApplication.java)

这里扫描的是公共模块里的共享 Feign 契约，Consumer 本地不需要重复定义客户端。

### 二、声明客户端

```java
@FeignClient(
        name = "service-provider",
        contextId = "userFeignApi"
)
public interface UserFeignApi {

    @GetMapping("/user/{id}")
    ApiResponse<UserDTO> getUser(@PathVariable("id") Long userId);
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/user/UserFeignApi.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/user/UserFeignApi.java)

`name` 是注册中心里的服务名，Feign 会结合 LoadBalancer 选实例。`contextId` 用来隔离指向同一个服务的不同客户端配置。

### 三、Controller 直接注入接口

```java
@Resource
private UserFeignApi userFeignApi;
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/controller/UserConsumerController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/controller/UserConsumerController.java)

调用时看起来像本地方法：

```java
return userFeignApi.getUser(id);
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/controller/UserConsumerController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/src/main/java/com/zjc/consumer/controller/UserConsumerController.java)

实际发生的是：

```text
Consumer
  -> Nacos 发现 service-provider
  -> LoadBalancer 选择实例
  -> Feign 发 HTTP
  -> Provider 返回 ApiResponse
```

### 四、返回类型要一致

Feign 接口和服务端 Controller 使用同一个 DTO 和 `ApiResponse`。两端共享契约放在 `service-common`，避免手写 Map 后字段名不一致。

### 五、调试入口

Provider 提供了 `/port` 接口，Consumer 暴露：

```text
/feign/port
```

多次调用如果返回不同端口，可以验证多实例负载均衡是否生效。
