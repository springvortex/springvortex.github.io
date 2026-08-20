---
layout: mypost
title: VMware 配置 Ubuntu 24 静态 IP（NAT 模式）
categories: [ VMware, Ubuntu, Linux ]
author: jiancai.zhong
date: 2026-08-13
---

> Ubuntu24 使用 **netplan**，yaml 格式 **严格缩进，不能用 Tab，只能空格**！

Linux 设置静态 IP，就是让机器重启后地址不变。方便 SSH 远程连接，不用每次查
IP。搭建网站、数据库、集群服务时，其他设备能稳定访问。防火墙规则、端口映射、内网同步任务也不会因 IP 变动失效。缺点是要规划地址，容易出现
IP 冲突。

### 第一步：设置 VMware 的虚拟网络

打开 VMware，进入 `编辑 -> 虚拟网络编辑器`：

![虚拟网络编辑器](001.webp)

按照下图进行配置，其中子网 IP `192.168.100.0` 决定了以后的网段：

![子网配置](002.webp)

配置完上述设置后，进行 NAT 设置，主要配置网关地址：

![NAT 设置](003.webp)

完整的配置参考：

![完整配置](004.webp)

### 第二步：修改 Ubuntu 网卡信息

主要是查看网卡的名称，修改对应的 Ubuntu 的网卡配置信息，最后重启网卡。

#### 查看网卡

 ```sh
 ip addr
 ```

运行该命令后会输出网卡的基本信息，找到你的网卡名称，如我的输出如下：

 ```sh
 zjc@ubuntu-24-dev:~$ ip addr
 1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
     link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
     inet 127.0.0.1/8 scope host lo
        valid_lft forever preferred_lft forever
     inet6 ::1/128 scope host noprefixroute
        valid_lft forever preferred_lft forever
 2: ens32: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
     link/ether 00:0c:29:a2:18:d1 brd ff:ff:ff:ff:ff:ff
     altname enp2s0
     inet 192.168.100.128/24 brd 192.168.100.255 scope global ens32
        valid_lft forever preferred_lft forever
     inet6 fe80::20c:29ff:fea2:18d1/64 scope link
        valid_lft forever preferred_lft forever
 ```

那么我的网卡名称就是 `ens32`，接下来修改配置时候要看准这个网卡，不要修改错误。

#### 查看并修改网卡配置文件

首先进入网卡的配置目录 `/etc/netplan/`，然后拷贝一份保存起来，防止修改出错后以后上不了网，再进行编辑：

 ```sh
 zjc@ubuntu-24-dev:/etc/netplan$ cd /etc/netplan/
 zjc@ubuntu-24-dev:/etc/netplan$ pwd
 /etc/netplan
 zjc@ubuntu-24-dev:/etc/netplan$ ls
 50-cloud-init.yaml
 zjc@ubuntu-24-dev:/etc/netplan$ cp 50-cloud-init.yaml 50-cloud-init.yaml.bak
 zjc@ubuntu-24-dev:/etc/netplan$ ls
 50-cloud-init.yaml  50-cloud-init.yaml.bak
 ```

备份完成后，使用 vim 编辑配置并保存，修改后的配置示例如下：

 ```yaml
 network:
   version: 2
   ethernets:
     ens32:
       dhcp4: false
       dhcp6: false

       addresses: [ 192.168.100.128/24 ]
       optional: true

       routes:
         - to: default
           via: 192.168.100.2

       nameservers:
         addresses: [ 114.114.114.114, 8.8.8.8 ]
 ```

> 注意：Ubuntu 进来默认不是 root 用户，如果执行命令遇到没有权限 `Permission denied` 则需要使用 `sudo` 进行授权。

配置项说明：

- `ens32`：你的网卡名
- `192.168.100.128/24`：自选静态 IP（和 VMnet8 同网段）
- `via: 192.168.100.2`：VMware NAT 网关

#### 重启网卡

一般是先测试网卡，没有问题再正式执行重启命令生效：

 ```sh
 # 测试配置，出错 30 秒自动回滚
 sudo netplan try
 ```

网络正常就回车确认永久生效。测试没问题也可以直接执行：

 ```sh
 sudo netplan apply
 ```

#### 验证网络

 ```sh
 ip addr                # 查看 IP 是否生效
 ping 192.168.100.2    # 测试通网关
 ping www.baidu.com    # 测试外网
 ```

`ip addr` 能正常显示网卡的 IP 为 `192.168.100.128` 则正常，`ping` 网关和外网返回如下则正常：

 ```sh
 zjc@ubuntu-24-dev:~$ ping 192.168.100.2
 PING 192.168.100.2 (192.168.100.2) 56(84) bytes of data.
 64 bytes from 192.168.100.2: icmp_seq=1 ttl=128 time=0.132 ms
 64 bytes from 192.168.100.2: icmp_seq=2 ttl=128 time=0.185 ms
 64 bytes from 192.168.100.2: icmp_seq=3 ttl=128 time=0.205 ms
 64 bytes from 192.168.100.2: icmp_seq=4 ttl=128 time=0.225 ms
 64 bytes from 192.168.100.2: icmp_seq=5 ttl=128 time=0.237 ms
 64 bytes from 192.168.100.2: icmp_seq=6 ttl=128 time=0.208 ms
 ^C
 --- 192.168.100.2 ping statistics ---
 6 packets transmitted, 6 received, 0% packet loss, time 5157ms
 rtt min/avg/max/mdev = 0.132/0.198/0.237/0.033 ms

 zjc@ubuntu-24-dev:~$ ping www.baidu.com
 PING www.a.shifen.com (183.2.172.177) 56(84) bytes of data.
 64 bytes from 183.2.172.177: icmp_seq=1 ttl=128 time=11.7 ms
 64 bytes from 183.2.172.177: icmp_seq=2 ttl=128 time=7.23 ms
 64 bytes from 183.2.172.177: icmp_seq=3 ttl=128 time=10.5 ms
 64 bytes from 183.2.172.177: icmp_seq=4 ttl=128 time=8.14 ms
 64 bytes from 183.2.172.177: icmp_seq=5 ttl=128 time=8.70 ms
 ^C
 --- www.a.shifen.com ping statistics ---
 5 packets transmitted, 5 received, 0% packet loss, time 4007ms
 rtt min/avg/max/mdev = 7.228/9.260/11.710/1.631 ms
 ```

### 踩坑点

- yaml **缩进必须空格，禁止 Tab**，格式错直接断网
- IP、网关必须和 VMnet8 网段一致，否则不通
- 静态 IP 不要落在 VMware DHCP 地址池范围内，防止 IP 冲突
- 想宿主机 SSH 连接虚拟机：确保 VMnet8 网卡启用
