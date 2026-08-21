---
layout: mypost
title: Entity 与 DTO 分离的接口契约
categories: [ REST, Architecture, MyBatis-Plus ]
---

接口直接返回 Entity 很省事，但代价是数据库结构被泄漏成 API 契约。以后加一个内部字段，前端可能收到不该看到的数据；改一个列名，接口也可能跟着变。

### 一、分离原则

```text
Entity：数据库映射，只在服务模块内部使用
DTO：对外契约，放在 common，供服务和调用方共享
```

用户实体可能有：

```text
is_deleted
update_time
内部状态字段
```

DTO 只保留调用方需要的内容，例如用户名、昵称、邮箱、状态、创建时间。

### 二、DTO 放哪里

这个项目的 DTO 放在 `service-common`。原因是 Consumer 通过 Feign 调用 Provider，两边需要同一份契约。

这带来一个边界要求：DTO 应该稳定、简单、可序列化，不要把各种模块内部实现都放进去。

### 三、转换发生在哪里

Controller 层负责接收请求并返回 DTO，Service 内部可以继续使用 Entity。转换逻辑由 MapStruct Converter 处理：

```java
UserDTO toDto = userConverter.entityToDto(user);
```

新增数据时再反向转换：

```java
User user = userConverter.dtoToEntity(dto);
```

### 四、DTO 上的校验

DTO 同时承担请求体校验：

```java
@NotBlank(message = "登录账号不能为空")
@Size(min = 3, max = 20)
private String username;
```

这样契约、校验和文档都围绕同一个对象，避免接口定义和校验规则分叉。

### 五、收益

1. 数据库结构变化不直接破坏接口。
2. 内部字段不会默认序列化出去。
3. Feign 两端共享稳定契约。
4. OpenAPI 文档展示的是真实对外模型。
