---
title: Docker 容器间通过主机名互相访问
description: This is a document about Docker 容器间通过主机名互相访问.
---

# Docker 容器间通过主机名互相访问

由于容器的IP地址在容器重启之后会失效，所以不能写死IP，这时候就可以通过使用主机名进行互相访问。

## 1. 使用`--link`参数

> docker run --link可以用来链接2个容器，使得源容器（被链接的容器）和接收容器（主动去链接的容器）之间可以互相通信，并且接收容器可以获取源容器的一些数据，如源容器的环境变量。

```bash
# 创建并启动名为nginx_test的容器。
docker run -d --name nginx_test nginx
# 创建并启动名为node的容器，并把该容器和名为nginx的容器链接起来。
docker run -itd --name node --link nginx_test:nginx centos:7 bash
```

## 2. 使用自定义网段

```bash
# 创建自定义网络
docker network create my-net
# 查看自定义网络的一些属性
# docker network inspect my-net
# 最后指定自定义的network即可。
docker run -it --name test1 --network my-net centos:7 bash
docker run -it --name test2 --network my-net centos:7 bash 
```

**默认网络和自定义网络区别**

> **User-defined bridges provide automatic DNS resolution between containers**.
> Containers on the default bridge network can only access each other by IP addresses, unless you use the --link option, which is considered legacy. On a user-defined bridge network, containers can resolve each other by name or alias.

>  翻译过来大意：**就是用户自定义的网卡可以在容器之间提供自动的 DNS 解析**，缺省的桥接网络上的容器只能通过 IP 地址互相访问，除非使用 --link 参数。在用户自定义的网卡上，容器直接可以通过名称或者别名相互解析。

## 参考链接

- https://blog.csdn.net/moyu11111/article/details/120841853