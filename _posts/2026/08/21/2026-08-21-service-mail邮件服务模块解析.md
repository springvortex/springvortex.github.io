---
layout: mypost
title: service-mail 邮件服务模块解析
categories: [ Microservices, Mail, Spring Boot ]
---

`service-mail` 是独立邮件微服务，负责发送纯文本和 HTML 邮件，并把每次发送过程写入 `t_mail_log`。其他服务不需要自己配置
SMTP，也不需要知道发件账号；只要调用 `MailFeignApi` 或通过 Gateway 请求 `/api/v1/mail/send`，邮件服务统一处理。

这个模块最有价值的设计不是“能发邮件”，而是发送过程可追踪：先写入待发送记录，再执行 SMTP，最后更新成功或失败状态。SMTP
抖动时，调用方能拿到一条状态明确的记录，而不是只收到一个无法排查的异常。

### 基本信息

| 项       | 值                                   |
|----------|--------------------------------------|
| 服务名   | `service-mail`                       |
| 端口     | `9004`                               |
| API 前缀 | `/api/v1/mail`                       |
| 数据表   | `t_mail_log`                         |
| SMTP     | dev 使用 MailHog，prod 使用真实 SMTP |
| 服务发现 | Nacos Discovery                      |

### 包结构

```text
com.zjc.mail
├── MailApplication
├── config
│   ├── AuditMetaObjectHandler
│   ├── MybatisPlusConfig
│   └── OpenApiConfig
├── controller
│   └── MailController
├── converter
│   └── MailLogConverter
├── entity
│   └── MailLog
├── mapper
│   └── MailLogMapper
└── service
    ├── MailLogService
    ├── MailSendService
    └── impl
```

分层和 Provider 一致：Controller 处理 HTTP，Service 处理发送流程，Mapper 负责记录，MapStruct 负责 Entity 和 DTO 转换。

### 对外接口

Controller 只有一个接口：

```java

@PostMapping("/send")
public ApiResponse<MailLogDTO> send(@Valid @RequestBody MailSendDTO dto) {
    return ApiResponse.success(mailSendService.send(dto));
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/java/com/zjc/mail/controller/MailController.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/java/com/zjc/mail/controller/MailController.java)

请求示例：

```json
{
  "toEmails": "a@example.com,b@example.com",
  "ccEmails": "c@example.com",
  "bccEmails": "d@example.com",
  "subject": "测试邮件",
  "content": "<p>Hello Service Mail</p>",
  "isHtml": true
}
```

`toEmails`、`subject`、`content` 必填；抄送和密送可选。发件人来自环境配置里的 `spring.mail.username`，调用方不能指定，避免接口被拿来伪装任意发件人。

### 状态模型

邮件记录有三个状态：

| 状态 | 含义     |
|-----:|----------|
|    0 | 待发送   |
|    1 | 发送成功 |
|    2 | 发送失败 |

这个状态模型让接口语义变得稳定：HTTP 调用成功只表示邮件服务接到了请求并完成流程处理，实际 SMTP 结果要看返回的
`data.status`。

### 发送流程

`MailSendServiceImpl` 的主流程：

```java
String[] toArray = parseAndValidate(dto.getToEmails(), "收件人");
String[] ccArray = parseAndValidate(dto.getCcEmails(), "抄送人");
String[] bccArray = parseAndValidate(dto.getBccEmails(), "密送人");

MailLog mailLog = buildMailLog(dto);
mailLog.

setStatus(STATUS_PENDING);
mailLogService.

save(mailLog);

try{
        if(Boolean.TRUE.

equals(dto.getIsHtml())){

sendHtmlMail(dto, toArray, ccArray, bccArray);
    }else{

sendTextMail(dto, toArray, ccArray, bccArray);
    }
            mailLog.

setStatus(STATUS_SUCCESS);
}catch(
Exception e){
        mailLog.

setStatus(STATUS_FAILURE);
    mailLog.

setErrorMsg(e.getMessage());
        }

        mailLogService.

updateById(mailLog);
return mailLogConverter.

entityToDto(mailLog);
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/java/com/zjc/mail/service/impl/MailSendServiceImpl.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/java/com/zjc/mail/service/impl/MailSendServiceImpl.java)

流程拆开看：

1. 校验收件人、抄送人、密送人格式。
2. 写入一条 `status=0` 的待发送记录。
3. 根据 `isHtml` 选择发送方式。
4. 成功更新为 `status=1`。
5. 失败更新为 `status=2`，并保存 `errorMsg`。
6. 把实体转换为 DTO 返回。

### 邮箱校验

发送前先解析逗号分隔的邮箱字符串：

```java
private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
```

这不是完整 RFC 邮箱校验，但足够拦截常见错误：空格、缺少 `@`、缺少域名点号等。非法地址在发送前失败，不会写入待发送记录，也不会浪费
SMTP 调用。

如果业务要求更严，可以在 DTO 上继续叠加长度限制、域名白名单或邮箱可达性策略。

### 纯文本与 HTML

纯文本使用 `SimpleMailMessage`：

```java
SimpleMailMessage message = new SimpleMailMessage();
message.

setFrom(fromEmail);
message.

setTo(to);
message.

setSubject(dto.getSubject());
        message.

setText(dto.getContent());
```

