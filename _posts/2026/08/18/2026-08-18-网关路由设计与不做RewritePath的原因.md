---
layout: mypost
title: 网关路由设计与不做 RewritePath 的原因
categories: [ Spring Cloud, Gateway, Architecture ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.0`

很多 Gateway 示例会在转发前把 `/api/provider/user/1` 重写成 `/user/1`。这个项目反而对业务路由不做重写，因为下游服务已经统一接受
`/api/{版本}/{模块}` 前缀。

### 一、业务路由

```text
/api/*/provider/** -> lb://service-provider
/api/*/consumer/** -> lb://service-consumer
/api/*/mail/**     -> lb://service-mail
```

路径中的版本使用通配符匹配，模块名决定路由目标。

### 二、不重写带来的好处

下游应用日志、OpenAPI 文档、异常处理看到的路径和网关入口一致。排查问题时不需要在脑中维护两套 URL 映射。

同时，下游服务即使被内网直连，也仍遵守同一套 API 契约，不会出现“网关一套路径、内网一套路径”的分裂。

### 三、OpenAPI 是例外

开发环境的 OpenAPI 转发路由会重写：

```text
/api/*/provider/v3/api-docs/**
```

转发到下游的 `/v3/api-docs/**`。这是因为 SpringDoc 原生文档地址不归业务 API 路径规范管理。

### 四、路由顺序要明确

OpenAPI 转发路由更具体，优先级更高；业务路由随后匹配。模糊规则在前，具体规则就永远轮不到。

### 五、经验总结

是否重写路径不是风格问题，而是路径所有权的决策。这个项目选择让标准路径贯穿网关和服务，换来的是更简单的排障链路。
