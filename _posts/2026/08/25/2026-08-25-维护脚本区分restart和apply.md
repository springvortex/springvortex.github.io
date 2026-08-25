---
layout: mypost
title: 维护脚本区分 restart 和 apply
categories: [ Bash, Docker Compose, Deployment ]
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.1`

Ubuntu 侧的 `manage.sh` 不是把 Docker 命令随便包一层，而是把几个容易误用的操作语义拆开了。最关键的是 `restart` 和 `apply`。

脚本完整源码较长，正文不贴全文，最新版本直接看 GitHub：[manage.sh](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/unix/manage.sh)。

重启保留容器：

```bash
restart_services() {
  compose restart
}
```

应用 Compose 定义则可能重建容器：

```bash
apply_services() {
  compose up -d
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/unix/manage.sh](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/unix/manage.sh)

这两个命令的适用场景不同。修改 `config/provider/application.yaml` 后，应用重新读取配置，`restart service-provider` 就够了；修改 `.env` 里的 `APP_TAG`、Jasypt 主密钥或 Compose 文件后，容器创建时的配置变了，必须执行 `apply all` 或 `docker compose up -d` 让 Compose 按需重建。

脚本在交互入口也反复提示这条边界：

```bash
warn "外置 YAML 只需要 restart；修改 .env 或 docker-compose.yml 时请使用 apply。"
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/unix/manage.sh](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/unix/manage.sh)

服务清单同样来自 Compose：

```bash
service_text=$(compose config --services 2>/dev/null | sort)
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/unix/manage.sh](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/unix/manage.sh)

这比在 Bash 里手写 `SERVICES=(provider consumer gateway mail)` 稳。Compose 中有哪些服务，脚本就展示哪些服务；`start`、`stop`、`restart`、`logs`、`scale` 都基于同一份解析结果。

`.env` 的处理也克制：不存在时可以从模板复制并 `chmod 600`，编辑时不把内容打印到终端；如果修改了 `APP_TAG`、`SPRING_PROFILE` 或 Jasypt 主密钥，再提醒执行 `apply`。

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/unix/manage.sh](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/unix/manage.sh)

### 日常命令

进入交互菜单：

```bash
cd /home/zjc/app
./scripts/unix/manage.sh
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/README.md)

非交互模式更适合固定操作和远程 SSH：

```bash
./scripts/unix/manage.sh status
./scripts/unix/manage.sh start all
./scripts/unix/manage.sh stop service-provider
./scripts/unix/manage.sh restart service-provider
./scripts/unix/manage.sh config-restart service-provider
./scripts/unix/manage.sh apply all
./scripts/unix/manage.sh logs service-provider
./scripts/unix/manage.sh recent service-gateway 300
./scripts/unix/manage.sh scale service-provider 2
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/README.md)

发布新版本时，Windows 先执行：

```powershell
.\deploy\scripts\windows\deploy.ps1 -Build -Load -Tag "1.0.1"
```

Ubuntu 再切换版本并应用：

```bash
cd /home/zjc/app
vi .env

# APP_TAG=1.0.1
./scripts/unix/manage.sh apply all
./scripts/unix/manage.sh status
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/README.md)

验证通过后，再查看镜像和日志：

```bash
./scripts/unix/manage.sh images
./scripts/unix/manage.sh logs service-provider
curl http://192.168.100.128/api/v1/provider/user/1
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/scripts/README.md)

### 经验总结

维护脚本的价值在于把操作语义讲清楚：`restart` 重读应用配置，`apply` 应用容器定义。版本发布、环境变量变化走 `apply`，外置 YAML 变化走 `restart`，回滚和扩容才不容易踩错档。
