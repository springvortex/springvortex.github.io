---
layout: mypost
title: Gateway favicon 404 不进告警日志
categories: [ Spring Cloud, Gateway, Observability ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.0`

浏览器打开任何 HTML 页面时，都会自动请求一次 `/favicon.ico`。如果网关没有提供这个文件，请求会走到
`ErrorWebExceptionHandler`，并产生一条 404 WARN 日志。这个 404 不是接口问题，也不是攻击信号，但每次打开页面都会重复出现。

这次提交没有把 favicon 伪装成成功响应，而是在异常处理器里加了一个很窄的判断：

```java
if (status.is5xxServerError()) {
    log.error("网关请求处理失败：{} {}", exchange.getRequest().getMethod(), path, ex);
} else if (!isBrowserFaviconNotFound(path, status)) {
    log.warn("网关请求处理失败：{} {}，状态码：{}，原因：{}",
            exchange.getRequest().getMethod(), path, status.value(), ex.getMessage());
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/exception/GatewayErrorWebExceptionHandler.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/exception/GatewayErrorWebExceptionHandler.java)

判断条件同时要求两件事：

```java
status.value() == 404 && FAVICON_PATH.equals(path)
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/exception/GatewayErrorWebExceptionHandler.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-gateway/src/main/java/com/zjc/gateway/exception/GatewayErrorWebExceptionHandler.java)

也就是说，只有精确的 `/favicon.ico` 且状态码为 404 时才跳过日志。其他 404 仍然照常记录，避免把真实路由问题、扫描请求和配置错误一起吞掉。

测试也没有只看响应码，而是用 Logback 的 `ListAppender` 捕获这个 Handler 的日志事件，断言 favicon 404 处理后日志列表为空。这个测试点很重要：日志降级和响应降级是两件事，响应仍保持 404，只是不再制造无意义告警。

### 经验总结

网关日志的价值取决于信噪比。favicon 404 属于浏览器行为的已知噪音，可以在异常处理器里精确过滤；但不要顺手扩大成“所有 4xx 都不记”，否则真正需要排查的入口错误也会消失。
