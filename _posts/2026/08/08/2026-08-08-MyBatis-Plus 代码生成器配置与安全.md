---
layout: mypost
title: MyBatis-Plus 代码生成器配置与安全
categories: [ MyBatis-Plus, Generator, MySQL ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

单表 CRUD 代码很适合生成器处理。这个项目保留了一个独立的 `MP-Generator` 模块，用 MyBatis-Plus 的 `FastAutoGenerator`
根据数据库表生成 Entity、Mapper、Service、ServiceImpl 和 XML。

### 一、为什么独立成模块

代码生成器只服务开发阶段，不应该进入线上服务依赖。独立模块有几个好处：

1. 不污染业务服务依赖。
2. 可以单独运行 `main` 方法。
3. 数据库连接配置可以放本地忽略文件。
4. 生成策略修改不影响业务构建。

### 二、配置外置

生成器不把数据库连接写死在 Java 代码里，而是读取：

```text
src/main/resources/generator.properties
```

仓库里只保留模板：

```text
generator.properties.template
```

本地真实配置加入 `.gitignore`。这样换数据库、换表、换输出包名时，只改配置文件。

常用配置：

```properties
db.url=jdbc:mysql://host:3306/db?...
db.username=your-user
db.password=your-password
package.parent=com.zjc.provider
generator.tables=t_user,t_goods,t_order
generator.tablePrefix=t_
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/MP-Generator/src/main/resources/generator.properties.template](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/MP-Generator/src/main/resources/generator.properties.template)

### 三、输出目录要稳定

生成器通过 `CodeGenerator.class` 的位置反推模块根目录，再拼出：

```text
MP-Generator/src/main/java
```

这样无论从父目录还是模块目录运行，输出都不会跑到错误位置。

### 四、生成策略

当前策略是：

- 实体使用 Lombok `@Data`
- 字段显式加 `@TableField`
- 保留 `@Serial serialVersionUID`
- Mapper 文件名以 `Mapper` 结尾
- 生成 XML 的 `BaseResultMap` 和 `BaseColumnList`
- 不生成 Controller

不生成 Controller 是刻意选择。Controller 承担 API 契约、参数校验和文档注解，通常需要人工设计；Entity、Mapper、基础 Service
更适合生成。

### 五、生成后要迁移

生成的 Service 依赖 MyBatis-Plus 的 extension 和 Spring，而这些依赖属于业务模块，不属于生成器模块。所以生成后要把代码迁移到实际业务模块，再按当前分层补
DTO、转换器和测试。
