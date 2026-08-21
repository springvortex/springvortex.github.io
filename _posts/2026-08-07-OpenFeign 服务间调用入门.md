---
layout: mypost
title: OpenFeign 服务间调用入门
categories: [ Spring Cloud, OpenFeign, Microservices ]
---

微服务之间不能把下游服务 IP 写死。服务发现负责找到实例，OpenFeign 负责用接口声明的方式发起 HTTP 调用。

### 一、启用 Feign

启动类上开启扫描：

```java
@EnableFeignClients(basePackages = {"com.zjc.common.api"})
```

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

`name` 是注册中心里的服务名，Feign 会结合 LoadBalancer 选实例。`contextId` 用来隔离指向同一个服务的不同客户端配置。

### 三、Controller 直接注入接口

```java
@Resource
private UserFeignApi userFeignApi;
```

调用时看起来像本地方法：

```java
return userFeignApi.getUser(id);
```

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
