---
layout: mypost
title: Jib buildTar 生成离线镜像包
categories: [ Jib, Maven, Docker ]
featured: true
---

> **代码环境**
>
> - 仓库：[https://github.com/springvortex/spring-cloud-alibaba.git](https://github.com/springvortex/spring-cloud-alibaba.git)
> - 分支：`release/v1.0.0`
> - JDK：`21`
> - Spring Boot：`4.1.1`

这次容器化没有走“本机 docker build”的路线，而是用 Jib 的 `buildTar` 直接生成 OCI 镜像 tar。它的好处很实际：Windows 开发机不需要安装 Docker Desktop，也不需要启动 Docker daemon；产物可以直接 `scp` 到 Ubuntu，再由服务器执行 `docker load`。

父 POM 先把公共决策收敛起来：

```xml
<jib-maven-plugin.version>3.5.2</jib-maven-plugin.version>
<docker.image-prefix>zjc</docker.image-prefix>
<docker.tag>${project.version}</docker.tag>
<docker.base-image>dockerproxy.net/library/eclipse-temurin:21-jre</docker.base-image>
<jib.skip>true</jib.skip>
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml)

`jib.skip` 默认是 `true`，所以日常 `mvn clean package` 不会偷偷生成四个镜像 tar。只有显式激活 `docker-tar` Profile 的模块才把开关关掉。

Jib 的公共配置也放在父 POM：

```xml
<execution>
    <id>build-docker-tar</id>
    <phase>package</phase>
    <goals>
        <goal>buildTar</goal>
    </goals>
</execution>
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml)

镜像基础信息、平台、工作目录和 JVM 参数由父 POM 统一声明：

```xml
<image>${docker.image-prefix}/${project.artifactId}:${docker.tag}</image>
<platforms>
    <platform>
        <os>linux</os>
        <architecture>amd64</architecture>
    </platform>
</platforms>
<workingDirectory>/app</workingDirectory>
<jvmFlags>
    <jvmFlag>-Dspring.config.additional-location=optional:file:/app/config/</jvmFlag>
    <jvmFlag>-XX:MaxRAMPercentage=75.0</jvmFlag>
    <jvmFlag>-XX:+ExitOnOutOfMemoryError</jvmFlag>
    <jvmFlag>-XX:+HeapDumpOnOutOfMemoryError</jvmFlag>
</jvmFlags>
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/pom.xml)

这段公共配置承担了几件事：镜像名统一为 `zjc/<module>:tag`，平台固定为部署机常见的 `linux/amd64`，工作目录固定为 `/app`，容器统一支持外置配置，并按容器内存限制计算堆。OOM 时进程退出，交给 Docker 的重启策略处理，同时保留堆转储现场。

可运行服务只补齐自己真正不同的三个值。以 Provider 为例：

```xml
<profile>
    <id>docker-tar</id>
    <properties>
        <docker.main-class>com.zjc.provider.ProviderApplication</docker.main-class>
        <docker.container-port>9001</docker.container-port>
        <jib.skip>false</jib.skip>
    </properties>
</profile>
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-provider/pom.xml)

这样模块 POM 不需要复制 Jib 全量配置，新增可运行服务时也只需要说明启动类、容器端口和开关。构建命令是：

```bash
mvn -Pdocker-tar "-Ddocker.tag=1.0.0" -DskipTests clean package
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/README.md)

最终每个服务都会得到 `target/jib-image.tar`。Jib 不需要 Docker daemon，但构建基础镜像时仍要能读取基础镜像 manifest；如果代理地址不可用，可以用 `-Ddocker.base-image=...` 换成可访问的 `eclipse-temurin:21-jre` 地址。

### 从 Maven 到 Docker 的完整过程

先看纯命令链路。Windows 开发机只需要 JDK 21、Maven、`ssh/scp`，不需要安装 Docker；Docker Engine 和 Compose 插件安装在 Ubuntu 部署机上。

第一步，在仓库根目录构建全部镜像：

```powershell
mvn -Pdocker-tar "-Ddocker.tag=1.0.0" -DskipTests clean package
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md)

构建完成后会得到四个 tar：

```text
service-provider\target\jib-image.tar
service-consumer\target\jib-image.tar
service-gateway\target\jib-image.tar
service-mail\target\jib-image.tar
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md)

临时只验证 Provider 时，可以只构建 Provider 及其依赖模块：

```powershell
mvn -pl service-provider -am -Pdocker-tar "-Ddocker.tag=1.0.0" -DskipTests clean package
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md)

第二步，把 tar 传输到 Ubuntu。日常推荐直接用部署脚本：

```powershell
.\deploy\scripts\windows\deploy.ps1 -Build -Load -Tag "1.0.0"
```

它会执行 Maven 构建、同步 Compose 和配置模板、传输镜像 tar，并远程执行 `docker load`。如果想完全手动，则用 `scp` 把每个 `jib-image.tar` 传到部署机的 `images/` 目录。

第三步，首次部署要在 Ubuntu 上生成两个不会被脚本覆盖的东西：

```bash
cd /home/zjc/app

cp .env.example .env
chmod 600 .env
vi .env

for module in provider consumer gateway mail; do
  [ -f "config/$module/application.yaml" ] ||
    cp "config/$module/application.yaml.template" \
       "config/$module/application.yaml"
done
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md)

`.env` 中至少确认三个值：

```text
APP_TAG=1.0.0
SPRING_PROFILE=dev
JASYPT_ENCRYPTOR_PASSWORD=真实主密钥
```

`APP_TAG` 必须和 Maven 构建时的 `-Ddocker.tag` 一致，否则 Compose 找不到刚加载的镜像。

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md)

第四步，如果没有让脚本远程加载镜像，在 Ubuntu 执行：

```bash
cd /home/zjc/app
for module in provider consumer gateway mail; do
  docker load -i "images/service-$module.tar"
done
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md)

第五步，启动并验证：

```bash
docker compose up -d
docker compose ps
docker compose images
docker compose logs --tail=200 service-provider

curl http://192.168.100.128/api/v1/provider/user/1
curl http://192.168.100.128/api/v1/consumer/user/1
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md)

发布 `1.0.1` 时流程固定为：

```powershell
mvn -Pdocker-tar "-Ddocker.tag=1.0.1" -DskipTests clean package
.\deploy\scripts\windows\deploy.ps1 -Tag "1.0.1" -Load
```

然后在 Ubuntu 修改 `.env` 的 `APP_TAG=1.0.1`，再执行 `docker compose up -d`。镜像 tag 变化后必须让 Compose 重建容器，只执行 `restart` 不会切换镜像。

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/deploy/README.md)

### 经验总结

`buildTar` 适合没有镜像仓库的单机部署链路：公共镜像策略放父 POM，服务差异放模块 Profile，产物离线传输。只要 tag 不复用，这条链路比每台机器都装一套构建环境更可控。
