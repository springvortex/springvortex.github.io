# SpringVortex Notes

SpringVortex Notes 是基于 Jekyll 4.4.1 的个人技术博客，内容集中在 Java、Spring Cloud Alibaba、微服务工程和中间件部署实践。站点输出纯静态 HTML，使用原生前端技术，通过 GitHub Pages Actions 自动构建和部署。

截至 2026-08-22，仓库包含 88 篇文章、53 个分类和 10 个文章资源文件。

## 项目概览

| 项 | 当前状态 |
|---|---|
| 站点类型 | 纯静态博客，无后端服务 |
| 内容系统 | Jekyll 4.4.1 + Kramdown / GFM + Rouge |
| 前端实现 | 原生 HTML / CSS / JavaScript |
| 生产压缩 | Node.js 22 + esbuild 0.25.0 |
| 主要部署 | GitHub Pages Actions |
| 部署产物 | `_site` 中的静态文件 |
| 运行环境 | 现代 Chrome、Edge、Firefox、Safari，不兼容 IE |

产品定位是“个人技术阅读室”：优先保证文章、代码、表格和检索的阅读效率，而不是营销页视觉或重型前端运行时。`PRODUCT.md` 保留了产品受众、边界和设计原则，可在调整信息架构或视觉时作为参考。

## 功能特性

- 响应式首页、分类页、搜索页、书签页和关于页
- 客户端搜索，同时匹配文章标题和正文，不需要后端服务
- 首页、分类页和搜索页桌面端右侧信息栏：首页展示精选文章和最新评论，分类页展示最新文章，搜索页展示快捷搜索；分类页和搜索页共用常用分类模块
- 搜索页桌面端热门搜索侧栏：先用文章数最多的 20 个分类占位，新搜索词逐个替换文章数最少的分类，始终保留 20 条
- 首页桌面端热门文章侧栏：文章页记录打开次数，CI 每 6 小时生成热门榜，不足 20 篇时用最新文章补足
- 分类归档按 A-Z 排序；桌面端左侧固定分类索引，分类超多时索引内部滚动
- 首页年份列表和分类列表分批展示，手动加载后续文章
- 首页和搜索结果摘要最多两行，避免长段落撑开列表
- 明暗主题：默认跟随系统，可记忆手动选择，通过右下角主题按钮切换
- 文章目录：桌面端固定在右侧，平板和手机通过按钮展开
- 桌面端文章页保留左侧相关推荐和右侧目录
- 文章二维码，手机扫码打开当前文章
- 文章末尾 giscus 评论区：评论数据存放在仓库 GitHub Discussions，跟随站点明暗主题
- 代码高亮和默认可见的一键复制按钮
- MathJax 数学公式和 Mermaid 图表按内容检测加载
- 图片点击放大、懒加载、异步解码和尺寸预留
- PWA 离线缓存和可安装 Manifest
- SEO 输出：canonical、description、Open Graph、Twitter Card、RSS 和 sitemap

## 架构总览

```text
Markdown / Liquid / 静态资源
        |
        |  Jekyll 构建
        |  1. 发布日期、作者、标题计算 MD5 permalink
        |  2. 文章相对资源改写到日期资源目录
        |  3. Kramdown 渲染 Markdown
        |  4. 本地图片补充懒加载和宽高
        |  5. 生成 HTML、RSS、sitemap 和搜索索引
        v
_site 静态产物
        |
        |  esbuild 压缩自定义 JS / CSS / Service Worker
        v
GitHub Pages 部署产物
```

### 核心目录

| 路径 | 职责 |
|---|---|
| `_posts/` | 文章 Markdown，按 `yyyy/MM/dd` 分目录存放 |
| `posts/` | 文章图片、压缩包等资源，目录与文章日期对应 |
| `pages/` | 分类、搜索、书签、关于和 404 等独立页面 |
| `_layouts/` | 通用页面布局和文章布局 |
| `_includes/` | head、header、footer、主题初始化和可选功能组件 |
| `_plugins/` | MD5 permalink、资源改写和性能钩子 |
| `static/css/` | 通用、页面、文章、主题和代码高亮样式 |
| `static/js/` | 站点交互、搜索和本地二维码 vendor 脚本 |
| `static/xml/` | RSS、sitemap 和搜索索引 Liquid 模板 |
| `scripts/` | 生产产物压缩脚本 |
| `.github/workflows/` | GitHub Pages 构建部署工作流 |
| `service-worker.js` | PWA 预缓存、运行时缓存和离线导航 |
| `source-assets/` | 源素材，不参与 Jekyll 构建 |

