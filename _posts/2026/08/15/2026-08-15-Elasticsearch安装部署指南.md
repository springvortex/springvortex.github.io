---
layout: mypost
title: Elasticsearch 安装部署指南
categories: [ Deployment, Elasticsearch, Search ]
---

> 下载地址/官网：[Elasticsearch Download](https://www.elastic.co/downloads/elasticsearch)

Elasticsearch 后续可以做商品搜索、文章搜索、日志检索和复杂聚合分析。它不是普通数据库的替代品，索引结构、分词、字段类型和刷新策略都会影响效果。

### 端口和用途

| 端口 | 用途                  |
|-----|-----------------------|
| 9200 | HTTP API 和客户端访问 |

9200 不要直接暴露公网。生产环境必须启用安全认证和 TLS。

### Windows 安装部署 Elasticsearch

1. 打开 [Elasticsearch Download](https://www.elastic.co/downloads/elasticsearch)，下载 Windows ZIP 包。

2. 解压到固定目录，例如：

```text
D:\apps\elasticsearch
```

3. 仅本机学习时，可以先关闭安全认证。编辑 `config\elasticsearch.yml`，追加：

```yaml
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
```

4. 启动：

```powershell
Set-Location D:\apps\elasticsearch
.\bin\elasticsearch.bat
```

5. 验证：

```powershell
Invoke-RestMethod http://127.0.0.1:9200
```

看到 `cluster_name` 和版本信息即可。

6. 如果保留安全认证，首次启动时终端会输出 `elastic` 的初始密码，必须保存。忘记密码可以重置：

```powershell
.\bin\elasticsearch-reset-password.bat -u elastic
```

### Ubuntu 安装部署 Elasticsearch

1. 添加官方 APT 源：

```bash
sudo apt update
sudo apt install -y apt-transport-https
es_keyring=/usr/share/keyrings/elasticsearch-keyring.gpg
curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch \
  | sudo gpg --dearmor -o "$es_keyring"
echo "deb [signed-by=$es_keyring] https://artifacts.elastic.co/packages/8.x/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
```

2. 安装：

```bash
sudo apt update
sudo apt install -y elasticsearch
```

3. 小内存测试环境限制堆内存。编辑 `/etc/elasticsearch/jvm.options.d/heap.options`：

```text
-Xms1g
-Xmx1g
```

4. 启动并设为开机自启：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now elasticsearch
sudo systemctl status elasticsearch --no-pager
```

5. APT 安装默认启用安全认证。查看或重置密码：

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic
```

6. 验证：

```bash
curl -k -u elastic:'your-elastic-password' https://127.0.0.1:9200
```

### macOS 安装部署 Elasticsearch

1. 使用官方 Homebrew 包：

```bash
brew install elastic/tap/elasticsearch-full
```

2. 启动：

```bash
brew services start elastic/tap/elasticsearch-full
```

3. 验证：

```bash
curl -k https://127.0.0.1:9200
```

如果启用安全认证，需要加 `-u elastic` 并输入密码。

### 生产部署建议

1. 至少三节点，避免脑裂和数据不可用。
2. 堆内存一般不超过机器内存一半，且不要超过 31GB。
3. 必须启用 TLS、认证、角色和索引权限。
4. 分片数和副本数按数据量规划，不是越多越好。
5. 明确映射，避免字段类型被第一条数据带偏。
6. 写入频繁的场景调低 `refresh_interval` 带来的实时性预期。

### 常见问题

启动失败提示 `vm.max_map_count`，Linux 上需要按官方文档调大内核参数。

9200 能连但返回 401，说明安全认证已启用，账号密码或 TLS 配置不对。

写入延迟高不要先加节点，先确认 refresh interval、分片大小、mapping 和查询是否合理。
