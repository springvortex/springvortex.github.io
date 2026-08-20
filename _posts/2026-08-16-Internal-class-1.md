---
layout: mypost
title: 内部类-1-java基础语法
categories: [ java ]
---

### 成员内部类 + 静态内部类 完整规则速查

#### 一、成员内部类核心规则

1. 修饰权限：支持`public`/`private`/`protected`/默认包权限四种修饰
2. 私有内部类访问方式：外部类提供公开方法返回内部类实例，对外隐藏内部类实现
   ```java
   public Inner getInstance() {
       return new Inner();
   }
   ```
3. 同名变量访问：内部类和外部类存在同名成员变量时，用`外部类名.this.变量名`明确指定访问外部类的变量
   ```java
   Outer.this.a
   ```

---

#### 二、静态内部类核心规则

1. 定义本质：带`static`修饰的特殊成员内部类
2. 实例化方式：无需依赖外部类对象，直接通过外部类名调用构造器创建
   ```java
   Outer.Inner oi = new Outer.Inner();
   ```
3. 方法调用规则：
    - 非静态方法：先创建静态内部类对象，用对象调用
    - 静态方法：直接通过`外部类名.内部类名.方法名`调用
