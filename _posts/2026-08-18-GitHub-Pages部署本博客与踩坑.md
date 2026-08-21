---
layout: mypost
title: GitHub Pages 部署本博客与踩坑
categories: [ github, jekyll ]
---

这篇博客已经内置 GitHub Pages 自动部署工作流：只要代码推送到 `main` 分支，Actions 会自动完成 Jekyll 构建、JS/CSS
压缩和站点发布。下面按实际部署顺序走一遍，最后是我踩过或者最容易踩的坑。

### 一、准备仓库

先把博客源码推送到 GitHub 仓库：

```bash
git init
git add .
git commit -m "init blog"
git branch -M main
git remote add origin git@github.com:<用户名>/<仓库名>.git
git push -u origin main
```

注意：如果想按本文的根路径方式部署，新建仓库名必须使用：

```text
<username>.github.io
```

例如 GitHub 用户名是 `zjc`，仓库名就应该是 `zjc.github.io`。

原因是 GitHub Pages 会把这种命名的用户仓库识别为个人主站点，最终访问地址是：

```text
https://<username>.github.io/
```

如果仓库名叫 `blog`，它会变成项目站点，访问地址是：

```text
https://<username>.github.io/blog/
```

这时静态资源都会多出 `/blog/` 这个前缀，博客的 `baseurl` 也必须配置成 `/blog`，否则样式、搜索和 Service Worker 都可能 404。

如果仓库是从别人那里 Fork 来的，先确认：

1. 默认分支是不是 `main`。
2. 仓库的 `Actions` 页面有没有被禁用，需要手动点击 `Enable workflows`。
3. `.github/workflows/pages.yml`、`Gemfile`、`package.json`、`package-lock.json` 是否都存在。

> 本博客不是纯默认 Jekyll 站点，它包含 `_plugins/md5_permalink.rb` 自定义插件和 Node 压缩脚本，所以部署必须走仓库里的
> GitHub Actions 工作流。

### 二、开启 GitHub Pages

打开 GitHub 仓库：

```text
Settings -> Pages -> Build and deployment -> Source
```

选择：

```text
GitHub Actions
```

不要选择 `Deploy from a branch`。这个博客需要在构建阶段执行自定义 Ruby 插件和 esbuild 压缩，直接从分支部署静态文件会绕过这些步骤。

设置完成后，`pages.yml` 工作流才会被 GitHub Pages 正确接收产物。

### 三、理解自动部署流程

核心工作流在：

```text
.github/workflows/pages.yml
```

关键步骤如下：

```yaml
steps:
- name: Setup Ruby
  uses: ruby/setup-ruby@v1
  with:
    ruby-version: "2.7"

- name: Setup Node
  uses: actions/setup-node@v4
  with:
    node-version: "22"
    cache: npm

- name: Build Jekyll site
  run: |
    bundle install
    JEKYLL_ENV=production bundle exec jekyll build --destination _site
    npm ci
    npm run minify -- _site
```

它的执行顺序是：

1. 检出 `main` 分支代码。
2. 安装 Ruby 2.7 和 Bundler 依赖。
3. 安装 Node 22 和 npm 依赖。
4. 使用 Jekyll 3.8.5 构建站点到 `_site`。
5. 使用 esbuild 压缩自定义 JS、CSS 和 `service-worker.js`。
6. 上传 `_site` 作为 Pages Artifact。
7. 调用 `actions/deploy-pages@v4` 发布站点。

之后每次推送 `main`，都会自动触发部署；也可以在：

```text
Actions -> Build and deploy Pages -> Run workflow
```

手动触发一次。

### 四、配置自定义域名

默认地址是：

```text
https://<用户名>.github.io
```

或者：

```text
https://<用户名>.github.io/<仓库名>/
```

如果要使用自己的域名，例如 `uhaiin.com`，在仓库里配置：

```text
Settings -> Pages -> Custom domain
```

填写域名后，GitHub 会提示需要添加的 DNS 记录。以根域名绑定 Pages 为例，通常需要给域名服务商配置 GitHub Pages 的 `A` 记录；如果绑定
`www` 或其他子域名，则配置 `CNAME` 记录到：

```text
<用户名>.github.io
```

DNS 生效后，回到 `Settings -> Pages`：

1. 确认 Custom domain 显示绿色可用状态。
2. 勾选 `Enforce HTTPS`。
3. 等证书签发完成，通常需要几分钟到几十分钟。

> 具体 DNS 记录值以 GitHub Pages 设置页显示的内容为准，GitHub 官方记录有可能调整，不要盲目抄旧文章里的 IP。

### 五、修改站点域名配置

这个博客有两个和地址有关的配置：

```yaml
domainUrl: ''
baseurl: ''
```

如果绑定根域名，例如 `uhaiin.com`，建议这样配置：

```yaml
domainUrl: 'https://uhaiin.com'
baseurl: ''
```

`domainUrl` 主要用于 RSS 和 sitemap 生成完整链接；`baseurl` 会影响页面资源、菜单、Service Worker 和文章资源路径。

如果部署到项目路径，例如：

```text
https://<用户名>.github.io/blog/
```

则必须配置：

