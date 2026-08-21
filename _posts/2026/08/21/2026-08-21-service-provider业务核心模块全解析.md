---
layout: mypost
title: service-provider 业务核心模块全解析
categories: [ Microservices, MyBatis-Plus, MySQL ]
---

`service-provider` 是这套微服务的业务核心，负责用户、商品、订单和连通性测试接口。它注册到 Nacos，对外提供
`/api/v1/provider/**` API，既可以直接被 Gateway 转发，也可以被 Consumer 通过 Feign 调用。

这个模块的价值不只是 CRUD，而是把几个工程约定跑通了：Entity 与 DTO 分离、MyBatis-Plus
通用数据访问、订单主表明细同事务、逻辑删除、审计时间自动填充、分页参数校验和统一响应。

### 基本信息

| 项       | 值                              |
|----------|---------------------------------|
| 服务名   | `service-provider`              |
| 端口     | `9001`                          |
| API 前缀 | `/api/v1/provider`              |
| 服务发现 | Nacos Discovery                 |
| 数据访问 | MyBatis-Plus + MySQL            |
| 接口文档 | `/swagger-ui.html`，仅 dev 开启 |

启动类很薄，只声明应用入口、服务发现和 Mapper 扫描：

```java
@SpringBootApplication
@EnableDiscoveryClient
@MapperScan("com.zjc.provider.mapper")
public class ProviderApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProviderApplication.class, args);
    }
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/ProviderApplication.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/ProviderApplication.java)

### 包结构

```text
com.zjc.provider
├── ProviderApplication
├── config
│   ├── AuditMetaObjectHandler
│   ├── MybatisPlusConfig
│   └── OpenApiConfig
├── controller
│   ├── GoodsController
│   ├── OrderController
│   ├── TestController
│   └── UserController
├── converter
├── entity
├── mapper
└── service
    └── impl
```

分层职责很传统，但边界清楚：

1. Controller 只处理 HTTP 契约和参数校验。
2. Service 处理业务规则和事务。
3. Mapper 继承 MyBatis-Plus 通用能力。
4. Converter 负责 Entity 与 DTO 转换。
5. Entity 只代表数据库表，不对外暴露。

### API 面

Controller 中编写的资源路径如下，运行时会自动追加 `/api/v1/provider`：

| 模块   | 路径                                                  |
|--------|-------------------------------------------------------|
| 用户   | `/user`、`/user/{id}`、`/user/list`、`/user/page`     |
| 商品   | `/goods`、`/goods/{id}`、`/goods/list`、`/goods/page` |
| 订单   | `/order`、`/order/{id}`、`/order/list`、`/order/page` |
| 连通性 | `/port`                                               |

分页接口约定：

```text
current 从 1 开始
size 范围 1-100
```

更新和删除接口根据实际影响行数判断结果。记录不存在时返回业务失败 `code=102`，HTTP 状态仍保持统一响应封装的 `200`。

### Entity 不出模块

以用户接口为例，Controller 返回的是 `UserDTO`，不是 `User` 实体：

```java
@GetMapping("/user/{id}")
public ApiResponse<UserDTO> getUser(@PathVariable("id") Long id) {
    return ApiResponse.success(
            userConverter.entityToDto(userService.getById(id)));
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java)

这样做的理由：

1. 数据库结构变化不等于接口契约变化。
2. 逻辑删除、审计字段等内部字段不被迫暴露。
3. DTO 可以加 Swagger 描述和校验注解。
4. Feign 调用方只依赖 common 里的 DTO，不依赖 Provider 的实体层。

### MyBatis-Plus 分页

Provider 配置了 MySQL 分页拦截器：

```java
@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor() {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    interceptor.addInnerInterceptor(
            new PaginationInnerInterceptor(DbType.MYSQL));
    return interceptor;
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/MybatisPlusConfig.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/MybatisPlusConfig.java)

没有这个拦截器，`userService.page(...)` 只是普通查询，不会自动追加 `LIMIT`。项目同时引入 `mybatis-plus-jsqlparser`
，因为新版分页拦截器需要 JSqlParser 改写 SQL。

### 审计时间自动填充

实体字段使用 `@TableField(fill = FieldFill.INSERT)` 或 `INSERT_UPDATE`，然后由 `AuditMetaObjectHandler` 统一填充：

```java
public void insertFill(MetaObject metaObject) {
    this.strictInsertFill(metaObject, "createTime",
            LocalDateTime.class, LocalDateTime.now(ZONE));
    this.strictInsertFill(metaObject, "updateTime",
            LocalDateTime.class, LocalDateTime.now(ZONE));
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/AuditMetaObjectHandler.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/AuditMetaObjectHandler.java)

