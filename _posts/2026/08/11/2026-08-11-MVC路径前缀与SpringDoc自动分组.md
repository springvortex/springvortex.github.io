---
layout: mypost
title: MVC 路径前缀与 SpringDoc 自动分组
categories: [ Spring Boot, REST, OpenAPI ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.0`

统一前缀不只是 URL 好看，还直接影响接口文档分组。项目的 `ApiPathAutoConfiguration` 同时做两件事：给 MVC 追加路径前缀，并为每个版本生成
SpringDoc 分组。

### 一、按版本追加 MVC 前缀

自动配置注册 `WebMvcConfigurer`，对每个版本调用 `addPathPrefix`。默认 Controller 使用默认版本，标注 `@ApiVersion("v2")` 的
Controller 使用 v2 前缀。

这样资源路径不变，版本通过外层前缀区分，符合常见的 API 版本演进方式。

### 二、包范围避免误伤

公共模块优先使用 Spring Boot 自动推断的应用包，也可以通过 `base-packages` 明确限制。只有位于范围内的 Controller
才追加前缀，避免把第三方 Controller 也改了路径。

### 三、OpenAPI 分组自动生成

版本 `v1`、模块 `provider` 会生成：

```text
分组名：v1-provider
匹配路径：/api/v1/provider/**
```

多个版本共存时，Swagger UI 可以直接切换，不需要手工维护每组路径。

### 四、版本注解只是选择器

`@ApiVersion` 不负责解析路径，只声明“这个 Controller 属于哪个版本”。如果声明了未配置的版本，启动会失败，避免文档和真实路径不一致。

### 五、经验总结

路由规则、接口文档和版本演进放在同一个自动配置里，是保持一致性的关键。否则文档分组很容易落后于真实接口。
