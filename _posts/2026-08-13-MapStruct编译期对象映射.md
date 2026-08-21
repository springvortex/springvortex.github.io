---
layout: mypost
title: MapStruct 编译期对象映射
categories: [ Components, MapStruct, Engineering ]
---

MapStruct 负责 Entity 和 DTO 之间的转换。它在编译期生成实现类，不走反射，字段映射错误尽量在构建阶段暴露，而不是等到运行时才发现。

### 一、映射规则写在接口上

```java
@Mapper(componentModel = "spring")
public interface UserConverter {

    UserDTO entityToDto(User user);

    @Mapping(target = "isDeleted", ignore = true)
    @Mapping(target = "updateTime", ignore = true)
    @Mapping(target = "createTime", ignore = true)
    User dtoToEntity(UserDTO dto);
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/converter/UserConverter.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/converter/UserConverter.java)

`componentModel = "spring"` 让生成类直接作为 Spring Bean 注入。反向映射时显式忽略数据库管理字段，避免请求 DTO 意外覆盖审计字段。

### 二、它保护的是接口契约

Entity 面向数据库，DTO 面向接口。MapStruct 让这两个模型可以不同：数据库加内部字段不自动泄漏到 API，接口字段调整也不迫使表结构跟着变。

### 三、编译期是关键

MapStruct 与 Lombok 同时使用时，项目在编译插件里配置了 annotation processor 顺序和 binding。工具链没有配好时，最常见现象是生成了空实现或字段丢失。

### 四、避坑点

1. 同名字段不代表语义相同，必要时显式 `@Mapping`。
2. 集合映射要确认元素映射方法存在。
3. 不要把 MapStruct 当成任意对象复制的万能工具。
4. 生成代码可以打开看，遇到疑问直接看实现最直观。

### 五、经验总结

MapStruct 用编译期成本换来映射确定性。它比手写拷贝少样板代码，比反射拷贝更容易排查。
