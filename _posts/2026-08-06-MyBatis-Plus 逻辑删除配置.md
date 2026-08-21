---
layout: mypost
title: MyBatis-Plus 逻辑删除配置
categories: [ MyBatis-Plus, MySQL, Architecture ]
---

业务数据通常不允许物理删除。订单、用户、邮件记录一旦删除，审计和问题排查就没有依据。这个项目统一使用逻辑删除。

### 一、全局配置

```yaml
mybatis-plus:
  global-config:
    db-config:
      logic-delete-field: isDeleted
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/application-dev.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/application-dev.yaml)

这里的 `isDeleted` 是 Java 实体属性名，不是数据库列名。实体中再通过 `@TableField("is_deleted")` 映射数据库列。

### 二、删除变成更新

调用：

```java
userService.removeById(id);
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java)

实际效果是把对应记录的删除标记置为已删除，而不是执行 `DELETE`。

### 三、查询自动过滤

配置生效后，`list`、`page`、`getById` 等通用查询会自动追加未删除条件。业务代码不需要每个 Wrapper 都手写：

```java
.eq(User::getIsDeleted, 0)
```

### 四、注意字段命名

这个项目曾把配置误写成数据库列名 `is_deleted`，后来修正为属性名 `isDeleted`。这类错误不一定马上报错，但逻辑删除可能不生效。

### 五、设计取舍

优点：

- 保留历史数据
- 便于审计
- 删除操作可恢复

代价：

- 查询条件更复杂
- 唯一索引需要考虑已删除数据
- 需要定期归档超大表
