---
layout: mypost
title: MP-Generator 代码生成模块解析
categories: [ MyBatis-Plus, Generator, Engineering ]
---

`MP-Generator` 是这个项目里的 MyBatis-Plus 代码生成工具模块。它连接 MySQL，根据表结构生成
Entity、Mapper、Service、ServiceImpl 和 Mapper XML。它不是一个运行时微服务，不注册 Nacos，不对外提供接口，也没有被父 POM 聚合构建。

这个模块的定位很干净：生成代码的独立工具，用完把生成结果迁移到业务模块，再由业务模块继续演进。

### 模块定位

| 项         | 说明                                             |
|------------|--------------------------------------------------|
| 目录       | `MP-Generator`                                   |
| 类型       | 独立 Maven 工程                                  |
| 父工程聚合 | 否                                               |
| 运行方式   | 本地运行 `main`                                  |
| 输入       | MySQL 连接、表名、表前缀、父包名                 |
| 输出       | Entity、Mapper、Service、ServiceImpl、Mapper XML |

父工程 `pom.xml` 的 modules 只包含：

```text
service-common
service-provider
service-consumer
service-gateway
service-mail
```

所以在项目根目录执行 `mvn package` 不会构建 `MP-Generator`。这样生成工具不会影响业务构建速度，也不会把生成器依赖带进服务包。

### 目录结构

```text
MP-Generator/
├── pom.xml
├── README.md
└── src/main/
    ├── java/com/zjc/CodeGenerator.java
    └── resources/
        ├── generator.properties.template
        └── generator.properties
```

仓库里只提交模板：

```text
generator.properties.template
```

本地实际配置是：

```text
generator.properties
```

模板负责说明有哪些配置项；本地文件负责保存真实数据库地址和密码，并且不进 Git。

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/MP-Generator/README.md](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/MP-Generator/README.md)

### 配置模板

首次使用先复制模板。

macOS / Linux：

```bash
cp src/main/resources/generator.properties.template \
   src/main/resources/generator.properties
```

Windows PowerShell：

```powershell
Copy-Item src/main/resources/generator.properties.template `
  src/main/resources/generator.properties
```

模板核心配置：

```properties
db.url=jdbc:mysql://127.0.0.1:3306/spring_cloud_alibaba?useUnicode=true&characterEncoding=utf-8&zeroDateTimeBehavior=convertToNull&allowMultiQueries=true
db.username=username
db.password=password
package.parent=com.zjc.provider
generator.tables=t_user,t_order,t_order_detail,t_goods
generator.tablePrefix=t_,sys_
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/MP-Generator/src/main/resources/generator.properties.template](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/MP-Generator/src/main/resources/generator.properties.template)

| 配置                    | 作用                   |
|-------------------------|------------------------|
| `db.url`                | 数据库 JDBC 地址       |
| `db.username`           | 数据库用户             |
| `db.password`           | 数据库密码             |
| `package.parent`        | 生成代码父包           |
| `generator.tables`      | 要生成的表             |
| `generator.tablePrefix` | 生成类名时去掉的表前缀 |

换库、换表、换包名都改配置文件，不改 Java 代码。

### 读取配置时为什么用 UTF-8

Java `Properties.load(InputStream)` 默认按 ISO-8859-1 处理，中文容易乱码。这个项目显式包装了 Reader：

```java
try(InputStream is = CodeGenerator.class.getResourceAsStream("/generator.properties")){
        props.

load(new InputStreamReader(
        Objects.requireNonNull(is),

StandardCharsets.UTF_8));
        }
```

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/MP-Generator/src/main/java/com/zjc/CodeGenerator.java](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/MP-Generator/src/main/java/com/zjc/CodeGenerator.java)

前提是 `generator.properties` 本身也要以 UTF-8 保存。

### 输出目录怎么确定

工具不是直接取当前工作目录，而是从 `CodeGenerator.class` 的位置反推：

```java
File moduleRoot = new File(CodeGenerator.class.getProtectionDomain()
        .getCodeSource().getLocation().toURI())
        .getParentFile()
        .getParentFile();

String outputDir = moduleRoot.toPath()
        .resolve("src/main/java")
        .toString();
```

编译产物通常在：

```text
MP-Generator/target/classes
```

回退两级就是模块根目录，再拼 `src/main/java`。这样无论从 IDEA、模块目录还是父工程目录运行，输出目录都稳定。

### 生成策略

全局配置：

```java
.globalConfig(builder ->builder.

author("jiancai.zhong")
        .

commentDate("yyyy-MM-dd")
        .

enableSpringdoc()
        .

outputDir(outputDir)
        .

disableOpenDir())
```

包配置：

