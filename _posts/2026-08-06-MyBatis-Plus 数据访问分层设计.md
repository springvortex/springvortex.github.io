---
layout: mypost
title: MyBatis-Plus 数据访问分层设计
categories: [ MyBatis-Plus, MySQL, Spring Boot ]
---

这个项目的数据层采用很朴素的三层：

```text
Entity      对应数据库表
Mapper      继承 BaseMapper
Service     继承 IService
ServiceImpl 继承 ServiceImpl
```

这不是为了套层次，而是把职责说清楚：Entity 不出模块，Mapper 负责数据库访问，Service 承载业务语义。

### 一、Entity

实体类用 `@TableName` 映射表，用 `@TableId` 指定主键策略：

```java
@TableName("t_user")
public class User {
    @TableId(value = "user_id", type = IdType.ASSIGN_ID)
    private Long userId;
}
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/main/service-provider/src/main/java/com/zjc/provider/entity/User.java](https://github.com/springvortex/spring-cloud-alibaba/blob/main/service-provider/src/main/java/com/zjc/provider/entity/User.java)

分布式部署下，自增 ID 容易受单库限制，所以这里使用雪花 ID。

### 二、Mapper

```java
public interface UserMapper extends BaseMapper<User> {
}
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/main/service-provider/src/main/java/com/zjc/provider/mapper/UserMapper.java](https://github.com/springvortex/spring-cloud-alibaba/blob/main/service-provider/src/main/java/com/zjc/provider/mapper/UserMapper.java)

单表 CRUD 直接继承 `BaseMapper`，不手写重复 SQL。复杂查询再通过 Wrapper 或 XML 扩展。

### 三、Service

```java
public interface UserService extends IService<User> {
}
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/main/service-provider/src/main/java/com/zjc/provider/service/UserService.java](https://github.com/springvortex/spring-cloud-alibaba/blob/main/service-provider/src/main/java/com/zjc/provider/service/UserService.java)

Service 层不是简单转发 `getById`。它更适合承载：

- 多表一致性
- 业务校验
- 事务边界
- 领域语义

如果只是单表查询，Controller 可以直接调用通用 Service；一旦出现订单和明细这种多表关系，就必须收进 Service 事务方法。

### 四、逻辑删除字段

实体中保留 `isDeleted` 字段，并交给 MyBatis-Plus 统一处理。这个字段属于数据内部状态，不会暴露到 DTO。

### 五、注意

1. Entity 不作为 API 契约返回。
2. Mapper 不写业务规则。
3. Service 不依赖 Controller 上下文。
4. 分页插件必须配置，否则 `Page` 只是普通参数，不会真正改写 SQL。