```yaml
baseurl: '/blog'
```

否则 CSS、JS、搜索索引和 Service Worker 都可能按根路径请求，出现样式丢失或功能异常。

### 六、部署完成后检查

打开站点后，建议按下面顺序检查：

1. 首页能正常打开，样式没有丢。
2. 点一篇文章，确认文章 URL 是 32 位 MD5 路径。
3. 文章里的图片能显示，资源路径应该类似 `/posts/年/月/日/文件名`。
4. 搜索页输入关键词，确认搜索索引可以请求。
5. 代码块语言高亮和复制按钮正常。
6. 文章二维码可以生成，扫码打开的是当前部署地址。
7. 明暗主题切换后刷新页面，偏好还能保留。
8. 浏览器控制台没有 CSS 404、JS 404 或 Service Worker 注册失败。

如果某些页面还是旧内容，先强制刷新；仍不更新时，再检查 Service Worker 缓存。

### 七、踩坑点

#### 1. Pages Source 选错

症状：工作流执行成功，但 Pages 一直是旧页面，或者提示没有部署分支。

原因是 `Source` 选择了 `Deploy from a branch`。这个博客必须选择：

```text
GitHub Actions
```

#### 2. 推送分支不是 main

工作流触发条件写的是：

```yaml
on:
  push:
    branches:
      - main
```

如果代码在 `master` 或其他分支，Actions 不会自动部署。要么把默认分支改成工作流里的分支，要么修改 `branches` 配置。

#### 3. 工作流权限被收紧

工作流需要这些权限：

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

如果组织或仓库策略把 `pages: write`、`id-token: write` 禁掉，部署会在上传或发布阶段失败。需要在仓库或组织层面允许 Pages 写入和
OIDC 认证。

#### 4. 使用默认 Jekyll 构建，MD5 链接失效

这个博客的文章 URL 由 `_plugins/md5_permalink.rb` 生成。如果绕过仓库里的工作流，让 GitHub 使用默认 Jekyll
构建流程，自定义插件不会执行，文章链接就会退回日期路径，首页、RSS、sitemap 和二维码对应关系都会乱掉。

#### 5. Windows 换行符影响 MD5

文章链接是根据 Markdown 源文件内容计算的。插件已经把 CRLF 统一成 LF 后再计算 MD5，所以 Windows 本地和 Linux Actions
的构建结果保持一致。

但要注意：不要手工修改 `_site` 产物，也不要把 `_site` 提交回仓库。部署产物每次都会重新生成，改源文件才是正确入口。

#### 6. 改一个错别字，文章链接就变了

这是本博客当前的设计，不算是 bug：

- 文章源文件内容变化，MD5 就变化。
- 文章分享链接会变化。
- 文章二维码也会指向新链接。
- 旧文章路径不会被自动重定向。

所以发布前尽量确认内容已经稳定；发布后再改错别字，就要接受旧链接失效，或者自己维护一套固定永久链接。

#### 7. 项目路径部署忘记 baseurl

如果站点最终运行在：

```text
https://<用户名>.github.io/<仓库名>/
```

而 `baseurl` 还是空字符串，页面会去根路径找静态资源，典型表现是：

- 页面没有样式。
- 控制台大量 CSS 404。
- 搜索接口 404。
- Service Worker 注册失败。

项目路径部署时，`baseurl` 必须等于仓库路径。

#### 8. 自定义域名 DNS 未生效

DNS 配置后可能因为缓存没有立即生效。排查顺序：

1. 用 `nslookup` 或在线 DNS 查询工具确认记录已经扩散。
2. 回到 GitHub Pages 设置页看 Custom domain 状态。
3. 等待 HTTPS 证书签发。
4. 清理浏览器缓存或换无痕窗口访问。

不要在 DNS 未生效时反复删除又绑定域名，反而可能让证书状态更混乱。

#### 9. Service Worker 只适合 HTTPS

Service Worker 要求站点运行在 HTTPS 或 localhost 下。GitHub Pages 默认支持 HTTPS，绑定自定义域名后也要开启 `Enforce HTTPS`
，否则二维码、离线缓存等依赖页面环境的功能可能不稳定。

#### 10. 忘记提交 package-lock.json

Actions 里使用的是：

```bash
npm ci
```

这个命令依赖 `package-lock.json`。如果锁文件没有提交，CI 会直接失败。压缩依赖版本固定在 `package.json` 和锁文件里，两个文件要一起提交。

### 八、出问题先看 Actions 日志

打开：

```text
Actions -> Build and deploy Pages
```

点击失败的那次运行，再看具体失败步骤：

- `Build Jekyll site` 失败：多半是 Ruby 依赖、Markdown、Liquid 或插件问题。
- `npm ci` 失败：检查 `package.json` 和 `package-lock.json` 是否同步提交。
- `Upload site` 或 `Deploy Pages` 失败：优先检查 Pages Source、分支和权限。
- 部署成功但页面异常：打开浏览器开发者工具，看 Network 和 Console 里的 404。

只要 Actions 日志里 `Build and deploy Pages` 全绿，GitHub Pages 侧基本已经完成发布；剩下的问题通常在域名、路径配置或浏览器缓存。