生成目录 `_site/`、`dist/`、`node_modules/` 以及本地助手目录 `.agents/`、`.codex/`、`.impeccable/` 均不纳入版本控制。

### 页面职责

| 页面 | 源文件 | 说明 |
|---|---|---|
| 首页 | `index.html` | 文章列表、分类标签和两行摘要 |
| 分类 | `pages/categories.html` | 按分类和日期组织文章 |
| 搜索 | `pages/search.html` | 客户端标题和全文检索 |
| 书签 | `pages/links.md` | 渲染 `_config.yml` 中的 `links` 配置 |
| 关于 | `pages/about.md` | 个人介绍和使用说明 |
| 404 | `404.md` | 找不到页面时的兜底 |

### Jekyll 插件

| 插件 | 构建时机 | 作用 |
|---|---|---|
| [_plugins/md5_permalink.rb](_plugins/md5_permalink.rb) | 文章初始化、渲染前 | 根据发布日期、作者、标题生成 MD5 文章 URL，并把文章内相对资源改写到 `/posts/yyyy/MM/dd/` |
| [_plugins/performance.rb](_plugins/performance.rb) | 站点初始化、文章渲染后 | 计算源内容指纹 `buildAt`，为本地图片补 `loading`、`decoding`、`width`、`height` |

`buildAt` 不是当前时间，而是源内容指纹。因此内容不变时重复构建，CSS、JS、搜索索引和 Service Worker 的缓存版本保持不变，浏览器缓存可以继续复用。

## 响应式与交互

| 视口 | 布局和交互 |
|---|---|
| `<= 700px` | 手机布局。右下角快捷操作折叠为一个入口；第一次点击展开，第二次再选择回到顶部、二维码、主题或目录。 |
| `701px - 1199px` | 平板布局。快捷操作直接显示，目录按钮也显示在右下角；分类索引不显示。 |
| `>= 1200px` | 桌面文章页显示左侧相关推荐和右侧固定目录；首页、分类页和搜索页显示左侧对应栏目和右侧信息栏；右下角不显示目录按钮。 |
| `>= 1330px` | 在桌面布局基础上加宽阅读区和侧边面板。 |

右下角操作顺序固定为回到顶部、文章二维码、切换主题、文章目录。二维码按钮只在文章页出现；回到顶部图标会等待页面滚动后出现。主题偏好保存在 `localStorage`，未手动选择前跟随系统。

页面交互脚本集中在 `static/js/blog.js`，搜索逻辑在 `static/js/search.js`。样式按职责拆分为 `common.css`、`page.css`、`post.css`、`theme-dark.css` 和代码高亮配色。

## 本地开发

环境要求：

- Ruby 3.3.x
- Bundler
- Node.js 22+ 和 npm（生产压缩需要）

安装依赖：

```bash
bundle install
npm ci
```

启动本地预览：

```bash
./blog.sh run
```

默认访问 `http://localhost:8080`。指定端口：

```bash
./blog.sh run 4000
```

本地预览保留未压缩源码，方便调试。`blog.sh` 是 Bash 脚本，Windows 用户建议在 Git Bash 或 WSL 中执行。

生产构建：

```bash
./blog.sh build
```

该命令会把 Jekyll 构建到 `dist`，再压缩 `dist` 中的自定义 JS、CSS 和 `service-worker.js`。GitHub Actions 使用同一套逻辑，只是目的地为 `_site`。

## 构建与压缩

生产构建管线如下：

```bash
bundle exec jekyll build --destination _site
npm run popular -- _site
npm ci
npm run minify -- _site
```

[scripts/minify.mjs](scripts/minify.mjs) 会处理：

- `_site/static/css` 中的 CSS
- `_site/static/js` 中的自定义 JavaScript
- `_site/service-worker.js`

`static/js/vendor/` 中的第三方脚本不会压缩，保留上游发布内容和许可证文件。源码文件保留注释，只有构建产物会被改写。

## 站点配置

常用配置集中在 [_config.yml](_config.yml)：

