---
layout: mypost
title: About
---

### 关于我

我是一名热爱技术的开发者，主要关注 Java 后端、Spring 生态、微服务架构以及实际项目中的工程化实践。比起只把功能跑起来，我更喜欢把依赖关系、运行边界和配置背后的机制弄清楚，再沉淀成可以复用的笔记。

这个博客是我的个人技术空间，用来记录学习笔记、部署过程、系统优化、问题排查和一些值得留下来的思考。文章可能不长，但我会尽量保证它来自真实操作，而不是简单的资料搬运。

### 我的项目

我维护着一个 Spring Cloud Alibaba 微服务实践项目。

它不是照着示例抄一遍的 demo，而是我用来验证 Spring Cloud Alibaba 各组件如何组合工作的工程化试验场。当前核心版本如下：

| 类别 | 选型 |
| --- | --- |
| 语言 | Java 21 |
| 构建 | Maven 多模块 |
| 基础框架 | Spring Boot 4.1.0 |
| 微服务框架 | Spring Cloud 2025.1.2 |
| Spring Cloud Alibaba | 2025.1.0.0 |
| ORM | MyBatis-Plus 3.5.17 |
| 注册中心 | Nacos |
| 服务调用 | OpenFeign |
| 网关 | Spring Cloud Gateway |
| 服务防护 | Sentinel |
| 链路追踪 | Micrometer Tracing + Zipkin |
| 接口文档 | SpringDoc OpenAPI |

### 模块结构

| 模块 | 职责 |
| --- | --- |
| `service-common` | 公共模块，提供统一响应、全局异常处理、接口日志切面、DTO、共享 Feign 契约和标准 API 路径约定 |
| `service-provider` | 业务核心服务，包含用户、商品、订单和订单明细等 CRUD，订单保存与删除使用事务保证主表和明细一致 |
| `service-consumer` | 服务消费者，通过 OpenFeign 调用 provider，并包含用户接口降级和链路连通性测试 |
| `service-gateway` | API 网关，负责统一入口、路由转发、OpenAPI 聚合、Sentinel 限流与熔断、统一 JSON 错误响应 |
| `service-mail` | 邮件服务，支持纯文本和 HTML 邮件，发送过程会写入日志表并记录成功或失败状态 |
| `MP-Generator` | 独立的 MyBatis-Plus 代码生成器，用于按数据库表生成 Entity、Mapper、Service 和 XML |

### 这个项目的特点

项目采用 Maven 父子结构管理公共版本和构建插件。业务服务统一返回 `ApiResponse`，后端接口通过 `service-common` 自动挂载 `/api/{version}/{module}` 前缀，避免每个 Controller 手写重复路径。

Gateway 基于 WebFlux 独立实现，不复用 WebMVC 的全局异常处理逻辑。它目前提供路由转发、开发环境 OpenAPI 聚合、接口级 QPS 限制、单 IP 限流、路由熔断以及统一错误响应。Sentinel 的客户端 IP 解析只信任配置中的可信代理，避免请求方伪造 `X-Forwarded-For` 绕过限制。

链路方面，几个可运行服务都接入了 Micrometer Tracing 和 Zipkin。请求从 Gateway 进入后，经过 Consumer、Provider 或 Mail 服务时可以保持同一个 `traceId`，方便把日志和调用树对应起来排查问题。

项目也有一套比较完整的单元测试，覆盖公共响应与异常处理、API 路径自动装配、Provider 的 CRUD 和订单事务、Mail 发送成败路径、Gateway 的 Sentinel 配置与错误处理，以及各环境 Profile 的关键约定。当前本地执行 `mvn test` 时，6 个 Maven 模块可以全部构建成功。

### 联系我

如果你对博客文章或项目内容有想法，欢迎通过邮件联系我：

[jiancai.zhong.1997@gmail.com](mailto:jiancai.zhong.1997@gmail.com)
