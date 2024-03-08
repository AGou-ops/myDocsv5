---
title: Go语言相关
description: This is a document about Go语言相关.
---

[饶大文章汇总](./Go语言相关（续-文章汇总）.md)

# **语言层面**

​            1、     **并发原语** 

2、goroutine调度原理（GMP） 

3、defer和作用域 

4、带容量channel和无容量channel 

**5、锁** 

https://draveness.me/golang/concurrency/golang-sync-primitives.html

6、error 

7、context 

8、select和channel的异步 

9、内存溢出或goroutine溢出的排错和监控 

**10、pprof的使用** 

https://www.liwenzhou.com/posts/Go/performance_optimisation/

11、服务重启和信号 

12、goroutine池

13、slice和数组关系

**14、内存对齐**

https://segmentfault.com/a/1190000017527311

# **架构层面**

## **分布式锁**

1、redis、zookeeper、etcd实现分布式锁 

2、redis分布式锁死锁 

3、redis过期算法的实现 

4、redis集群数据同步原理 

5、redis集群一个节点挂掉后，集群状态和内部处理的流程 

6、redis缓存的雪崩、击穿、穿透、命中率 

7、redis缓存和数据库的数据一致性

## **MQ**

1、Kafka支持并发量高的原因 

2、Kafka和RebbidMQ的区别 

3、Kafka的数据一致性原理 

4、RebbidMQ的订阅 

5、kafka订阅数据的一致性

## **Nginx**

1、内部实现机制 

2、代理实现原理和算法

## **数据库**

1、mysql查询优化 

2、索引原理和使用注意事项 

3、常用引擎 

4、慢查询优化

## **算法方面**

1、Raft一致性 

2、大文件数据去重（分治和hash） 

3、两个有序大数组排序，不开辟大量空间进行组合排序，复杂度要求O(n)

## **协议**

1、web开发过程中，怎么做的请求超时 

2、TCP的三次握手和四次挥手 

3、http请求流程 

4、TCP的超时怎么做的

## **Go框架**

1、beego和gin的区别 

2、go-micro的使用 

3、grpc和go-micro的区别

## **微服务**

1、你对微服务的理解，和分布式的区别 

2、服务注册和发现、熔断、限流、动态扩容和收缩等一系列概念性东西 

3、服务注册和发现的流程，发现是在哪做的（你个人的理解） 

4、项目里的应用