# 知行合一

基于 Jekyll 4.4.1 的个人技术博客。站点为纯静态输出，适配手机、平板和桌面浏览器，通过 GitHub Pages Actions 自动部署。

## 功能特性

- 明暗主题切换，可点击页头头像，也可使用右下角主题按钮
- 客户端站内搜索，无需后端服务
- 分类归档页，按年份和分类整理文章
- 文章目录：桌面端固定在右侧，非桌面端从右下角按钮展开
- Rouge 代码高亮，提供明暗两套配色
- 文章代码块一键复制
- 生产构建自动压缩 JS / CSS，并去除产物注释；第三方 vendor 文件保持原样
- 图片点击全屏预览
- 文章二维码，手机扫码打开当前文章
- MathJax 数学公式渲染，从 jsDelivr 按文章内容按需加载
- Mermaid 图表渲染，从 jsDelivr 按文章内容按需加载
- PWA 离线缓存和可安装 Manifest
- 文章 URL 基于源文件 MD5 自动生成
- 静态资源缓存版本基于站点源码内容指纹生成，重建未变更内容时可继续复用缓存
- 文章图片自动补充懒加载、异步解码和原始宽高，降低布局偏移
- 页面使用 `<main>` 语义化主内容区域，适配手机、平板和桌面浏览器
- SEO 自动输出 canonical、文章摘要、Open Graph 和 Twitter Card

## 质量快照

