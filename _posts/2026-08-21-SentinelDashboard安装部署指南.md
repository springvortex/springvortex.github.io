---
layout: mypost
title: Sentinel Dashboard 安装部署指南
categories: [ Deployment, Sentinel, Resilience ]
---

> 下载地址/官网：[Sentinel Dashboard Releases](https://github.com/alibaba/Sentinel/releases)

Sentinel Dashboard 是规则的可视化控制台，可以查看接口 QPS、拒绝数、响应耗时，并动态下发限流规则。你当前项目里的 Sentinel
规则已经在配置文件中声明，Dashboard 接入后要分清“配置里的启动规则”和“控制台临时修改规则”。

### 端口和用途

| 端口 | 用途                    |
|-----:|-------------------------|
| 8080 | Dashboard Web 页面      |
| 8719 | Sentinel 客户端通信端口 |

8080 只给运维或内网访问，8719 由客户端使用，都不要暴露公网。

### Windows 安装部署 Sentinel Dashboard

1. 确认 JDK：

```powershell
java -version
```

2. 下载官方 Dashboard JAR：

```powershell
New-Item -ItemType Directory -Force -Path D:\apps\sentinel-dashboard
Invoke-WebRequest `
  -Uri "https://github.com/alibaba/Sentinel/releases/download/1.8.8/sentinel-dashboard-1.8.8.jar" `
  -OutFile "D:\apps\sentinel-dashboard\sentinel-dashboard-1.8.8.jar"
```

3. 启动，并覆盖默认账号密码：

```powershell
java `
  -Dserver.port=8080 `
  -Dsentinel.dashboard.auth.username=zjc `
  -Dsentinel.dashboard.auth.password=your-dashboard-password `
  -jar D:\apps\sentinel-dashboard\sentinel-dashboard-1.8.8.jar
```

4. 访问：

```text
http://127.0.0.1:8080/
```

使用刚才设置的用户名和密码登录。

### Ubuntu 安装部署 Sentinel Dashboard

1. 创建目录并下载：

```bash
sudo mkdir -p /opt/sentinel-dashboard
sudo curl -fL \
  -o /opt/sentinel-dashboard/sentinel-dashboard-1.8.8.jar \
  https://github.com/alibaba/Sentinel/releases/download/1.8.8/sentinel-dashboard-1.8.8.jar
```

2. 启动：

```bash
nohup java \
  -Dserver.port=8080 \
  -Dsentinel.dashboard.auth.username=zjc \
  -Dsentinel.dashboard.auth.password=your-dashboard-password \
  -jar /opt/sentinel-dashboard/sentinel-dashboard-1.8.8.jar \
  > /opt/sentinel-dashboard/dashboard.log 2>&1 &
```

3. 验证：

```bash
curl -I http://127.0.0.1:8080/
ss -lntp | grep 8080
```

### macOS 安装部署 Sentinel Dashboard

1. 创建目录并下载：

```bash
mkdir -p ~/apps/sentinel-dashboard
curl -fL \
  -o ~/apps/sentinel-dashboard/sentinel-dashboard-1.8.8.jar \
  https://github.com/alibaba/Sentinel/releases/download/1.8.8/sentinel-dashboard-1.8.8.jar
```

2. 启动：

```bash
nohup java \
  -Dserver.port=8080 \
  -Dsentinel.dashboard.auth.username=zjc \
  -Dsentinel.dashboard.auth.password=your-dashboard-password \
  -jar ~/apps/sentinel-dashboard/sentinel-dashboard-1.8.8.jar \
  > ~/apps/sentinel-dashboard/dashboard.log 2>&1 &
```

3. 浏览器访问：

```text
http://127.0.0.1:8080/
```

### 客户端接入要点

应用需要配置 Dashboard 地址和客户端端口：

```yaml
spring:
  cloud:
    sentinel:
      transport:
        dashboard: 127.0.0.1:8080
        port: 8719
```

> [https://sentinelguard.io/zh-cn/docs/dashboard.html](https://sentinelguard.io/zh-cn/docs/dashboard.html)

Dashboard 首页开始可能是空的，通常要等应用启动并发起流量后才会出现。

### 生产部署建议

1. 必须覆盖默认账号密码。
2. Dashboard 不要暴露公网，至少要加反向代理认证和访问控制。
3. 控制台修改默认存在内存里，重启会丢；生产规则要接配置中心或数据库持久化。
4. 当前项目已有配置化规则，接入 Dashboard 后要明确哪边是生产规则的最终来源。
5. 规则变更要有记录，方便回滚。

### 常见问题

Dashboard 看不到服务，依次检查客户端依赖、Dashboard 地址、8719 端口、防火墙和是否已有请求流量。

规则重启后消失，是未做持久化的典型表现。

页面登录成功但机器列表为空，不一定是账号问题，通常还是客户端通信链路没通。
