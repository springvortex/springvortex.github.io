---
layout: mypost
title: MyBatis-Plus 分页插件正确接入
categories: [ MyBatis-Plus, MySQL, Spring Boot ]
---

很多刚用 MyBatis-Plus 的人会以为传入 `Page` 就自动分页，其实还差一步：注册分页拦截器。

### 一、配置拦截器

```java
@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor() {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
    return interceptor;
}
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/MybatisPlusConfig.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/config/MybatisPlusConfig.java)

没有这个 Bean，分页对象不会触发 SQL 改写，查询仍然可能把全表数据查出来。

### 二、Service 调用

```java
Page<User> page = userService.page(new Page<>(current, size));
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java)

分页插件会在执行时补充 `LIMIT`，并执行 count 查询。

### 三、把 Entity 分页转换成 DTO 分页

不能只转换 `records`，还要保留分页元信息：

```java
Page<UserDTO> result = new Page<>(
        page.getCurrent(),
        page.getSize(),
        page.getTotal()
);
result.setRecords(userConverter.entityListToDtoList(page.getRecords()));
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/src/main/java/com/zjc/provider/controller/UserController.java)

这样返回结构里既有当前页数据，也有总数、页码和每页数量。

### 四、参数必须校验

分页参数不是随便传：

```text
current >= 1
size 1 到 100
```

`current=0` 会导致奇怪偏移，`size=100000` 会把分页变成拖库。

### 五、踩坑点

1. 忘记分页插件：接口看起来能跑，但数据量一大性能崩。
2. 只返回 records：前端无法计算总页数。
3. 不限制 size：调用方可以一次请求海量数据。
4. 明确数据库类型：不同数据库的分页方言不同。
