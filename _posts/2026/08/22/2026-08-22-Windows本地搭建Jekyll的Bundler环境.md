---
layout: mypost
title: Windows 本地搭建 Jekyll 的 Bundler 环境
categories: [ jekyll, windows, Deployment ]
description: 从安装 Ruby、MSYS2 和 Bundler，到本地启动这个 Jekyll 博客的完整步骤与常见报错排查。
---

这篇笔记记录在一台全新的 Windows 机器上搭建本博客本地运行环境的过程。目标很明确：进入项目目录后，能够用 Bundler 启动
Jekyll，并通过 `http://127.0.0.1:4000/` 访问站点。

最终环境如下：

| 组件 | 版本 | 位置 |
|---|---:|---|
| Ruby | 3.3.12 | `C:\Ruby33-x64` |
| Bundler | 2.5.22 | Ruby 自带 |
| MSYS2 | 2025-12-13 | `C:\msys64` |
| 项目依赖 | 37 个 gems | `vendor/bundle` |

### 一、为什么不能只装一个 Ruby

仓库的 `Gemfile` 有两个关键约束：

```ruby
ruby '>= 3.3.0', '< 3.4'

gem 'jekyll', '4.4.1'
gem 'fastimage', '2.3.1'
```

也就是说，Ruby 必须选 `3.3.x`，不能顺手装成 3.4。这个博客的 `Gemfile.lock` 也已经锁定了依赖版本，本地安装时应该让
Bundler 按锁文件还原，而不是各自解析一套新版本。

Windows 上还有一个额外问题：`bigdecimal`、`eventmachine`、`http_parser.rb` 这类依赖包含原生扩展。只安装 Ruby
运行时，缺少编译工具链时，`bundle install` 会在安装原生扩展阶段失败，并提示：

```text
MSYS2 could not be found. Please run 'ridk install'
```

所以完整环境需要三部分：

1. Ruby 3.3
2. MSYS2/MinGW 编译工具链
3. Bundler 和项目本地依赖

### 二、安装 Ruby 3.3

用 `winget` 安装 RubyInstaller 提供的 Ruby 3.3：

```powershell
winget install --id RubyInstallerTeam.Ruby.3.3 --exact --silent
```

安装完成后，重新打开一个 PowerShell，确认版本：

```powershell
ruby -v
gem -v
bundle -v
```

正常输出应类似：

```text
ruby 3.3.12 ...
3.5.22
Bundler version 2.5.22
```

如果是在安装前已经打开的旧终端里执行，进程还没有拿到新的系统 `PATH`，会找不到 `ruby` 或 `bundle`。重新打开终端最省事；
临时处理也可以执行：

```powershell
$env:Path = "C:\Ruby33-x64\bin;$env:Path"
```

### 三、安装 MSYS2 编译工具链

执行：

```powershell
ridk install
```

出现组件选择提示时，直接回车接受默认的 `[1,3]`：

```text
1 - MSYS2 base installation
3 - MSYS2 and MINGW development toolchain
```

安装完成后检查：

```powershell
ridk version
ridk exec gcc --version
ridk exec make --version
```

能看到 Ruby 路径、MSYS2 路径、`gcc` 和 `make` 版本，就说明编译环境可用。

我这次遇到的问题是 `ridk install` 默认从 `repo.msys2.org` 下载 MSYS2，速度非常慢。可以把下载源换成一个可用的
MSYS2 镜像，例如清华镜像的安装包目录：

```text
https://mirrors.tuna.tsinghua.edu.cn/msys2/distrib/
```

下载对应架构的安装包后，也可以静默安装到默认目录：

```powershell
$installer = "$env:TEMP\msys2-x86_64-20251213.exe"
& $installer install --root C:\msys64 --accept-messages --accept-licenses --confirm-command
```

再补齐 Ruby 3.3 对应的 UCRT64 编译包：

```powershell
C:\msys64\usr\bin\pacman.exe -Sy --needed --noconfirm make mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-pkgconf
```

最后执行 `ridk version`，只要它能识别 `C:\msys64`，RubyInstaller 和 MSYS2 就已经接上了。

### 四、把依赖装进项目本地