| 配置 | 说明 |
|---|---|
| `title` / `description` / `keywords` / `author` | 站点基础信息和 SEO 信息 |
| `url` / `domainUrl` / `baseurl` | 站点地址；当前为根路径部署，`baseurl` 为空 |
| `menu` | 页头导航，内部链接会拼接 `baseurl` |
| `links` | 书签页数据源 |
| `footerText` | 页脚内容，支持 HTML |
| `pageViewEndpoint` / `pageViewNamespace` | 文章打开计数服务；当前使用 Abacus 兼容接口，可替换为自己的服务 |
| `giscus` | 文章评论区配置；`categoryId` 为空时不输出评论区 |
| `npm run latest-comments -- _site` | 从 GitHub Discussions 生成首页最新评论索引；Pages 工作流随每次构建和每 6 小时定时构建刷新 |
| `googleSiteVerification` 等 | 搜索平台验证码，留空时不输出标签 |
| `exclude` | 排除 `CNAME`、README、脚本、依赖等非站点文件 |

### 功能开关

| 开关 | 默认值 | 说明 |
|---|---:|---|
| `extClickEffect` | `false` | 点击文字特效 |
| `extMath` | `true` | MathJax 数学公式 |
| `extMermaid` | `true` | Mermaid 图表 |
| `extQrCode` | `true` | 文章二维码 |
| `extGiscus` | `true` | 文章末尾 GitHub Discussions 评论；需要在 GitHub 开启 Discussions、安装 giscus App 并填写 `giscus.categoryId` |
| `extThemeToggle` | `true` | 右下角主题按钮；关闭后主题仍跟随系统和已保存偏好 |
| `extServiceWorker` | `true` | PWA 离线缓存 |

文章目录、代码复制、图片预览和相关推荐当前是默认功能，没有独立开关。

### 开启 giscus 评论

