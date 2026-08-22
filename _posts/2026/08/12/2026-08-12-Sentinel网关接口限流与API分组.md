---
layout: mypost
title: Sentinel 网关接口限流与 API 分组
categories: [ Spring Cloud, Gateway, Sentinel ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.0`

网关限流不能只按路由粗略控制，因为同一条路由里可能有高频只读接口，也有低频写接口。项目使用 Sentinel Gateway 的 API
分组，把规则挂到更细的接口模式上。

### 一、API 分组用正则匹配

例如：

```text
/api/[^/]+/provider/user/\d+
/api/[^/]+/mail/send
```

版本位置使用 `[^/]+`，模块和资源保持明确，比整条业务路由全量限流更准确。

### 二、每条规则生成两层限制

同一个接口会同时配置：

```text
total-qps：接口全局上限
per-ip-qps：单个客户端 IP 上限
```

全局阈值保护下游，单 IP 阈值防止单个来源吃光配额。

### 三、被限流时返回统一 JSON

Sentinel 的 `BlockRequestHandler` 返回 HTTP 429 和统一响应结构：

```text
请求过于频繁，请稍后再试
```

前端不需要识别 Sentinel 默认文本。

### 四、配置先校验

接口名必须唯一，正则必须可编译，QPS 和统计窗口必须为正，并且单 IP 阈值不能超过全局阈值。非法配置直接启动失败，好过规则上线后不生效。

### 五、经验总结

限流规则要能表达业务风险。普通查询和邮件发送的承载能力完全不同，阈值也应该分开设置。
