---
layout: mypost
title: MyBatis-Plus 数据访问组件总览
categories: [ Components, MyBatis-Plus, MySQL ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

MyBatis-Plus 是 Provider 和 Mail 的数据访问组件。它没有替代数据库设计，而是把单表
CRUD、分页、逻辑删除、审计填充这类通用模式标准化，让业务代码集中处理业务规则。

### 一、分页拦截器

```java
@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor() {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
    return interceptor;
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/MybatisPlusConfig.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/MybatisPlusConfig.java)

分页不是传一个 `Page` 对象就自动生效，必须注册拦截器。这里同时指定 MySQL 方言，让 SQL 改写有明确目标。

### 二、通用规则放在配置里

项目统一配置：

- Mapper XML 扫描路径。
- 实体别名包。
- 下划线转驼峰。
- 雪花 ID。
- `isDeleted` 逻辑删除字段。

这些规则是数据访问层契约，写一次比每个业务模块手写一遍更可靠。

### 三、分层使用方式

Entity 只留在服务内部，接口层使用 DTO。Mapper 继承 `BaseMapper`，Service 继承 `IService`，通用能力直接复用；订单主表明细这类复杂写入，再由业务
Service 用事务组织。

### 四、避坑点

1. 逻辑删除配置里写的是实体属性名，不是数据库列名。
2. 分页返回 DTO 时不能只拷贝 `records`，还要保留总数和页码。
3. 复杂查询和批量规则要警惕性能，通用方便不等于无限安全。
4. 代码生成器生成的是起点，不是最终业务模型。

### 五、经验总结

MyBatis-Plus 的定位是减少重复数据访问代码。这个项目把它约束在 Provider 和 Mail 内部，公共模块不携带 ORM，边界也比较干净。
