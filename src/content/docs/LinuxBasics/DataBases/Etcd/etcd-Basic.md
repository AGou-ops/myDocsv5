---
title: etcd Basic
description: This is a document about etcd Basic.
---

## 简介
> Etcd 是一个分布式的键值存储系统，可以用于持久化和高可用的存储配置数据。它基于Raft一致性算法，为分布式系统提供强一致性的服务。
> **核心特性**：
> 
> - **简单的API**：Etcd 使用简单的 HTTP/GRPC API，使得各种语言和应用都可以轻松地与其交互。
> - **强一致性**：借助Raft协议，Etcd 可以在集群中的多个节点之间提供强一致性的数据。
> - **多版本并发控制**：每个键都存储在多个版本中，支持并发的读写操作。
> - **安全**：内置的权限管理和 SSL/TLS 支持。

## 安装与部署
安装很简单，参考[官方文档](https://etcd.io/docs/v3.5/install/)
