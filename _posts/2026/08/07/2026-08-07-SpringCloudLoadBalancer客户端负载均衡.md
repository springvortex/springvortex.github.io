---
layout: mypost
title: Spring Cloud LoadBalancer 客户端负载均衡
categories: [ Components, LoadBalancer, Spring Cloud ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

当 `lb://service-provider` 或 Feign 通过服务名发起调用时，总要有人回答一个问题：这个服务当前有多个实例，这次选哪一个？在这套项目里，答案由
Spring Cloud LoadBalancer 给出。

### 一、作为调用链的一环引入

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-loadbalancer</artifactId>
</dependency>
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/pom.xml)

Consumer 和 Gateway 都引入 LoadBalancer。Gateway 根据路由转发，Feign 根据服务名调用，两者最终都需要客户端侧选择实例。

### 二、客户端负载均衡的含义

它不是一台独立的中转机器，而是嵌在调用方进程里的选择逻辑。调用方从 Nacos 拿到实例列表，再按负载均衡策略选一个实例发起连接。

这带来两个特点：

1. 少一跳集中式转发组件。
2. 调用方需要维护实例缓存和选择策略。

### 三、实例列表需要缓存

服务实例列表来自注册中心，但每次调用都实时拉取会把 Nacos 打成热点。项目为 LoadBalancer 引入 Caffeine
缓存，在“实例感知及时性”和“调用性能”之间取平衡。

### 四、避坑点

1. 服务下线后，客户端可能短时间内仍拿到旧实例，要结合重试和超时处理。
2. 实例数很少时，负载均衡效果天然有限。
3. 本地调试多实例时，先确认端口和注册元数据。
4. Gateway 里的 `lb://` 和 Feign 里的服务名都依赖服务发现健康数据。

### 五、经验总结

LoadBalancer 是服务发现和真实请求之间的桥。它不显眼，但决定了服务名调用能否稳定落到一个具体实例上。