1. 在 GitHub 仓库 Settings 中开启 Discussions。
2. 为 `springvortex/springvortex.github.io` 安装 [giscus App](https://github.com/apps/giscus)。
3. 打开 [giscus 配置页](https://giscus.app/zh-CN)，选择本仓库和 `Announcements` 分类，取得 `categoryId`。
4. 把 `categoryId` 填入 `_config.yml` 的 `giscus.categoryId`。该值为空时文章页不输出评论区。

## 写文章

文章放在 `_posts/yyyy/MM/dd/`，文件名仍需要日期前缀：

```text
_posts/2026/08/17/2026-08-17-my-post.md
```

Front Matter 示例：

```yaml
---
layout: mypost
title: 文章标题
categories: [分类1, 分类2]
author: jiancai.zhong
date: 2026-08-17
description: 一句话说明这篇文章解决什么问题。
---
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `layout` | 是 | 固定为 `mypost` |
| `title` | 是 | 文章标题 |
| `categories` | 否 | 分类数组，会进入分类页和 SEO keywords |
| `author` | 否 | 默认使用 `site.author` |
| `date` | 否 | 默认取文件名日期 |
| `description` | 否 | 搜索引擎和社交分享摘要；未填写时自动截取正文开头 |

代码块应显式声明语言，例如：

````markdown
```java
public class Demo {
}
```
````

Mermaid 图表使用 `mermaid` 语言标识；构建后渲染为图表，不显示复制按钮。

## 文章资源与 MD5 链接

文章资源放在 `posts/yyyy/MM/dd/`。正文直接使用相对路径：

```markdown
![图片说明](001.webp)
```

构建时插件会把它改写为：

```text
/posts/yyyy/MM/dd/001.webp
```

支持改写的后缀包括 `webp`、`png`、`jpg`、`jpeg`、`gif`、`svg`、`bmp`、`ico`、`pdf`、`zip`、`rar`、`7z`、`txt`。围栏代码块内的示例路径不会被改写。

文章 URL 由稳定元数据 MD5 生成：

```text
/<md5>/
```

需要注意：

- MD5 输入是发布日期、作者和标题，不读取正文
- 发布日期按 UTC+8 格式化为 `yyyy-MM-dd`
- 文章未声明作者时使用站点作者 `zjc`
- 修改正文、分类、标签、Front Matter 其他字段或空白字符不会改变 URL
- 修改发布日期、作者或标题会生成新 URL，旧 URL 不会自动跳转
- `_config.yml` 中的日期 permalink 只是未启用插件时的兜底配置

## SEO、搜索与 PWA

构建输出包含：

| 文件 | 用途 |
|---|---|
| `robots.txt` | 爬虫规则和 sitemap 声明 |
| `static/xml/sitemap.xml` | 站点地图 |
| `static/xml/rss.xml` | RSS 订阅 |
| `static/xml/search.xml` | 全文搜索索引 |
| `static/manifest.webmanifest` | PWA 安装信息 |

搜索页会预取搜索索引，并用 `localStorage` 按内容指纹缓存；标题来自页面初始列表，正文内容来自搜索索引。

Service Worker 会预缓存首页、核心 CSS/JS 和头像，运行时缓存同源 GET 请求，跳过压缩包和 PDF 等下载资源；离线导航失败时回退到已缓存首页。非 HTTPS 环境下只允许 `127.0.0.1` 注册，方便本地调试。

## 第三方 CDN

站点自身资源由 GitHub Pages 提供。以下大体积渲染库按需从 jsDelivr 加载：

| 功能 | 版本 | 加载时机 |
|---|---|---|
| MathJax | 3.2.2 | 文章检测到公式语法时 |
| Mermaid | 11.16.1 | 文章存在 `mermaid` 代码块时 |

两者均固定版本并启用 Subresource Integrity。普通文章不会请求这些库；CDN 不可用时公式或图表无法渲染，但正文、代码和页面主体仍可访问。

## 部署

### GitHub Pages

主部署入口是 [.github/workflows/pages.yml](.github/workflows/pages.yml)：

1. Checkout `main`
2. 安装 Ruby 3.3 和 Node.js 22
3. `bundle install`
4. 生产环境构建 Jekyll 到 `_site`
5. `npm ci`
6. 压缩 `_site`
7. 上传 Pages artifact 并部署

GitHub 仓库需要设置：

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

推送 `main` 后自动部署，也可以在 Actions 页面手动触发。

### 自定义域名

当前绑定域名为 `uhaiin.com`。仓库根目录保留了 `CNAME` 文件，但 `_config.yml` 的 `exclude` 会把它排除在 Jekyll 产物之外；因此线上自定义域名真正依赖 GitHub Pages 设置中的 Custom domain 配置，而不是部署 artifact 里的 `CNAME` 文件。

迁移仓库或换域名时需要检查：

- GitHub Pages 设置中的 Custom domain
- DNS 的 A / ALIAS / CNAME 记录，具体按 GitHub Pages 给出的域名类型执行
- HTTPS 证书状态和 Enforce HTTPS
- 根目录 `CNAME` 是否仍与目标域名一致

### 遗留 COS 部署

[blog.sh](blog.sh) 中的 `deploy` 命令是旧的 COS 上传入口，依赖本机 `cos-upload` 命令、CDN 凭证和网络服务。它不是当前主流程，日常发布应使用 GitHub Pages Actions。

## 质量检查

项目没有通用自动化测试套件；GitHub Actions 会在部署前执行生产构建、生成物检查和依赖审计。本地可按变更范围执行：

```bash
node --check static/js/blog.js
node --check static/js/search.js
npm ci
JEKYLL_ENV=production bundle exec jekyll build --destination _site
npm run popular -- _site
npm run minify -- _site
npm run check -- _site
npm audit --audit-level=low --registry=https://registry.npmjs.org
git diff --check
```

`npm run check` 会检查生成 HTML 的基础 SEO、内部链接、RSS/search/sitemap XML 语法，以及压缩后 Service Worker 的 JavaScript 语法。

涉及页面布局或交互时，至少检查：

- 手机：375px 和 412px 宽度
- 平板：820px 宽度
- 桌面：1200px 和 1330px 以上宽度
- 搜索、主题切换、目录展开、代码复制、二维码、回到顶部
- 页面不能出现意外横向拖动
- 分类标题截断、摘要两行限制和行距

2026-08-18 使用 Lighthouse 13.4.1 测试线上文章：

| 客户端 | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| 手机 | 74 | 98 | 100 | 100 |
| 平板（820×1180 / DPR 2） | 86 | 98 | 100 | 100 |
| 电脑 | 92 | 98 | 100 | 100 |

手机性能主要受 MathJax `tex-svg-full.js` 约 640 KiB 传输体积影响，Mermaid 替换图表时也可能带来布局变化。分数会受网络和 CDN 波动影响，仅作为当时快照。

## 头像与图标

| 文件 | 用途 |
|---|---|
| `static/img/logo.webp` | 页头头像、社交分享图、Apple 触摸图标、PWA 预缓存 |
| `static/img/favicon.ico` | 浏览器标签页图标 |
| `static/img/icon-192.png` / `static/img/icon-512.png` | PWA 图标 |

替换同名文件即可更新图标。根目录下的 `favicon.ico` 当前未被站点引用。

## 许可证

本项目采用 [Apache License 2.0](LICENSE) 授权。
