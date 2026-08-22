---
layout: mypost
title: MapStruct 替代 BeanUtils 拷贝
categories: [ Spring Boot, Mapping, Engineering ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.0`

`BeanUtils.copyProperties` 写起来最省事，代价藏得很深：字段名悄悄拼错时没有编译错误，类型不一致要运行时才发现，性能 also
依赖反射。项目改用 MapStruct，把 Entity 和 DTO 的转换提前到编译期。

### 一、转换器长什么样

```java
@Mapper(componentModel = "spring")
public interface UserConverter {
    UserDTO entityToDto(User user);

    @Mapping(target = "isDeleted", ignore = true)
    @Mapping(target = "createTime", ignore = true)
    @Mapping(target = "updateTime", ignore = true)
    User dtoToEntity(UserDTO dto);
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/converter/UserConverter.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/converter/UserConverter.java)

`componentModel = "spring"` 让生成实现类注册成 Bean，Controller 直接注入使用。

### 二、显式忽略数据库托管字段

DTO 转 Entity 时，`isDeleted`、`createTime`、`updateTime` 被忽略。它们属于数据库和公共填充逻辑管理的字段，不应该由调用方随便传入。

这个忽略动作同时是文档：调用方能设置哪些字段，转换器一眼可见。

### 三、编译期发现字段问题

MapStruct 在编译时生成实现类。字段名不匹配、类型不能转换、目标字段没有来源，都会在构建阶段暴露。相比运行时反射拷贝，这是把风险往前挪了一大步。

### 四、列表转换不用手写循环

```java
List<UserDTO> entityListToDtoList(List<User> users);
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/converter/UserConverter.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/converter/UserConverter.java)

MapStruct 会基于单对象转换方法生成集合转换，减少模板代码。

### 五、经验总结

DTO 和 Entity 分离后，转换代码会变多，这是契约清晰的成本。MapStruct 把这部分成本控制在编译期，属于划算的交换。
