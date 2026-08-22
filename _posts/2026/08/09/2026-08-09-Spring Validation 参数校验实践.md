---
layout: mypost
title: Spring Validation 参数校验实践
categories: [ Spring Boot, REST, Validation ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.0`

接口参数校验不应该散落在 Service 里写 if。这个项目使用 Jakarta Validation，把规则贴在 DTO 和 Controller 参数上。

### 一、请求体校验

```java
@PostMapping("/user")
public ApiResponse<UserDTO> add(@Valid @RequestBody UserDTO dto) {
    ...
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java)

DTO 字段上声明规则：

```java
@NotBlank(message = "登录账号不能为空")
@Size(min = 3, max = 20, message = "账号长度需在3-20个字符之间")
private String username;
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/dto/UserDTO.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/dto/UserDTO.java)

### 二、Query 参数校验

分页参数在 Controller 方法上直接标注：

```java
@Min(value = 1, message = "当前页码必须从1开始")
@RequestParam long current
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java)

同时类上要开启：

```java
@Validated
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java)

### 三、常用注解

| 注解            | 用途             |
|-----------------|------------------|
| `@NotNull`      | 不允许 null      |
| `@NotBlank`     | 字符串非空白     |
| `@Email`        | 邮箱格式         |
| `@Min` / `@Max` | 数值范围         |
| `@Size`         | 字符串或集合长度 |

### 四、校验失败如何返回

校验失败会抛出不同异常：

- `MethodArgumentNotValidException`
- `BindException`
- `ConstraintViolationException`

公共全局异常处理器统一拦截，把错误字段和消息拼成稳定 `ApiResponse`。

### 五、踩坑点

1. `@NotNull` 不等于字符串非空。
2. `@Valid` 只校验当前对象，嵌套对象需要继续标 `@Valid`。
3. Query 参数校验需要类上的 `@Validated`。
4. 校验消息也应该稳定，方便前端展示。
