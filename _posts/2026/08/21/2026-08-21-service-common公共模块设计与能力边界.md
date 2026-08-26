---
layout: mypost
title: service-common 公共模块设计与能力边界
categories: [ Microservices, Architecture, service-common ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.0`

`service-common` 是这套微服务的公共库，不是可独立运行的服务。它的目标很明确：把业务服务反复需要的响应结构、异常处理、接口日志、API
路径约定、共享 DTO、共享 Feign 契约和配置加密能力集中到一个标准 JAR 里，让 Provider、Consumer、Mail 引入后自动获得这些能力。

这个模块最容易写坏的地方不是“放什么”，而是“不该放什么”。它不能变成所有依赖的大杂烩，否则一个公共库升级会拖着重启所有服务。这个项目的处理方式是：公共能力进
common，运行时技术栈仍由具体服务自己决定。

### 模块定位

| 项             | 说明                                        |
|----------------|---------------------------------------------|
| Maven artifact | `service-common`                            |
| 打包形态       | 标准 JAR，不生成可执行 Fat JAR              |
| 引用方         | Provider、Consumer、Mail                    |
| 刻意不引用     | Gateway                                     |
| 主要职责       | 契约、响应、异常、日志、路径、Feign、Jasypt |

Gateway 不依赖它是刻意设计。Gateway 是 WebFlux 应用，而 common 里的 `GlobalExceptionHandler`、`WebLogAspect` 都是面向
Spring MVC 的；把 common 引进 Gateway 会同时带来依赖模型和编程模型冲突。

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/pom.xml)

### 包结构

```text
com.zjc.common
├── aop
│   └── WebLogAspect
├── api
│   ├── mail
│   ├── test
│   └── user
├── constant
│   ├── ApiResponseEnum
│   └── ErrorCode
├── dto
├── exception
│   ├── BusinessException
│   └── GlobalExceptionHandler
└── web
    ├── annotation
    ├── ApiPathAutoConfiguration
    ├── ApiPathProperties
    ├── ApiPathResolver
    └── ApiResponse
```

这个包结构对应三类东西：

1. `web`、`exception`、`aop`：横切能力。
2. `dto`、`api`：跨服务契约。
3. `constant`：统一错误码和响应码。

### 自动装配机制

common 不是靠启动类扫描生效，而是通过 Spring Boot 自动装配文件注册：

```text
com.zjc.common.exception.GlobalExceptionHandler
com.zjc.common.web.ApiPathAutoConfiguration
com.zjc.common.aop.WebLogAspect
com.zjc.common.api.user.factory.UserFeignFallbackFactory
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports)

所以业务服务只要引入依赖，不需要再写 `@Import`，也不需要扩展 `@ComponentScan`。这让公共能力的接入成本接近零，但也要提醒自己：自动装配越方便，越要控制依赖边界。

### 统一响应结构

所有业务接口默认返回 `ApiResponse<T>`：

```json
{
  "success": true,
  "code": 0,
  "message": "操作成功",
  "data": {},
  "timestamp": 1787191865837
}
```

`success` 给前端做分支，`code` 给细粒度错误定位，`message` 给用户展示，`data` 承载业务数据。`timestamp`
在对象创建时固定，避免中途被业务代码修改。

`ApiResponse` 提供两类构建方式：

```java
ApiResponse.success(user);
ApiResponse.failureMessage("参数非法");

ApiResponse.<UserDTO>builder()
        .ok()
        .data(user)
        .build();
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/web/ApiResponse.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/web/ApiResponse.java)

`successMessage` 和 `failureMessage` 这两个名字故意写得长一点，避免当泛型是 `String` 时和 `success(data)`、`failure(data)`
产生重载歧义。

### 全局异常处理

`GlobalExceptionHandler` 是 Spring MVC 的 `@RestControllerAdvice`。它统一拦截业务异常、参数校验异常、请求解析异常和兜底异常，再包装成
`ApiResponse`。

常见处理规则：

| 异常                              |        业务码 | 结果           |
|-----------------------------------|--------------|----------------|
| `BusinessException`               | 透传异常 code | 业务异常       |
| `MethodArgumentNotValidException` |           100 | 字段级校验错误 |
| `ConstraintViolationException`    |           100 | 单参数校验错误 |
| `HttpMessageNotReadableException` |           101 | 请求体解析失败 |
| `NoResourceFoundException`        |           102 | 路径不存在     |
| `Exception`                       |           500 | 未预期异常兜底 |

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/exception/GlobalExceptionHandler.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/exception/GlobalExceptionHandler.java)

兜底处理会记录完整堆栈，但响应里只放稳定提示或异常摘要，避免把内部堆栈直接暴露给前端。

### 业务异常和错误码

业务层不返回“失败响应对象”，而是直接抛 `BusinessException`：

```java
throw new BusinessException(ApiResponseEnum.USER_NOT_FOUND);
throw new BusinessException("自定义提示");
throw new BusinessException(10001, "用户不存在");
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/exception/BusinessException.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/exception/BusinessException.java)

推荐用实现 `ErrorCode` 的枚举管理错误，这样 code 和 message 绑定，不会散落在 Controller 里。不同业务域可以有自己的错误码枚举，只要实现同一个接口。

### 接口日志切面

`WebLogAspect` 拦截所有标注 `@RestController` 的类，记录：

1. 请求前：HTTP 方法、URI、类名、方法名、入参 JSON。
2. 正常返回：耗时、返回值 JSON，超过 2000 字符截断。
3. 异常抛出：耗时、异常消息，然后继续把异常交给全局异常处理器。

