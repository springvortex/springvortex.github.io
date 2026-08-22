---
layout: mypost
title: service-common 依赖边界重构
categories: [ Architecture, Maven, Spring Boot ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

公共模块最容易变成垃圾桶：为了几个 DTO，把 Web、数据库、Swagger、Sentinel 全部传递给下游。项目后来重构了 `service-common`
的依赖边界，让它只做公共库，不替业务服务决定运行时栈。

### 一、公共模块只声明直接用到的 API

例如源码直接使用 Spring MVC、AutoConfigure、AspectJ、OpenFeign Core、SpringDoc Common，就在 `service-common/pom.xml`
显式声明。没有直接使用的完整 starter 不往里塞。

### 二、运行能力下沉到服务

```text
Web 容器        provider / consumer / mail
OpenFeign      consumer
Sentinel Feign consumer
数据库          provider / mail
Swagger UI     对外提供文档的服务
```

这样公共包不会把 Tomcat、驱动、UI 依赖传递给不需要的模块。

### 三、Gateway 刻意不引入

Gateway 是 WebFlux 技术栈，不依赖 `service-common`，避免公共模块里的 WebMVC 假设和自动装配混进来。网关自己的错误处理、日志和响应结构单独实现。

### 四、公共库不 repackage

`service-common` 保持普通 JAR：

```text
spring-boot.repackage.skip=true
```

它只作为依赖进入业务服务的 Fat JAR，自己不独立启动。源码 JAR 一并打包，方便 IDE 查看实现。

### 五、经验总结

公共模块的依赖越克制，升级 Spring Boot 和 Spring Cloud 时影响面越清楚。公共代码新增 import 时，要同步补直接依赖，而不是蹭下游的传递依赖。
