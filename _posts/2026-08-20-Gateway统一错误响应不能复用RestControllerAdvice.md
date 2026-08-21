---
layout: mypost
title: Gateway 统一错误响应不能复用 RestControllerAdvice
categories: [ Spring Cloud, Gateway, REST ]
---

业务 WebMVC 服务可以用 `@RestControllerAdvice` 统一异常，但 Gateway 是 WebFlux 应用，异常处理链完全不同。项目为 Gateway
单独实现 `ErrorWebExceptionHandler`。

### 一、为什么要单独写

Gateway 处理的是 `Mono<Void>` 和 `ServerWebExchange`，不存在传统的 Servlet 请求线程模型。直接复用 WebMVC
的异常处理器，最大概率是根本拦不到。

### 二、响应结构保持一致

网关错误同样返回：

```json
{
  "success": false,
  "code": 102,
  "message": "请求路径不存在，请检查接口地址或网关路由",
  "data": null,
  "timestamp": 0
}
```

前端不需要区分错误来自网关还是业务服务。

### 三、状态码映射业务码

常见映射关系：

```text
400 -> 101
401 -> 401
403 -> 403
404 -> 102
500 -> 500
503 -> 503
```

未知状态回退到通用失败码，保持响应结构稳定。

### 四、响应已提交时不能硬写

如果响应已经 committed，处理器只能把异常继续抛出。此时再改状态码和响应体，会破坏 HTTP 输出。

### 五、经验总结

统一响应是外部契约，统一异常处理是内部实现。WebMVC 和 WebFlux 可以共用响应格式，但不能共用同一套处理机制。