```java
.packageConfig(builder ->builder.

parent(parentPackage)
        .

entity("entity")
        .

mapper("mapper")
        .

service("service")
        .

serviceImpl("service.impl")
        .

xml("mapper"))
```

实体策略：

```java
.entityBuilder()
.

enableLombok(new ClassAnnotationAttributes("@Data", "lombok.Data"))
        .

enableTableFieldAnnotation()
.

enableSerialAnnotation()
```

这里选择给字段显式加 `@TableField`。虽然数据库下划线字段和 Java 驼峰属性可以自动映射，但显式注解能让实体和表结构的对应关系更直观，也方便后期处理关键字段。

Controller 策略：

```java
.controllerBuilder()
.

disable()
```

也就是说，生成器只生成数据访问和 Service 骨架，不生成 REST Controller。Controller 与业务契约相关，需要开发者根据
DTO、参数校验、权限和响应结构手写。

### 生成内容

每张表会生成：

```text
entity/User.java
mapper/UserMapper.java
service/UserService.java
service/impl/UserServiceImpl.java
resources/mapper/UserMapper.xml
```

例如表 `t_user`，配置前缀 `t_` 后生成类名 `User`；表 `t_order_detail` 生成 `OrderDetail`。

Mapper XML 包含 `BaseResultMap` 和 `BaseColumnList`。当前业务大量使用 MyBatis-Plus 通用方法，XML 主要作为生成的标准骨架保留；以后复杂
SQL 可以直接写在对应 XML 中。

### 运行方式

IDEA：

1. 打开 `CodeGenerator.java`。
2. 确认模块依赖已导入。
3. 右键运行 `main`。

命令行：

```bash
cd MP-Generator
mvn compile
mvn org.codehaus.mojo:exec-maven-plugin:3.1.0:java \
  -Dexec.mainClass="com.zjc.CodeGenerator"
```

运行结束输出：

```text
代码生成完毕！
```

### 生成后怎么迁移

生成结果不是留在工具模块里长期编译。推荐流程：

1. 在 `generator.properties` 里配置目标父包，例如 `com.zjc.provider`。
2. 运行生成器。
3. 检查 Entity 字段、表名、主键和逻辑删除字段。
4. 把生成的包复制到对应业务模块。
5. 检查业务模块的 Mapper 扫描路径和 `mapper-locations`。
6. 编译业务模块。
7. 手写或调整 Controller、DTO 和 Converter。

生成器模块只包含生成器运行所需依赖，不包含 Spring Boot Web、MyBatis-Plus Spring Boot Starter、数据库连接池等业务运行依赖。所以生成出来的
Service 代码在 `MP-Generator` 里编译报错是正常现象，迁到业务模块后才是正确位置。

### 依赖设计

| 依赖                          | 用途               |
|-------------------------------|--------------------|
| `mybatis-plus-generator`      | 代码生成核心       |
| `mysql-connector-j`           | 读取 MySQL 表结构  |
| `freemarker`                  | 模板引擎           |
| `slf4j-api` / `slf4j-simple`  | 生成过程日志       |
| `lombok`                      | 生成实体注解所需   |
| `swagger-annotations-jakarta` | SpringDoc 注释支持 |

> [https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/MP-Generator/pom.xml](https://github.com/springvortex/spring-cloud-alibaba/blob/release/v1.0.0/MP-Generator/pom.xml)

这些依赖只服务“生成代码”，不参与线上服务运行。

### 常见问题

#### 找不到 generator.properties

确认模板已经复制为 `src/main/resources/generator.properties`，并且执行过 `mvn compile`，让资源进入 `target/classes`。

#### 生成到错误目录

检查 `CodeGenerator.class` 的运行位置。这个设计已经尽量从 class 位置反推模块根目录，如果构建产物被移动过，需要重新用 Maven
编译后再运行。

#### 类名前缀没去掉

检查 `generator.tablePrefix`。它是一个逗号分隔列表，例如：

```properties
generator.tablePrefix=t_,sys_
```

#### 生成的 Service 编译失败

生成器模块不是业务模块，缺少 `IService`、`ServiceImpl` 相关运行依赖。把代码迁到 Provider 或 Mail 等业务模块后编译。

#### 覆盖已有代码怎么办

生成前先确认 Git 工作区干净，或者先输出到新目录检查。生成结果迁移后再手工合并，不要盲目覆盖已经改过的业务代码。

### 模块小结

`MP-Generator`
的价值是把重复的表到代码映射交给工具，把真正需要设计的部分留给人：接口契约、DTO、权限、事务和业务规则。它保持独立、不进父工程、不携带真实配置，这些边界让代码生成变成一个安全的工程辅助步骤，而不是后续维护的隐患。
