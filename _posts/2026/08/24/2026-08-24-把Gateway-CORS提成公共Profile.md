---
layout: mypost
title: 把 Gateway CORS 提成公共 Profile
categories: [ Spring Cloud, Gateway, Configuration ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - 提交：`8d8a91c`
> - JDK：`21`
> - Spring Boot：`4.1.0`

这次提交把 Gateway 的 CORS 配置从 `application-dev.yaml` 移到独立的 `config/application-cors.yaml`，再由基础配置引入：

```yaml
spring:
  profiles:
    include:
      - cors
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/application.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/application.yaml)

公共配置如下：

```yaml
spring:
  cloud:
    gateway:
      server:
        webflux:
          globalcors:
            cors-configurations:
              '[/**]':
                allowed-origin-patterns:
                  - '*'
                allowed-headers:
                  - '*'
                allowed-methods:
                  - '*'
                allow-credentials: false
                max-age: 3600
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/config/application-cors.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/config/application-cors.yaml)

调整后 dev 和 prod 共用同一份 CORS 策略，环境文件只保留真正有环境差异的路由、地址、文档开关和采样率。这样避免了一个常见漂移：开发环境允许跨域，生产环境却悄悄没有配置，前端上线时才暴露问题。

这里最关键的约束是：

```text
allowed-origin-patterns = *
allow-credentials = false
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/config/application-cors.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/resources/config/application-cors.yaml)

通配来源和携带凭证不能同时放开。当前系统不通过 Cookie 做跨域凭证，所以可以使用通配来源；如果以后要携带 Cookie，必须把来源改成明确的真实域名。

配置测试同时断言了三件事：基础配置包含 `cors` profile，dev/prod 没有自己的 `globalcors` 覆盖，公共文件中的来源、方法、请求头和不允许凭证的基线正确。CORS 是安全边界的一部分，靠“浏览器试一下”不够。

### 经验总结

CORS 不只是前端报错时的补丁，而是网关的入口策略。把它提成公共 Profile，环境差异只留下地址和运行开关，策略行为才能在 dev/prod 之间保持一致。