2026-08-18 使用 Lighthouse 13.4.1 测试线上文章
[MathJax 与 Mermaid 加载测试](https://uhaiin.com/20240e78eee91e4b4eee4a2c62ca0738/)：

| 客户端 | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| 手机 | 74 | 98 | 100 | 100 |
| 平板（820×1180 / DPR 2） | 86 | 98 | 100 | 100 |
| 电脑 | 92 | 98 | 100 | 100 |

当前可访问性扣分来自文章标题从 `h3` 开始，导致 `h1` 后跳过 `h2`；这是当前文章书写约定。公式和 Mermaid 测试页在 412、820、1366 像素宽度下均正常渲染，无横向溢出。

手机性能瓶颈主要是 MathJax `tex-svg-full.js` 约 `640 KiB` 的传输体积；Mermaid 渲染替换原始代码块时会带来一定布局偏移。性能分数会受网络和 CDN 波动影响，以上结果仅作为当时快照。

## 目录结构

```text
├── .github/workflows/  # GitHub Pages 构建工作流
├── _config.yml         # 站点配置、菜单、功能开关、书签
├── _includes/          # head、header、footer 和扩展功能组件
├── _layouts/           # page / mypost 页面布局
├── _plugins/           # Jekyll 插件，当前负责 MD5 链接和资源路径改写
├── _posts/             # 文章 Markdown 源文件
├── pages/              # 关于、分类、搜索、书签等独立页面
├── posts/              # 文章资源，按 年/月/日 目录存放
├── static/             # CSS、JS、字体、图标和 XML 索引
├── 404.md              # 404 页面
├── CNAME               # 自定义域名
├── Gemfile             # Ruby 依赖
├── package.json        # 生产构建压缩依赖
├── scripts/            # 构建辅助脚本
├── source-assets/      # 源素材，不参与 Jekyll 构建
├── blog.sh             # 本地预览和生产构建脚本
├── index.html          # 首页
└── service-worker.js   # PWA Service Worker
```

## 本地开发

环境要求：

- Ruby 3.3.x
- Bundler
- Node.js 22+（仅生产构建压缩需要，与 GitHub Actions 保持一致）

安装依赖并启动本地服务：

```bash
bundle install
./blog.sh run
```

`./blog.sh run` 用于本地预览，保留未压缩源码；`./blog.sh build` 会先构建 Jekyll，再通过 esbuild 压缩产物中的自定义 JS、CSS 和 `service-worker.js`。源码文件保留注释，方便维护。线上部署由 GitHub Pages Actions 完成压缩。

默认访问 `http://localhost:8080`。指定端口运行：

```bash
./blog.sh run 4000
```

Windows 用户建议在 Git Bash、WSL 或其他 Bash 兼容环境中执行 `blog.sh`。

如需执行生产构建，先安装 Node 依赖：

```bash
npm ci
./blog.sh build
```

## 站点配置

常用信息集中在 `_config.yml`：

```yaml
title: 知行合一
description: 知行合一
keywords: zjc,Blog,Java,Html,JavaScript,Jekyll
author: zjc
footerText: '联系我（email）: <a href="mailto:jiancai.zhong.1997@gmail.com">jiancai.zhong.1997@gmail.com</a>'
```

`footerText` 支持 HTML，可用于 `mailto:` 链接。

### 导航菜单

```yaml
menu:
  - title: 首页
    url: /
  - title: 归类
    url: /pages/categories.html
  - title: GitHub
    url: https://github.com
    target: _blank
```

内部链接会自动拼接 `baseurl`；外部链接建议显式配置 `target`。

### 书签页

`pages/links.html` 渲染 `_config.yml` 中的 `links`：

```yaml
links:
  - title: GitHub
    url: https://github.com
```

### 关于页面

编辑 [pages/about.md](pages/about.md)。该页面正文从三级标题开始书写。

## 头像与图标

| 文件                     | 用途                     | 引用位置                    |
|--------------------------|--------------------------|-----------------------------|
| `static/img/logo.webp`   | 页头头像、预加载图片     | `_includes/header.html`、`_includes/head.html` |
| `static/img/logo.jpg`    | Apple 触摸图标           | `_includes/head.html`       |
| `static/img/favicon.ico` | 浏览器标签页图标         | `_includes/head.html`       |
| `static/img/icon-192.png` / `static/img/icon-512.png` | PWA 图标 | `static/manifest.webmanifest` |

替换文件即可更新图标。根目录下的 `favicon.ico` 当前未被站点引用。

生成多尺寸 favicon 的 Python 示例：

```python
from PIL import Image

src = Image.open("static/img/logo.jpg").convert("RGBA")
sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
frames = [src.resize(size, Image.LANCZOS) for size in sizes]
frames[0].save("static/img/favicon.ico", format="ICO")
```

## 写文章

文章放在 `_posts`，命名格式：

```text
yyyy-MM-dd-文章名.md
```

示例：

```text
_posts/2026-08-17-my-post.md
```

Front Matter 示例：

```yaml
---
layout: mypost
title: 文章标题
categories: [ 分类1, 分类2 ]
author: jiancai.zhong
date: 2026-08-17
---
```

| 字段         | 必填 | 说明                         |
|--------------|------|------------------------------|
| `layout`     | 是   | 固定为 `mypost`              |
| `title`      | 是   | 文章标题，显示在列表和文章页 |
| `categories` | 否   | 分类数组，自动进入归类页     |
| `author`     | 否   | 默认使用 `site.author`       |
| `date`       | 否   | 默认取文件名日期             |

Markdown 语法示例可参考 [_posts/2025-01-01-md的使用.md](_posts/2025-01-01-md的使用.md)。

### 代码块

使用围栏代码块并显式声明语言，例如：

````markdown
```java
public class Demo {
}
```
````

Rouge 会按语言高亮，文章页会自动显示复制按钮。Mermaid 图使用 `mermaid` 语言标识，构建后渲染为图表，不显示复制按钮。

## 文章资源

文章引用的图片、压缩包等资源放在 `posts/年/月/日/` 目录：

| 文章文件名              | 资源目录            |
|-------------------------|---------------------|
| `2026-08-17-my-post.md` | `posts/2026/08/17/` |
| `2026-08-18-hello.md`   | `posts/2026/08/18/` |

文章中使用相对路径引用：

```markdown
![图片说明](yun.webp)
```

构建时插件会把相对资源链接改写为：

```text
/posts/年/月/日/文件名
```

因此文章页面使用 MD5 URL 时，资源仍然按原日期目录访问，不会变成 `/<md5>/yun.webp`。

当前支持改写的常见静态资源后缀包括：`webp`、`png`、`jpg`、`jpeg`、`gif`、`svg`、`bmp`、`ico`、`pdf`、`zip`、`rar`、`7z`、`txt`。

### SEO 文件

构建输出包含：

| 文件                     | 用途             |
|--------------------------|------------------|
| `robots.txt`             | 爬虫规则、sitemap 声明 |
| `static/manifest.webmanifest` | PWA 安装信息 |
| `static/xml/sitemap.xml` | 站点地图         |
| `static/xml/rss.xml`     | RSS 订阅         |
| `static/xml/search.xml`  | 站内搜索内容索引 |

这些文件由 Jekyll 模板生成，通常不需要手工编辑。

页面会自动生成 `canonical`、Open Graph 和 Twitter Card。文章描述优先读取 Front Matter 的 `description`；未填写时自动截取文章开头作为摘要：

```yaml
description: 一句话说明这篇文章解决什么问题。
```

### 搜索平台验证

`_config.yml` 中预留了三个验证字段，默认留空时不输出任何验证标签：

```yaml
googleSiteVerification: ''
bingSiteVerification: ''
baiduSiteVerification: ''
```

如果选择 HTML 标签验证，把平台给出的验证码填入对应字段并重新部署即可：

| 平台 | 输出标签 |
|---|---|
| Google Search Console | `<meta name="google-site-verification">` |
| Bing Webmaster Tools | `<meta name="msvalidate.01">` |
| 百度搜索资源平台 | `<meta name="baidu-site-verification">` |

Google 更推荐在阿里云 DNS 添加 TXT 记录，使用 Domain 属性验证 `uhaiin.com`，这样可以覆盖所有子域名和 HTTP / HTTPS 变体。Bing 支持从 Google Search Console 导入站点，通常最省事。

## 文章 MD5 链接

`_plugins/md5_permalink.rb` 会在构建时为文章生成：

```text
/<md5>/
```

规则：

- MD5 的输入是文章 Markdown 源文件内容
- 计算前会把 CRLF 统一为 LF，Windows 和 Linux 构建结果一致
- 源文件任何内容变化都会改变文章 URL，包括改标题、改错别字、改 Front Matter 或改空白字符
- 不修改源 Markdown 中的相对资源路径，因此资源改写不会反向影响文章 MD5
- 首页、RSS、sitemap 和文章二维码都会使用当前构建出的 URL

`_config.yml` 中的 `permalink: /posts/:year/:month/:day/:title` 仅作为未走插件的兜底配置；正常构建文章时会被 MD5
permalink 覆盖。

## 可选功能开关

在 `_config.yml` 中控制：

```yaml
extClickEffect: false   # 点击文字冒出特效
extMath: true           # MathJax 数学公式
extMermaid: true        # Mermaid 图表
extQrCode: true         # 文章二维码
extThemeToggle: true    # 右下角主题按钮；关闭后仍可点击头像切换
extServiceWorker: true  # PWA 离线缓存
```

文章目录和代码复制按钮当前为默认功能，未单独设置开关。

## 第三方 CDN 与性能

站点自身资源全部由 GitHub Pages 提供，只有两个大体积渲染库从 jsDelivr 按需加载：

| 功能 | 版本 | 加载时机 |
|---|---|---|
| MathJax | 3.2.2 | 文章中检测到公式时 |
| Mermaid | 11.16.1 | 文章中检测到 `mermaid` 代码块时 |

两个脚本都固定版本并启用 Subresource Integrity。普通文章不会请求这两个库；包含公式或图表的文章会在渲染时请求。缺点是依赖第三方 CDN 可用性，CDN 不可访问时公式或图表无法渲染，但页面主体内容仍可访问。如需完全自主可控，可把对应脚本改回本地加载，代价是增加仓库和部署产物体积。

构建时还会做这些优化：

- 自定义 JS、CSS 和 `service-worker.js` 使用 esbuild 压缩，并移除注释
- `vendor` 目录中的第三方脚本不参与压缩，保留上游发布内容
- `buildAt` 由源码内容指纹生成，并用于 CSS、JS、搜索索引和二维码脚本的缓存参数
- 文章本地图片自动添加 `loading="lazy"`、`decoding="async"`、`width`、`height`
- 页头头像使用 WebP 并在 HTML 中预加载
- 文章页提前 `preconnect` jsDelivr，降低公式和图表资源的连接建立时间
- Mermaid 渲染前预留占位高度，降低源码块替换成图表时的布局跳动

## 浏览器支持

本站面向现代浏览器，支持当前版本和近两年主流版本的 Chrome、Edge、Firefox 和 Safari，不兼容 IE。源码使用 `const` / `let`、模块脚本、CSS 自定义属性等现代特性。

## 部署

### GitHub Pages

仓库提供 [.github/workflows/pages.yml](.github/workflows/pages.yml)，使用 Ruby 3.3、Bundler、Jekyll 4.4.1、Node.js 和 esbuild 构建并压缩站点。

GitHub 仓库需要设置：

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

推送 `main` 分支后自动部署，也可以在：

```text
Actions -> Build and deploy Pages -> Run workflow
```

手动触发。

如果从零新建仓库，仓库名必须使用：

```text
<用户名>.github.io
```

这是 GitHub Pages 的默认用户站点域名规则。使用这个仓库名后，GitHub 会把站点发布到 `https://<用户名>.github.io/`，根路径不需要追加子路径；绑定自定义域名 `uhaiin.com` 后，GitHub Pages 会根据仓库中的 `CNAME` 文件自动应用域名。

项目仓库（例如 `blog`）也可以启用 Pages，但默认地址会带仓库路径，例如 `https://<用户名>.github.io/blog/`，需要额外处理 `baseurl` 和静态资源路径。当前站点配置为根路径部署，最省心的方式是使用 `<用户名>.github.io` 用户仓库。

### 域名

- 自定义域名保留 `CNAME`
- GitHub 默认域名需删除 `CNAME`，并将仓库命名为 `<用户名>.github.io`

阿里云 DNS 中通常为自定义域名添加 `CNAME` 指向 `<用户名>.github.io`。域名生效后，建议在 GitHub Pages 设置中确认自定义域名和 HTTPS 证书状态。

## 许可证

本项目采用 [Apache License 2.0](LICENSE) 授权。
