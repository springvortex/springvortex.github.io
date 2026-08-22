---
layout: mypost
title: Feign 降级工厂比 fallback 多知道一件事
categories: [ Spring Cloud, OpenFeign, Resilience ]
---

> **代码环境**：本文代码来自仓库 [https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git) 的 `release/v1.0.0` 分支（提交 `67ee39051b42`，项目版本 `1.0.0`）。
>
> 本地开发环境为 Windows；基础环境：JDK `21`、Maven 多模块工程、Spring Boot `4.1.0`、Spring Cloud `2025.1.2`、Spring Cloud Alibaba `2025.1.0.0`、MyBatis-Plus `3.5.17`、SpringDoc `3.1.0`、MapStruct `1.6.3`、Hutool `5.8.47`、Jasypt Spring Boot `4.0.4`、JaCoCo `0.8.15`。`dev` Profile 使用共享 Nacos `3.x`、MySQL `8.x`、Zipkin 与 MailHog；`prod` Profile 面向 Linux 内网部署，基础设施端口不暴露公网。

远程调用一定会有失败。OpenFeign 支持在失败时走 fallback，但项目选择的是 `FallbackFactory`，因为它能拿到失败原因。排查线上问题时，这一件事非常关键。

### 一、工厂能拿到异常

```java
@Slf4j
@Component
public class UserFeignFallbackFactory implements FallbackFactory<UserFeignApi> {
    @Override
    public UserFeignApi create(Throwable cause) {
        log.error("调用 service-provider 用户接口失败，触发降级", cause);
        return new UserFeignApi() {
            // 返回兜底数据
        };
    }
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/user/factory/UserFeignFallbackFactory.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/user/factory/UserFeignFallbackFactory.java)

连接拒绝、读超时、下游 503、反序列化失败，都会出现在 `cause` 里。普通 fallback 只知道“进了兜底”，不知道为什么。

### 二、降级策略要跟业务走

项目里的用户接口采用可用性优先：

- 单个查询：返回 `data=null` 的成功响应。
- 列表查询：返回空列表，避免上层遍历时空指针。

这适合演示和部分读取场景，但不适合所有业务。下单、扣库存、支付这类操作更应该暴露失败，让用户重试，而不是返回一个看似成功的空结果。

### 三、成功包装不代表没有降级

降级响应使用统一 `ApiResponse`，上层必须检查 `data`。如果调用方只看 `success`，就会把“服务不可用但优雅返回”误判成“查询结果为空”。

### 四、降级日志要能聚合

记录失败原因、目标服务、接口方法和关键参数，可以快速回答三个问题：

1. 是哪个下游不可用。
2. 是超时还是连接失败。
3. 影响了多少请求。

### 五、经验总结

降级不是把异常藏起来，而是把失败转换成系统设计好的响应。想清楚一致性优先还是可用性优先，比写一个空返回重要得多。
