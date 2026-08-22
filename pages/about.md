---
layout: mypost
title: 关于
body_class: page-about
description: SpringVortex Notes 的定位、内容来源、实践项目和维护方式。
---

### 这里是什么

SpringVortex Notes 是 zjc 的个人技术档案。内容集中在 Java 后端、Spring Cloud Alibaba、微服务工程、中间件部署和问题排查，也会记录一些为了让这个博客稳定运行而做的前端和构建工作。

这里的文章更像工程笔记：先在真实项目里跑通，再整理依赖、版本、配置和边界条件。比起“某个功能终于能启动了”，我更关心它为什么这样工作、在什么条件下会失效，以及下一次如何更快定位。

### 内容原则

- 优先记录亲手执行过的操作、配置和代码，不把资料搬运当作笔记。
- 保留关键版本、分支和运行环境，避免半年后连自己都无法复现。
- 记录失败原因、排查路径和临时取舍，不只保留最后成功的片段。
- 结论会随着项目演进更新，涉及项目代码的文章以文章开头标注的环境为准。

### 实践项目

博客中大量微服务文章来自同一个 Spring Cloud Alibaba 实践项目。它不是照抄示例的 demo，而是用来验证组件组合、边界行为和工程化约定的试验场。

| 项目 | 信息 |
| --- | --- |
| 仓库 | [spring-cloud-alibaba](https://github.com/springvortex/spring-cloud-alibaba.git) |
| 分支 | `release/v1.0.0` |
| JDK | `21` |
| 构建 | Maven 多模块 |
| Spring Boot | `4.1.0` |
| Spring Cloud | `2025.1.2` |
| Spring Cloud Alibaba | `2025.1.0.0` |

项目覆盖公共响应与异常约定、业务服务、OpenFeign 调用、Gateway 入口、Sentinel 限流、邮件服务、链路追踪和单元测试。文章里出现相关代码时，通常可以直接去仓库对照完整上下文。

### 站点工程

这个博客本身也是一个小型静态工程：Jekyll 负责生成文章和索引，GitHub Actions 负责构建部署，前端保持原生 HTML、CSS 和 JavaScript。搜索、RSS、sitemap、PWA、二维码和明暗主题都在仓库内维护，尽量不引入不必要的运行时依赖。

### 联系我

如果你发现文章里的错误、版本差异，或者想讨论某个实现方式，欢迎联系：[Contact me](mailto:jiancai.zhong.1997@gmail.com)
