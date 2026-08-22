---
layout: mypost
title: MyBatis-Plus 审计时间自动填充
categories: [ MyBatis-Plus, MySQL, Spring Boot ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

`create_time` 和 `update_time` 不应该依赖每个业务方法手动赋值。人工赋值一定会漏，而且不同开发写法可能不同。

### 一、实体标记填充时机

```java
@TableField(value = "create_time", fill = FieldFill.INSERT)
private LocalDateTime createTime;

@TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
private LocalDateTime updateTime;
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/entity/User.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/entity/User.java)

含义：

- 新增时填充创建时间和更新时间
- 更新时刷新更新时间

### 二、实现 MetaObjectHandler

```java
@Component
public class AuditMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        this.strictInsertFill(metaObject, "createTime",
                LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "updateTime",
                LocalDateTime.class, LocalDateTime.now());
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updateTime",
                LocalDateTime.class, LocalDateTime.now());
    }
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/AuditMetaObjectHandler.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/AuditMetaObjectHandler.java)

`strictInsertFill` 可以保留已有值，不会无脑覆盖业务已经设置的时间。

### 三、时区

项目统一使用 `Asia/Shanghai`：

```java
LocalDateTime.now(ZoneId.of("Asia/Shanghai"))
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/AuditMetaObjectHandler.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/AuditMetaObjectHandler.java)

只改数据库连接参数不够，Java 代码里生成的时间也要有明确时区语义。

### 四、验证

新增一条记录：

```text
create_time = 当前时间
update_time = 当前时间
```

再更新同一条记录：

```text
create_time 不变
update_time 刷新
```

### 五、注意

自动填充只对 MyBatis-Plus 认识的实体写入生效。手写 SQL、批量导入脚本、数据库默认值都要另行核对。
