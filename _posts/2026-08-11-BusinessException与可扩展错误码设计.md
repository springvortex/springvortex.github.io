---
layout: mypost
title: BusinessException 与可扩展错误码设计
categories: [ Spring Boot, REST, Architecture ]
---

统一错误码最容易被做坏的地方，是把所有枚举都塞进一个公共类。项目里用 `ErrorCode` 接口切开这个耦合：公共模块只定义标准码段，业务模块自己扩展自己的错误码。

### 一、错误码抽象

```java
public interface ErrorCode {
    int code();
    String message();
}
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/main/service-common/src/main/java/com/zjc/common/constant/ErrorCode.java](https://github.com/springvortex/spring-cloud-alibaba/blob/main/service-common/src/main/java/com/zjc/common/constant/ErrorCode.java)

`ApiResponseEnum` 实现它，负责 0、100、101、102、401、403、500、503 这类通用语义。业务模块如果需要 `20001`
起的用户错误码，只需要再定义一个枚举，不需要修改公共代码。

### 二、业务异常携带上下文

`BusinessException` 是运行时异常，内部保存错误码：

```java
throw new BusinessException(ApiResponseEnum.NOT_FOUND);
throw new BusinessException(20001, "用户不存在");
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/main/service-common/src/main/java/com/zjc/common/exception/BusinessException.java](https://github.com/springvortex/spring-cloud-alibaba/blob/main/service-common/src/main/java/com/zjc/common/exception/BusinessException.java)

推荐第一种和自定义枚举写法。数字散落在业务代码里，后期很难知道它属于哪个模块。

### 三、公共枚举与业务枚举的边界

可以这样划分：

- 公共枚举：表达 HTTP / REST 通用语义。
- 业务枚举：表达具体业务规则，比如用户被禁用、库存不足、订单状态不允许取消。
- 临时字符串：只用于明确的一次性提示，不承载稳定契约。

一旦前端要根据错误码做跳转、重试或表单提示，这个错误码就应该进入枚举管理。

### 四、异常不是日志的替代品

`BusinessException` 通常代表可预期的业务失败，处理器里用 warn 记录；未预期异常才用 error 记录完整堆栈。如果到处都按最高级别打日志，真正的事故反而会被淹没。

### 五、经验总结

错误码的价值在于稳定契约，而不是数字越多越好。每个码都要有明确处理方式；否则保留通用失败码反而更干净。