HTML 使用 `MimeMessageHelper`：

```java
MimeMessage mimeMessage = mailSender.createMimeMessage();
MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true);
helper.

setFrom(fromEmail);
helper.

setTo(to);
helper.

setSubject(dto.getSubject());
        helper.

setText(dto.getContent(), true);
```

两条路径分开，避免把用户输入当 HTML 渲染。调用方必须显式传 `isHtml=true`，服务端才按 MIME HTML 处理。

### 邮件记录实体

`MailLog` 映射 `t_mail_log`，核心字段：

| 字段                        | 说明                     |
|-----------------------------|--------------------------|
| `mailId`                    | 雪花 ID                  |
| `fromEmail`                 | 发件人                   |
| `toEmails`                  | 收件人，多个逗号分隔     |
| `ccEmails` / `bccEmails`    | 抄送、密送               |
| `subject` / `content`       | 主题和正文               |
| `isHtml`                    | 是否 HTML                |
| `status`                    | 0 待发送，1 成功，2 失败 |
| `errorMsg`                  | 失败原因                 |
| `isDeleted`                 | 逻辑删除                 |
| `createTime` / `updateTime` | 审计时间                 |

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/java/com/zjc/mail/entity/MailLog.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/java/com/zjc/mail/entity/MailLog.java)

实体只在 Mail 模块内部使用，接口返回 `MailLogDTO`，避免把逻辑删除等数据库细节暴露给调用方。

### 配置边界

基础配置：

```yaml
spring:
  application:
    name: service-mail
  profiles:
    active: dev
    include:
      - api
      - jasypt
      - zipkin
      - nacos
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/resources/application.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/resources/application.yaml)

开发环境 SMTP 可以指向 MailHog：

```yaml
spring:
  mail:
    host: 127.0.0.1
    port: 1025
    username: dev@localhost
    password: ""
    default-encoding: UTF-8
```

生产环境使用真实 SMTP，密码通过 Jasypt 密文保存：

```yaml
spring:
  mail:
    host: your-smtp-host
    port: 465
    username: your-from-email
    password: ENC(your-encrypted-password)
    properties:
      mail:
        smtp:
          auth: true
          ssl:
            enable: true
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/resources/application-prod.yaml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-mail/src/main/resources/application-prod.yaml)

启动时注入 `JASYPT_ENCRYPTOR_PASSWORD`，密钥不写进 Git。

### MailHog 的价值

开发环境用 MailHog 假装 SMTP 服务器，好处很明显：

1. 不会把测试邮件发给真实用户。
2. 可以在 Web 页面查看邮件最终内容。
3. 不需要真实邮箱账号即可调试邮件链路。
4. 便于验证 HTML 渲染、主题编码和收发关系。

MailHog 只适合开发或内网测试。它没有生产级安全边界，不能暴露公网，更不能当生产邮件服务。

### Feign 调用方式

其他服务可以通过 common 里的共享契约调用：

```java

@FeignClient(value = "service-mail", contextId = "mailFeignApi")
public interface MailFeignApi {

    @PostMapping("/send")
    ApiResponse<MailLogDTO> send(@Valid @RequestBody MailSendDTO dto);
}
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/mail/MailFeignApi.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/service-common/src/main/java/com/zjc/common/api/mail/MailFeignApi.java)

契约仍然只写资源路径 `/send`，运行时会自动补 `/api/v1/mail` 前缀。

### 链路追踪

邮件服务引入 Actuator 和 Zipkin。一次邮件请求可以形成：

```text
Client -> Gateway -> service-mail
Consumer -> MailFeignApi -> service-mail
```

如果 SMTP 慢，Zipkin 能看到 Mail 服务内部耗时；如果 SMTP 失败，日志和 `t_mail_log.error_msg` 都能提供线索。

### 设计取舍

当前实现把 SMTP 异常吞掉并记录到数据库，调用方拿到的是携带状态的记录。这降低了调用方复杂度，适合通知类邮件。

如果希望“请求提交就一定要感知失败”，可以继续演进为队列模式：

1. 接口只受理请求并写入待发送记录。
2. 后台任务或消息消费者执行发送。
3. 失败进入重试队列。
4. 提供按 `mailId` 查询状态的接口。
5. 增加告警和死信处理。

当前单服务同步发送适合学习项目和小规模通知场景，结构简单，问题也容易定位。

### 常见问题

#### 返回成功但邮件没收到

先看 `data.status`。`status=2` 表示 SMTP 发送失败，`errorMsg` 是第一排查线索。

#### 开发环境收不到邮件

确认 MailHog 是否启动、端口是否是 `1025`，并到 `http://127.0.0.1:8025` 查看收件箱。

#### 生产 SMTP 认证失败

检查 host、port、username、密码密文和 Jasypt 密钥。465 通常走 SSL，587 通常走 STARTTLS，不要把两种配置混着写。

#### HTML 显示异常

确认请求里 `isHtml=true`，内容使用合法 HTML，并保留 `default-encoding: UTF-8`。

### 模块小结

`service-mail` 把外部资源访问收敛到一个服务里：SMTP 配置、发件人、发送记录、失败原因和链路追踪都由邮件模块自己负责。对调用方来说，邮件能力变成一个清晰的内部
API；对运维来说，所有发送行为都有一张表可以审计。
