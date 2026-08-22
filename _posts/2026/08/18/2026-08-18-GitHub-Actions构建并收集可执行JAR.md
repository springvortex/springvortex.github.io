---
layout: mypost
title: GitHub Actions 构建并收集可执行 JAR
categories: [ CI, Maven, GitHub Actions ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

多模块 Maven 项目的 CI 除了“构建成功”，还要回答一个很现实的问题：构建产物在哪里。这个项目用 GitHub Actions 构建，并只收集真正可执行的
JAR 作为 Artifact。

### 一、触发和权限

工作流在 `main` 的 push、pull request 和手动触发时运行，默认只给 `contents: read`。权限从最小开始，是 CI 的基本素养。

### 二、构建命令

```bash
mvn -B -ntp package -DskipTests --file pom.xml
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/.github/workflows/maven.yml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/.github/workflows/maven.yml)

当前打包阶段跳过测试，构建速度更快。测试要真正进入发布门禁，可以增加独立测试步骤或单独工作流。

### 三、识别可执行 JAR

脚本遍历模块 `target` 下的 JAR，读取 `META-INF/MANIFEST.MF`：

```text
存在 Main-Class -> 可执行应用 JAR
不存在 Main-Class -> 普通库 JAR
```

这样 `service-common` 这类公共库不会混进部署包。

### 四、Artifact 校验

如果一个可执行 JAR 都没找到，脚本直接失败；上传 Artifact 也配置为没有文件时报错，避免“CI 绿了但包没交出来”。

### 五、经验总结

CI 的产物规则要和部署方式一致。这个项目部署的是各服务 Fat JAR，公共库已经在依赖里，所以只收集带 `Main-Class` 的 JAR。
