---
layout: mypost
title: 用 MyBatis-Plus 实现标准 CRUD 接口
categories: [ Spring Boot, REST, MyBatis-Plus ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

用户、商品这类单表资源很适合抽象成统一 CRUD 形状。这个项目的用户接口是：

```text
GET    /user/{id}
GET    /user/list
GET    /user/page
POST   /user
PUT    /user
DELETE /user/{id}
```

由于公共模块会自动追加 `/api/v1/provider` 前缀，Controller 里只写资源路径。

### 一、查询单个

```java
@GetMapping("/user/{id}")
public ApiResponse<UserDTO> getUser(@PathVariable Long id) {
    return ApiResponse.success(userConverter.entityToDto(userService.getById(id)));
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java)

查询不到时返回 `success=true`、`data=null`。这种设计表示“请求处理成功，但没有这条资源”。

### 二、新增

```java
@PostMapping("/user")
public ApiResponse<UserDTO> add(@Valid @RequestBody UserDTO dto) {
    User user = userConverter.dtoToEntity(dto);
    userService.save(user);
    return ApiResponse.success(userConverter.entityToDto(user));
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java)

`save` 后实体会带上生成的主键，再转换成 DTO 返回。

### 三、更新和删除要看影响行数

```java
boolean updated = userService.updateById(userConverter.dtoToEntity(dto));
return updated
        ? ApiResponse.success()
        : ApiResponse.failure(ApiResponseEnum.NOT_FOUND);
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java)

更新和删除不能只看 HTTP 请求是否到达。`updateById` 和 `removeById` 返回 false 时，说明没有命中有效记录，应该返回业务失败。

### 四、逻辑删除

`removeById` 实际执行的是逻辑删除。MyBatis-Plus 会根据配置把 `is_deleted` 置为已删除，后续查询自动过滤。

### 五、统一约定

- 入参 DTO 校验
- 出参 DTO
- 返回 `ApiResponse`
- 更新和删除返回结果反馈
- 数据访问细节留在 Service 和 Mapper
