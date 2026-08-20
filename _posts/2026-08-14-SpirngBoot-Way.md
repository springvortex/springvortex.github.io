---
layout: mypost
title: Spring MVC 配置方式与开发模式
categories: [ SpringBoot, Logback ]
date: 2026-08-13
---

### SpringMVC 配置与开发模式总结

#### 三种配置方式

| 配置类型 | 实现代码                                                                | 注解要求                 | 最终效果                                          |
|----------|-------------------------------------------------------------------------|--------------------------|---------------------------------------------------|
| 全自动   | 直接编写控制器逻辑                                                      | 无额外特殊要求           | 全部使用自动配置默认效果                          |
| 手自一体 | `@Configuration` + 配置 `WebMvcConfigurer` + 配置 `WebMvcRegistrations` | 不要标注 `@EnableWebMvc` | 自动配置效果，手动设置部分功能，自定义MVC底层组件 |
| 全手动   | `@Configuration` + 配置 `WebMvcConfigurer`                              | 标注 `@EnableWebMvc`     | 禁用自动配置效果，全手动设置                      |

#### 两种开发模式

1. 前后分离模式：`@RestController` 响应JSON数据
2. 前后不分离模式：`@Controller` + Thymeleaf模板引擎

