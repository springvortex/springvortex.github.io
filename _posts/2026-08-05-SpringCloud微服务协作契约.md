---
layout: mypost
title: Spring Cloud 微服务协作契约
categories: [ Components, Spring Cloud, Microservices ]
---

Spring Cloud 本身不是一个功能点，而是一组微服务协作规范。这个项目用它统一管理 Gateway、OpenFeign、LoadBalancer、CircuitBreaker 等依赖版本，让这些组件在同一套版本语义下工作。

### 一、BOM 固定协作版本

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-dependencies</artifactId>
    <version>2025.1.2</version>
    <type>pom</type>
    <scope>import</scope>
</dependency>
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml)

父 POM 导入 BOM 后，业务模块只声明 `spring-cloud-starter-*`，不手写具体版本。Spring Cloud 的组件之间有版本兼容关系，靠子模块各自挑版本很容易挖坑。

### 二、项目实际使用的协作能力

1. 服务注册发现：Nacos Discovery。
2. 声明式调用：OpenFeign。
3. 客户端负载均衡：Spring Cloud LoadBalancer。
4. 统一入口：Spring Cloud Gateway。
5. 熔断抽象：Spring Cloud CircuitBreaker 接 Sentinel 实现。
6. 文档聚合：Gateway 组合各服务的 SpringDoc OpenAPI 地址。

这些能力分别落在不同模块里，但版本和语义由 Spring Cloud 统一起来。

### 三、Alibaba 生态同样受版本约束

项目同时导入 Spring Cloud Alibaba BOM。Nacos、Sentinel 以及 Sentinel CircuitBreaker 相关依赖都从这里获得版本。Spring Boot、Spring Cloud、Spring Cloud Alibaba 三者的版本关系是这个项目依赖治理的核心。

### 四、避坑点

1. 不要只升级一个 Spring Cloud 组件，先看整体版本矩阵。
2. Gateway 是 WebFlux 模型，不能照搬 MVC 的异常处理方式。
3. OpenFeign 背后还需要 LoadBalancer 负责选实例。
4. 熔断、限流、降级是三件相关但不同的事，规则不要混在一起。

### 五、经验总结

Spring Cloud 提供的是“协作契约”。这个项目把契约固定在父 POM，再把 Gateway、Feign、Nacos、Sentinel 放到合适的模块里，既保持组合能力，也避免每个服务重复配置。
