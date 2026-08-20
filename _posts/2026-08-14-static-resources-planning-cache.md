---
layout: mypost
title: 静态资源规划-缓存
categories: [ SpringBoot, StaticResource ]
date: 2026-08-14
---

#### 开启静态资源映射规则

```properties
# 默认true
spring.web.resources.add-mappings=true
```

#### 设置缓存

**例如**

```properties
# 设置缓存时间，单位为秒
spring.web.resources.cache.cachecontrol.max-age=3600
```

#### 判断服务器和浏览器资源是否变化

```properties
# 默认true，如果 last-modified 时间相同，返回 304
spring.web.resources.cache.use-last-modified=true
```
