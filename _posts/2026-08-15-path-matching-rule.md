---
layout: mypost
title: 路径匹配规则
categories: [ SpringBoot ]
---

以前只支持 AntPathMatcher 策略, 现在提供了 PathPatternParser策略。并且可以让我们指定到底使用那种策略。

### Ant风格路径用法

Ant 风格的路径模式语法具有以下规则：

- `*`: 表示任意数量的字符。
- `?`: 表示任意一个字符。
- `**`: 表示任意数量的目录。
- `{}`: 表示一个命名的模式占位符。
- `[]`: 表示字符集合，例如`[a-z]`表示小写字母。

例如：

- `*.html` 匹配任意名称，扩展名为`.html`的文件。
- `/folder1/*/*.java` 匹配在folder1目录下的任意两级目录下的java文件。
- `/folder2/**/*.jsp` 匹配在folder2目录下任意目录深度的jsp文件。
- `/{type}/{id}.html` 匹配任意文件名为`{id}.html`，在任意命名的`{type}`目录下的文件。

注意：Ant 风格的路径模式语法中的特殊字符需要转义，如：

- 要匹配文件路径中的星号，则需要转义为`\*`。
- 要匹配文件路径中的问号，则需要转义为`\?`。

```java
// Web接口测试控制器
@GetMapping("/a/b/?/{p1:[a-f]+}/**")
public String hello(HttpServletRequest request, @PathVariable("p1") String path) {
    log.info("路径变量p1: {}", path);
    String uri = request.getRequestURI();
    return uri;
}
// HttpServletRequest request 是 Servlet 官方提供的原生 HTTP 请求对象
// 第一个参数：把本次HTTP请求的完整原生对象直接注入进来
// 第二个参数：把路径变量p1的值注入进来，赋值给path
```
