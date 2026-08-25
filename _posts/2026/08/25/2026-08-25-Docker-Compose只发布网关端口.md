---
layout: mypost
title: Docker Compose 只发布网关端口
categories: [ Docker, Compose, Microservices ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.1`

容器化后最容易混淆的一组概念是 `expose` 和 `ports`。这次 Compose 文件把它们用得很清楚：Provider、Consumer、Mail 只在 Docker 网络内声明端口，Gateway 才发布宿主机端口。

四个服务先进入同一个 bridge 网络：

```yaml
networks:
  zjc-net:
    driver: bridge
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/docker-compose.yml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/docker-compose.yml)

业务服务使用 `expose`：

```yaml
service-provider:
  image: zjc/service-provider:${APP_TAG}
  expose:
    - "9001"
  networks:
    - zjc-net
```

`expose` 只是声明容器网络内可访问，不占用宿主机端口。外部流量统一从网关进入：

```yaml
service-gateway:
  image: zjc/service-gateway:${APP_TAG}
  ports:
    - "80:80"
  networks:
    - zjc-net
  depends_on:
    - service-provider
    - service-consumer
    - service-mail
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/docker-compose.yml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/docker-compose.yml)

这个网络对 Nacos 服务发现尤其重要。Nacos 注册的是容器 IP，Gateway 拿到 Provider、Consumer、Mail 的实例列表后，要能直接访问这些 IP。让四个服务共用 `zjc-net`，比把所有业务端口发布到宿主机更符合实际调用路径，也少了很多误暴露面。

日志则按服务落到宿主机：

```yaml
volumes:
  - ./config/provider:/app/config:ro
  - ./logs/provider:/app/logs/service-provider
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/docker-compose.yml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/docker-compose.yml)

配置目录只读，日志目录可写。容器重建后，应用文件日志仍保留在部署机，方便按 `logs/provider`、`logs/gateway` 这类目录排查。

还有一个容易误读的配置：

```yaml
depends_on:
  - service-provider
  - service-consumer
  - service-mail
```

它只控制容器启动顺序，不代表下游服务已经完成 Nacos 注册或业务就绪。真正的调用可用性仍由 Gateway 的服务发现、路由错误和健康观测体现。

### 经验总结

Compose 的端口边界应该和系统架构一致：内网服务用 `expose`，唯一入口用 `ports`。`depends_on` 解决顺序问题，不解决就绪问题； readiness 还是要交给注册中心、健康检查和请求观测。
