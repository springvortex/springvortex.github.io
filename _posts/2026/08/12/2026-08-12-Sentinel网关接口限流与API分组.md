---
layout: mypost
title: Sentinel 网关接口限流与 API 分组
categories: [ Spring Cloud, Gateway, Sentinel ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

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