进入博客仓库：

```powershell
cd D:\springvortex.github.io
```

先把 Bundler 的安装路径配置成项目本地：

```powershell
bundle config set --local path vendor/bundle
```

这会生成 `.bundle/config`。项目 `.gitignore` 已经忽略 `.bundle/` 和 `vendor/`，不会把几十 MB 的依赖提交进仓库。

普通依赖可以直接安装：

```powershell
bundle install
```

如果这次安装涉及原生扩展，或者后面新增了需要编译的 gem，建议在 Windows 上固定使用：

```powershell
ridk exec bundle install
```

`ridk exec` 的作用是在 MSYS2 环境里执行命令，保证 RubyGems 能找到编译器和 make。

安装完成后做一次确认：

```powershell
bundle check
bundle exec jekyll -v
```

输出包含下面两句话就说明依赖已经完整：

```text
The Gemfile's dependencies are satisfied
jekyll 4.4.1
```

### 五、构建与启动

先跑一次生产构建：

```powershell
bundle exec jekyll build
```

Jekyll 输出 `done in ...` 且没有报错，说明 Liquid、插件、文章和页面都能正常生成。

日常开发启动：

```powershell
bundle exec jekyll serve --watch
```

默认地址是：

```text
http://127.0.0.1:4000/
```

需要让局域网其他设备访问，或者想固定端口：

```powershell
bundle exec jekyll serve --watch --host=0.0.0.0 --port=8080
```

停止服务时，在运行 Jekyll 的终端里按 `Ctrl + C`。

仓库里的 `blog.sh` 也封装了两个常用命令，适合在 Git Bash 里执行：

```bash
./blog.sh run      # 4000 端口启动
./blog.sh run 8080 # 指定 8080 端口
./blog.sh build    # 构建到 dist 并压缩 JS/CSS
```

### 六、启动后怎么验证

不要只看终端里出现 `Server running`，再请求几个关键页面更稳：

```powershell
Invoke-WebRequest http://127.0.0.1:4000/
Invoke-WebRequest http://127.0.0.1:4000/pages/categories.html
Invoke-WebRequest http://127.0.0.1:4000/pages/links.html
```

三个请求都返回 `StatusCode: 200`，说明首页、分类页和书签页都能被本地服务正常渲染。

也可以检查生成产物：

```powershell
Get-Item _site\index.html
Get-Item _site\pages\categories.html
Get-Item _site\pages\links.html
```

### 七、常见问题

#### 1. `bundle` 不是内部或外部命令

多半是终端是在安装 Ruby 前打开的。重新打开 PowerShell；如果仍不行，确认下面路径存在：

```text
C:\Ruby33-x64\bin
```

再检查用户 `PATH` 中是否包含它。

#### 2. `MSYS2 could not be found`

说明只装了 Ruby 运行时，没有装 MSYS2，或 MSYS2 不在 `C:\msys64` 这类默认位置。执行：

```powershell
ridk install
```

完成后再用 `ridk version` 检查。

#### 3. 原生扩展编译失败

先确认编译器：

```powershell
ridk exec gcc --version
ridk exec make --version
```

如果这两个命令不正常，重新执行 `ridk install`，确认选择了 MSYS2 和 MINGW development toolchain。

#### 4. 端口被占用

`4000` 端口被占用时，Jekyll 启动会报地址已被监听。直接换端口：

```powershell
bundle exec jekyll serve --watch --port=4001
```

或者先查占用进程：

```powershell
Get-NetTCPConnection -LocalPort 4000
```

#### 5. 依赖被装到全局

如果之前忘记配置 `path`，gems 会进入 Ruby 全局目录。项目内执行下面命令可以改回本地安装：

```powershell
bundle config set --local path vendor/bundle
bundle install
```

### 八、日常只需要记住两条

依赖没有变化时，日常启动只需要：

```powershell
cd D:\springvortex.github.io
bundle exec jekyll serve --watch
```

依赖变化时，先执行：

```powershell
ridk exec bundle install
```

环境搭好之后，Windows 上跑 Jekyll 并不复杂；真正容易浪费时间的是 Ruby 版本、MSYS2 编译链和镜像源这三件事。
