---
title: SRE基础必会核心实战面试题
description: This is a document about SRE基础必会核心实战面试题.
---

## linux 系统相关

### uptime命令中load average字段后的3个数字代表什么？

一分钟内,五分钟内,十五分钟内的系统平均负载;

### 如何判断系统整体负载的高低？

  load 是一定时间内计算机有多少个活跃任务,也就是说是计算机的任务执行队列的长度,cpu计算的队列,所以一般认为CPU核数的就是load值的上线。

### 如何查看某个进程的CPU、内存和负载情况？

通常我们使用top命令去交互查看系统负载信息。

### 如何查看某个进程的CPU、内存和负载情况？

top 命令

### free命令中shared buff/cache available 这3个字段是什么意思？

shared 多进程使用的共享内存;

 buff/cache 读写缓存内存,这部分内存是当空闲来用的,当free内存不足时,linux内核会将此内存释放;

 available 是可以被程序梭使用的物理内存;

### 描述下在linux中给一个文件授予 644权限是什么意思？

```
权限数字是八进制:
读: r 4 
写: w 2
可执行:x 1
```



### linux中如何禁止一个用户通过shell登录？

使用命令或者通过修改/etc/passwd文件的用户shell部分为/sbin/nologin 即可实现。

###  如何追踪shell脚本的执行过程？

sh -x 或者 bash -x



### 如何观察当前系统的网络使用情况？

使用iftop等工具

### 如何追踪A主机到B主机过程中的丢包情况？

traceroute、mtr, 或者其他双端带宽测试工具。

### linux 系统中ID为0是什么用户？

root

### 怎么统计当前系统中的活跃连接数？

netstat -na|grep ESTABLISHED|wc -l

###  time_wait 状态处于TCP连接中的那个位置？

客户端发出FIN请求服务端断连, 服务器未发送ack+fin确认。

### 如何查看一个文件的权限、大小和最新修改时间？

```
ls -l #或者 ll
```

### slinux系统启动过程 

内核引导-->运行init-->系统初始化-->建立终端-->用户登陆系统

###  常用命令

监控类：top，ps -ef

文件类：lsof

网络分析：tcpdump，netstat ss iftop

磁盘：iotop

内存： free

cpu:  vmstat 上写文切换

## shell脚本 案例等等 比如 参数变量 $$ $! $* $@ 作用 循环for while case 函数等

```
    $$ shell本身的pid号
    $!  最后一个pid号
    $? 执行上一条命令后返回的值
    $* 所有参数列表
    $@ 所有参数列表（可以作为一个整体）
    $0 shell文件名
    $# 传参的个数

```

## 系统环境变量加载优先级(这里会存在很多坑 比如某个人在环境变量中加载异常指令，可能会造成疑问问题)

```
/etc/profile -> /.bash_profile -> /.bashrc -> /etc/bashrc -> ~/.bash_logout
```

# 核心场景问题

1. 场景 1. 给你一台服务器需要找到nginx日志文件在哪 通过什么方式 
2. 场景2: 如何查看进程 如何查看这个进程的端口 通过端口如何找到这个进程
3. 场景3: 如何查看系统负载 load 值 ，你们系统的load值是什么 
4. 场景4: 如何查看服务器网络流量 
5.  统计一个进程打开的文件数据？  Lsof 统计进程这些数据的核心考 lsof 命令  /proc 这个内存映射的文件系统
6.  统计系统中打开进程前10 的文件数？ Lsof
7.  统计进程占用的物理内存?  ps top pidstat dstat /proc 等等
8. 系统load 统计的什么？ 平均负载 
9. 系统/proc 文件系统是什么？ 虚拟文件系统 
10.  tcp 半连接  全连接 accpt队列 缓冲队列





# 性能问题

cpu: 

1. 如何理解系统平均负载 
2. cpu使用率
3. cpu上下文是什么
4. 进程状态 僵尸经常Z   T  R S S++等等
5. 短时进程
6. 中断理解
7. 系统调用

内存：

1. cache 和buffer 区别
2. cache page 理解
3.  内存泄露
4. swap 

磁盘：

1.  io读写
2. inode block 理解
3. 常用文件系统类型 



网络相关

1.  tcp三次握手

2.  tcp 四次

3.  tcp为什么是可靠连接 

   TCP通信最重要的特征是：有序(ordering)和可靠(reliable)。有序是通过将文本流分段并编号实现的。可靠是通过ACK回复和重复发送(retransmission)实现的

   TCP连接从无到有需要一个建立连接的过程。建立连接的最重要目是让连接的双方交换初始序号(ISN, Initial Sequence Number)。

4.  tcp 状态

5. udp应用场景是什么

6. 抓包工具tcpdump 抓包分析工具wireshark

7. wiresharek 用过什么操

8. 优化相关 time_wait close_wait

9.  nat是什么

10. 缓冲区队列 可以了解 

11. 协议 http dns socket tcp/udp grpc arp  

12. 访问一个网站过程 dns tcp三次握手 http 或 tls  tcp四次挥手 中间设计到cache 