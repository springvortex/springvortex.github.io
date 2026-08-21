---
layout: mypost
title: Spring Boot 微服务应用底座
categories: [ Components, Spring Boot, Microservices ]
---

如果把 Nacos、Gateway、OpenFeign 看成微服务的协作组件，Spring Boot 就是每个服务自己的底座。它负责自动装配、配置体系、Web
服务器、Actuator、测试支持和打包方式。

### 一、父级版本统一管理

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.1.0</version>
</parent>
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml)

四个可运行服务和公共模块都挂在这个父工程下。版本、插件默认行为、编码和资源过滤由父级统一决定，避免每个模块自己拼一套。

### 二、Starter 表达能力边界

项目通过 Starter 描述每个服务的能力：

- `spring-boot-starter-web`：Provider、Consumer、Mail 提供 REST 接口。
- `spring-boot-starter-actuator`：观测端点和链路自动装配。
- `spring-boot-starter-mail`：邮件服务使用 SMTP 抽象。
- `spring-boot-starter-zipkin`：链路导出。

这种写法让模块职责直接体现在依赖里。看到一个服务的 POM，基本能猜到它对外提供什么能力。

### 三、Profile 是配置组织核心

Spring Boot 的 Profile 被用来拆分 `dev`、`prod` 和公共能力配置。应用名、端口、默认环境和 `include` 留在主配置，环境差异下沉到
Profile，避免同一份 YAML 越写越难维护。

### 四、打包方式

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
</plugin>
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml)

项目采用 Fat JAR：一个可运行服务一个完整部署包。公共库已经进包内，部署时不需要再维护外部 `lib` 目录和类加载路径。

### 五、经验总结

Spring Boot 在这里的价值是标准化。每个服务虽然职责不同，但配置结构、启动方式、测试依赖和打包方式保持一致，微服务的复杂度才会留在架构层，而不是散落在运维细节里。
