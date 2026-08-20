---
layout: mypost
title: 内容协商
categories: [SpringBoot ]
---

### 基于请求头内容协商:

```text
# 1.1.1. 客户端向服务端发送请求，携带HTTP标准的Accept请求头。
# 1.1.1.1. Accept: `application/json`、`text/xml`、`text/yaml`
# 1.1.1.2. 服务端根据客户端请求头期望的数据类型进行动态返回
```

### 基于请求参数内容协商:

```text
# 发送请求 `GET /projects/spring-boot?format=json`
# 匹配到 `@GetMapping("/projects/spring-boot")`
# 发送请求 `GET /projects/spring-boot?format=xml`，优先返回xml类型数据
```

#### 1. 引入支持写xml内容的依赖

```xml
<dependency>
    <groupId>com.fasterxml.jackson.datatype</groupId>
    <artifactId>jackson-datatype-xml</artifactId>
</dependency>
```

#### 2.标注注解

```java
@JacksonXmlRootElement // 可以写出xml文档
@Data
public class Person {
    private String name;
    private int age;
}
```

#### 3.开启基于请求参数的内容协商

```properties
# 开启基于请求参数的内容协商功能。默认参数名: format
spring.mvc.contentnegotiation.favor-parameter=true
# 指定内容协商时使用的参数名。默认是 format
spring.mvc.contentnegotiation.parameter-name=type
```
