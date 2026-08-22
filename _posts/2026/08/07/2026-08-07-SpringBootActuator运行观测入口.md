---
layout: mypost
title: Spring Boot Actuator 运行观测入口
categories: [ Components, Spring Boot, Observability ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

Actuator 是四个可运行服务共同引入的观测基础。它提供运行端点，也为链路追踪相关自动装配提供入口。

### 一、统一依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-consumer/pom.xml)

Provider、Consumer、Gateway、Mail 都使用它。观测能力不是某个服务的专属功能，所有参与请求链路的服务都应该暴露一致的运行信息。

### 二、它关注应用，不关注业务

Actuator 更适合回答：

1. 进程是否活着。
2. 依赖是否异常。
3. 请求链路是否开启导出。
4. 运行时指标是否可采集。

业务层面的用户数、订单量，仍应由业务接口和数据库统计提供。

### 三、与链路追踪配合

项目中的 `spring-boot-starter-zipkin` 基于 Micrometer Tracing 和 Brave 导出链路。Actuator 管理模型让这类观测能力可以按
Starter 统一装配，不需要每个服务手写。

### 四、避坑点

1. 生产环境要控制暴露端点和权限。
2. 健康检查和业务可用性不是完全等价。
3. 指标采集会增加少量开销，采样和暴露范围要规划。
4. 内部管理端点不应随 Gateway 公开暴露。

### 五、经验总结

Actuator 是服务的体检入口。它让“服务注册上去了”和“服务真的能正常工作”之间有了更多判断依据。