新增时填充 `createTime` 和 `updateTime`，更新时只刷新 `updateTime`。业务代码不手动 set 时间，避免漏填和时区不一致。

### 逻辑删除

数据访问配置里统一声明：

```yaml
mybatis-plus:
  global-config:
    db-config:
      id-type: assign_id
      logic-delete-field: isDeleted
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/application-prod.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/application-prod.yaml)

这样普通查询会过滤已删除数据，`removeById` 会把删除标记改为已删除。注意：逻辑删除不是审计日志，重要业务还需要保留操作人和操作原因，这两个字段当前模型没有覆盖。

### 订单主表与明细同事务

订单是 Provider 里最有业务含量的部分。新增订单时先保存主表，再批量保存明细：

```java
@Transactional(rollbackFor = Exception.class)
public void saveWithDetails(Order order, List<OrderDetail> details) {
    if (!save(order)) {
        throw new BusinessException(ApiResponseEnum.INTERNAL_ERROR);
    }

    details.forEach(detail -> {
        detail.setId(null);
        detail.setOrderId(order.getOrderId());
        detail.setOrderNo(order.getOrderNo());
    });

    if (!details.isEmpty() && !orderDetailService.saveBatch(details)) {
        throw new BusinessException(ApiResponseEnum.INTERNAL_ERROR);
    }
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/service/impl/OrderServiceImpl.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/service/impl/OrderServiceImpl.java)

删除订单也使用同一个事务方法，先删主表，再按 `orderId` 删除明细。这样订单不会出现“主表还在、明细没了”或“主表没了、明细悬空”的中间状态。

### 订单详情聚合

查询单个订单时，Controller 先查主表，再按订单 ID 查明细，最后组装 DTO：

```java
OrderDTO dto = orderConverter.entityToDto(order);
List<OrderDetail> details = orderDetailService.list(
        new LambdaQueryWrapper<OrderDetail>()
                .eq(OrderDetail::getOrderId, id));
dto.setOrderDetails(detailDTOs);
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/OrderController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/OrderController.java)

这个实现保持简单清晰，适合当前规模。如果订单明细很多或列表也需要聚合，可以考虑一次 JOIN 查询、批量查询或专门的查询对象，避免
N+1 查询。

### 连通性测试

`/port` 返回当前 Provider 实例端口。它不是为了业务，而是为了验证链路：

```text
Gateway -> Provider
Consumer -> Feign -> Provider
```

启动多个 Provider 实例后连续调用这个接口，如果返回端口来回变化，说明 LoadBalancer 在多个实例间分流。

### 配置组织

基础配置放在 `application.yaml`：

```yaml
spring:
  application:
    name: service-provider
  profiles:
    active: dev
    include:
      - api
      - jasypt
      - zipkin
      - nacos
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/application.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/resources/application.yaml)

环境差异放在：

| 文件                             | 职责                                       |
|----------------------------------|--------------------------------------------|
| `application-dev.yaml`           | 共享开发环境 MySQL、Nacos、Zipkin、Swagger |
| `application-prod.yaml`          | 本机 MySQL、Nacos、Zipkin，关闭文档        |
| `config/application-api.yaml`    | API 前缀和版本                             |
| `config/application-jasypt.yaml` | 加密算法参数                               |
| `config/application-nacos.yaml`  | Nacos 公共认证                             |
| `config/application-zipkin.yaml` | 链路追踪公共配置                           |

生产环境只连 `127.0.0.1` 的 MySQL、Nacos、Zipkin，端口不对外暴露。

### 链路追踪

Provider 引入 Actuator 和 Zipkin，日志里有 `traceId`、`spanId`。通过 W3C `traceparent` 传播，同一次请求可以在 Zipkin 中串起来：

```text
Gateway -> Consumer -> Provider
Gateway -> Provider
Gateway -> Mail
```

生产配置采样率是 `0.1`，开发配置是 `1.0`。排查问题时先用 `traceId` 聚合日志，再去 Zipkin 看调用树和耗时分布。

### 运行前提

启动 Provider 前确认：

1. JDK 21。
2. MySQL 可访问，`spring_cloud_alibaba` 库和表已初始化。
3. Nacos 可访问。
4. Zipkin 可访问。
5. Jasypt 密钥已通过启动参数或环境变量注入。

生产部署时 Provider 的 `9001` 端口只允许内网访问，外部请求统一走 Gateway。

### 模块小结

`service-provider` 是整套约定最完整的落地点：公共响应、全局异常、接口日志、DTO 隔离、MyBatis-Plus、事务、逻辑删除、审计填充、Nacos
注册、Zipkin 链路都在这里真实运行。读懂这个模块，再去看 Consumer 和 Mail，基本就是看不同职责如何复用同一套底座。