```java
log.info("==> {} {} | {} | args={}", httpMethod, uri, target,
        formatArgs(joinPoint.getArgs()));

Object result = joinPoint.proceed();
log.info("<== {} {} | {} | cost={}ms | result={}", httpMethod, uri, target,
        costTime, formatResult(result));
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/aop/WebLogAspect.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/aop/WebLogAspect.java)

它会跳过 `HttpServletRequest`、`HttpServletResponse`、`MultipartFile` 这类不适合 JSON 序列化的对象，避免日志切面自己把请求打挂。

### 统一 API 路径约定

common 通过 `spring.application.name` 推导模块名，再生成统一前缀：

```text
service-provider -> /api/v1/provider
service-consumer -> /api/v1/consumer
service-mail     -> /api/v1/mail
```

配置来自各业务服务的公共 Profile：

```yaml
zjc:
  api:
    prefix: /api
    versions:
      - v1
```

`ApiPathAutoConfiguration` 做了三件事：

1. 给 Spring MVC Controller 追加版本前缀。
2. 给 SpringDoc 自动创建版本分组。
3. 给 Feign 请求自动补目标服务的标准前缀。

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/web/ApiPathAutoConfiguration.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/web/ApiPathAutoConfiguration.java)

这个设计让 Controller 只写资源路径，例如 `/user/{id}`；让 Feign 契约也只写资源路径；版本前缀统一在运行时推导。将来出现
v2，只需要增加版本配置并给部分 Controller 标注 `@ApiVersion("v2")`。

### 共享 Feign 契约

跨服务调用最容易失控的是“每个服务自己抄一份接口定义”。这个项目把 Feign 接口放进 common：

| Feign 接口     | 目标服务           | 资源路径                   |
|----------------|--------------------|----------------------------|
| `UserFeignApi` | `service-provider` | `/user/{id}`、`/user/list` |
| `MailFeignApi` | `service-mail`     | `/send`                    |
| `TestApi`      | `service-provider` | `/port`                    |

例如用户契约：

```java
@FeignClient(
        name = "service-provider",
        contextId = "userFeignApi",
        fallbackFactory = UserFeignFallbackFactory.class
)
public interface UserFeignApi {
    @GetMapping("/user/{id}")
    ApiResponse<UserDTO> getUser(@PathVariable("id") Long userId);
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/user/UserFeignApi.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/user/UserFeignApi.java)

`contextId` 用来隔离 OpenFeign 配置。即使两个客户端指向同一个服务，也能分别配置超时或拦截器。

### 降级工厂

用户查询使用 `FallbackFactory`，不是简单 fallback：

```java
@Override
public UserFeignApi create(Throwable cause) {
    log.error("调用 service-provider 用户接口失败，触发降级", cause);

    return new UserFeignApi() {
        @Override
        public ApiResponse<UserDTO> getUser(Long userId) {
            return ApiResponse.success();
        }

        @Override
        public ApiResponse<List<UserDTO>> list() {
            return ApiResponse.success(Collections.emptyList());
        }
    };
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/user/factory/UserFeignFallbackFactory.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/user/factory/UserFeignFallbackFactory.java)

`FallbackFactory` 的价值是能拿到失败原因。单个对象降级为 `data=null`，列表降级为空集合，上层不需要
try-catch。这个策略适合演示和可用性优先的场景；如果业务要求强一致，有些调用反而应该失败，而不是假装成功。

### 配置加密

common 引入 `jasypt-spring-boot-starter`，业务服务可以用 `ENC(...)` 替代明文密码。Jasypt 参数放在各业务模块的
`config/application-jasypt.yaml` 中：

```yaml
jasypt:
  encryptor:
    algorithm: PBEWithHMACSHA512AndAES_256
    key-obtention-iterations: 100000
    pool-size: 1
    provider-name: SunJCE
    salt-generator-classname: org.jasypt.salt.RandomSaltGenerator
    iv-generator-classname: org.jasypt.iv.RandomIvGenerator
    string-output-type: base64
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/config/application-jasypt.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/config/application-jasypt.yaml)

密钥不进 Git，启动时通过：

```bash
java -Djasypt.encryptor.password=your-secret-key -jar service.jar
```

或环境变量：

```bash
JASYPT_ENCRYPTOR_PASSWORD=your-secret-key
```

### 依赖边界

common 的 POM 只声明源码直接用到的 API，例如 Spring Web、AutoConfigure、AspectJ、Feign Core、SpringDoc common、Jasypt、Swagger
注解和 Hutool。Servlet API 是 `provided`，由目标服务的 Web 运行时提供。

这些运行能力不在 common 里决定：

| 能力                 | 决定位置                 |
|----------------------|--------------------------|
| Tomcat / Spring MVC  | Provider、Consumer、Mail |
| Swagger UI           | 各业务服务               |
| OpenFeign starter    | Consumer                 |
| Sentinel Feign       | Consumer                 |
| Nacos / MySQL / Mail | 对应业务模块             |

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/pom.xml)

这个边界让公共库保持“契约和横切能力”，而不是把所有服务都锁死在同一套运行时依赖上。

### 阅读入口

想快速读懂这个模块，建议按这个顺序看：

1. `ApiResponse`
2. `ErrorCode`、`ApiResponseEnum`
3. `BusinessException`
4. `GlobalExceptionHandler`
5. `ApiPathProperties`、`ApiPathResolver`
6. `ApiPathAutoConfiguration`
7. `UserFeignApi` 和 `UserFeignFallbackFactory`
8. `WebLogAspect`

先看响应和异常，能理解所有 Controller 的返回方式；再看路径自动装配，能理解 `/api/v1/{module}` 是怎么来的；最后看 Feign
契约，就能串起跨服务调用。
