---
layout: mypost
title: 静态资源规划
categories: [ SpringBoot, StaticResource ]
date: 2026-08-13
---

### 源码分析

#### SpringBoot3 静态资源映射三大默认规则

---

#### 规则一：WebJars 前端依赖映射规则

访问 `/webjars/**` 路径，就去 `classpath:/META-INF/resources/webjars/` 下查找资源

- a. maven 导入前端依赖
- b. 浏览器直接通过路径访问对应静态资源

---

#### 规则二：全局通用静态资源映射规则

访问 `/**` 路径，就去静态资源默认的四个位置按优先级查找资源

- a. `classpath:/META-INF/resources/`
- b. `classpath:/resources/`
- c. `classpath:/static/`
- d. `classpath:/public/`

---

#### 规则三：静态资源默认缓存规则设置

所有缓存配置直接通过配置文件 `spring.web.resources.cache` 统一调整

- a. `cachePeriod`：缓存周期，单位为秒，设置多久之内不用向服务器请求更新资源，SpringBoot默认未设置
- b. `cacheControl`：HTTP
  标准缓存控制，完整规则参考 [HTTP缓存文档](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Caching)
- c. `useLastModified`：是否启用最后修改时间校验，配合HTTP Cache规则使用

> 缓存作用说明：浏览器访问过静态资源后，如果服务器上该资源没有发生修改，下次访问时浏览器可以直接使用本地缓存的资源，无需向服务器重复发起请求，大幅提升页面加载速度。

```java
// 缓存规则底层自动配置源码
registration.setCachePeriod(getSeconds(this.resourceProperties.getCache().getPeriod()));
registration.setCacheControl(this.resourceProperties.getCache().getCacheControl().toHttpCacheControl());
registration.setUseLastModified(this.resourceProperties.getCache().isUseLastModified());
```

#### 欢迎页访问路径

```text
// 默认在静态资源中添加
index.html
```

#### Favicon (网站图标)路径

```text
// 默认在静态资源中添加
favicon.ico
```

