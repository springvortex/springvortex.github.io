---
layout: mypost
title: 本地 Profile 组织 dev prod 和公共配置
categories: [ Configuration, Spring Boot, Microservices ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.0`

配置管理的关键不是文件数量，而是每类信息只有一个固定位置。项目最终采用本地 Profile 打包方案：服务包内保留环境配置，启动时按
`dev` 或 `prod` 切换。

### 一、基础配置保持稳定

`application.yaml` 只保留：

- 应用名。
- 服务端口。
- 默认激活环境。
- 需要引入的公共 Profile。

例如业务服务会引入 `api`、`jasypt`、`zipkin`、`nacos`；Gateway 则引入 `nacos`、`zipkin`、`sentinel`。

### 二、公共能力单独成 Profile

```text
config/application-api.yaml
config/application-jasypt.yaml
config/application-nacos.yaml
config/application-zipkin.yaml
```

API 前缀、加密算法、注册中心认证、链路导出这些公共规则不再复制到每个服务。

### 三、环境差异集中在 env 文件

`application-dev.yaml` 和 `application-prod.yaml` 维护环境差异，例如外部组件地址、采样率、文档开关和日志细节。生产切换：

```bash
java -jar app.jar --spring.profiles.active=prod
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/README.md)

### 四、修改配置要重新打包

当前业务配置随 JAR 分发，没有放在远程配置中心。修改环境配置后需要重新构建并重启对应服务。这换来的是配置来源简单、启动依赖少。

### 五、经验总结

当配置规模还没大到需要动态下发时，本地 Profile 加清晰分组是更朴素的方案。先把边界整理干净，以后迁移配置中心也不会痛苦。
