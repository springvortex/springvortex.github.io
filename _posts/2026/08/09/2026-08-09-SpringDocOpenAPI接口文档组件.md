---
layout: mypost
title: SpringDoc OpenAPI 接口文档组件
categories: [ Components, OpenAPI, Spring Boot ]
---

SpringDoc OpenAPI 负责把代码里的接口注解转换成 OpenAPI 文档，再通过 Swagger UI 查看。这个项目的原则是：接口定义变化时，文档跟着代码一起变化。

### 一、服务级元信息

```java
@Bean
public OpenAPI openAPI() {
    return new OpenAPI()
            .servers(List.of(server))
            .info(new Info()
                    .title("Service Provider API")
                    .version("v1.0.0"));
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/OpenApiConfig.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/OpenApiConfig.java)

每个服务维护自己的标题、描述和版本。接口分组则由公共 API 路径模块根据统一前缀自动生成。

### 二、文档入口分两层

单个服务提供：

- `/swagger-ui.html`
- `/v3/api-docs`
- 分组 JSON，例如 `/v3/api-docs/v1-provider`

Gateway 再把 Provider、Consumer、Mail 的文档地址聚合成一个入口。这样本地调试可以看单服务，联调时可以从网关看全貌。

### 三、环境开关

开发环境开启 `api-docs` 和 `swagger-ui`；生产环境默认关闭。文档是开发和联调工具，不应该默认变成生产接口清单。

### 四、避坑点

1. DTO 注解和 Controller 注解要描述同一份契约。
2. 文档路径经过 Gateway 时要单独设计转发规则。
3. 生产关闭文档不等于接口鉴权可以省略。
4. 版本分组要和统一 API 前缀一致，避免文档路径和真实路径分叉。

### 五、经验总结

SpringDoc 让文档回到代码源头。它解决的不是“有没有文档”，而是文档能不能随接口演进而同步。
