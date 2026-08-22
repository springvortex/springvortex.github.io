---
layout: mypost
title: JaCoCo 接入 Maven 测试报告
categories: [ Testing, Maven, Engineering ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

写测试不能只靠感觉，JaCoCo 能把测试执行后的字节码覆盖情况生成报告。项目把 JaCoCo 挂在父 POM，所有 Maven
模块统一继承，不需要每个子模块重复配置。

### 一、两个执行阶段

```xml
<execution>
  <id>prepare-agent</id>
  <goals><goal>prepare-agent</goal></goals>
</execution>
<execution>
  <id>report</id>
  <phase>test</phase>
  <goals><goal>report</goal></goals>
</execution>
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml)

`prepare-agent` 负责注入探针，`report` 在测试阶段生成 HTML、XML 等报告。

### 二、报告位置

执行测试后查看：

```text
target/site/jacoco/index.html
```

XML 报告也适合接入 CI 平台展示趋势。

### 三、覆盖率是信号，不是 KPI

覆盖率高不代表测试好，只代表这些代码被跑过。真正有价值的是：

- 分支失败路径有没有覆盖。
- 事务回滚有没有验证。
- 配置非法时是否启动失败。
- 异常响应结构是否稳定。

### 四、和 Surefire 配合

项目使用 `@{argLine}` 晚绑定，保留 JaCoCo 注入的 agent 参数，同时追加 JDK 21 需要的动态 Agent 参数，避免 Mockito 相关警告影响执行。

### 五、经验总结

JaCoCo 适合用来发现“完全没人碰过的代码”，再反推缺哪些测试。为百分比写无意义测试，是本末倒置。
