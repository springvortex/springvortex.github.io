---
layout: mypost
title: Thymeleaf整合
categories: [ SpringBoot ]
---

### 一.模版引擎

· 由于SpringBoot使用了嵌入式Servlet容器，所以JSP默认不能使用  
· 如果需要服务端页面渲染，优先使用模板引擎，如Thymeleaf

![img.png](img.webp)

### 二.Thymeleaf整合

1.导包

```xml

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-thymeleaf</artifactId>
</dependency>

```

2.配置（自动配置）  
· 默认在resource/templates 后缀为 .html  
例：`resource/templates/页面名.html`

3.创建Controller

```java

@Controller

public class ThymeleafController {
    @GetMapping("/hello")
    public String hello(@RequestParam("name") String name, Model model) {
        model.addAttribute("message", name);
        return "页面名";
    }
}
```

· @RequestParam注解：从http中接收参数  
· Model接口：用于在Controller和页面之间传递数据

1. **单个存数据**：`model.addAttribute("键名", 数据值)`
2. **批量存Map数据**：`model.addAllAttributes (map集合)

4.模版页面取值

```html
<span th:text="${message}"></span>
```

完整页面：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Title</title>
</head>
<body>
<span th:text="${message}"></span>
</body>
</html>
```

