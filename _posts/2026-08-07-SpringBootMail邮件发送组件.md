---
layout: mypost
title: Spring Boot Mail 邮件发送组件
categories: [ Components, Mail, Spring Boot ]
---

Spring Boot Mail 提供的是 SMTP 发送抽象。项目把它封装在独立的 `service-mail` 中，让邮件成为微服务能力，而不是散落在各业务服务里的工具方法。

### 一、服务封装

```java
@Resource
private JavaMailSender mailSender;
```
> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/java/com/zjc/mail/service/impl/MailSendServiceImpl.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/java/com/zjc/mail/service/impl/MailSendServiceImpl.java)

业务代码不直接处理 SMTP 协议，而是使用 `JavaMailSender` 发送纯文本或 HTML 邮件。SMTP 地址、端口、认证和编码由环境 Profile 管理。

### 二、发送不只是调用 send

邮件服务的流程是：

1. 校验收件人、抄送、密送格式。
2. 写入一条待发送记录。
3. 发送纯文本或 HTML 邮件。
4. 根据结果更新成功或失败状态。

这样失败可追踪，也能统计发送结果。

### 三、环境隔离

开发环境使用 MailHog，不向真实邮箱发信；生产环境连接真实 SMTP 服务，认证信息通过加密配置和环境注入管理。这避免了测试邮件骚扰真实用户。

### 四、避坑点

1. SMTP 服务商通常有频率限制。
2. 邮件发送失败不应让整个业务事务失控，要明确边界。
3. HTML 邮件要注意样式兼容和内容安全。
4. 发件人、回复地址、认证账号可能不是同一个概念。

### 五、经验总结

Spring Boot Mail 解决协议细节，独立 Mail 服务解决系统边界。两者叠加后，邮件才从“发出去就行”变成可观测、可审计的基础能力。
