---
title: etcdctl 快速手册
description: This is a document about etcdctl 快速手册.
---

使用`etcdctl`命令之前先查看一下当前API的版本，不同API版本之间会有差异.
```bash
$ etcdctl version
etcdctl version: 3.4.27
API version: 3.4
# 如果上面的API version显示的是2版本，则可以使用环境变量ETCDCTL_API来切换API版本
export ETCDCTL_API=3
```
如果etcd是在k8s中使用的话，那么使用etcdctl连接etcd服务需要指定ca证书、etcd节点IP端口及其他信息，这样会使得整个`etcdctl`命令显得十分冗长.
```bash
# 比如在k8s中用以下长命令获取集群信息
etcdctl -w table --cacert=/etc/kubernetes/TLS/etcd/ca.pem --cert=/etc/kubernetes/TLS/etcd/etcd-server.pem --key=/etc/kubernetes/TLS/etcd/etcd-server-key.pem --endpoints https://172.19.82.157:2379 endpoint status --cluster
```

使用环境变量文件存储这些变量可以解决上面这个问题：
```bash
$ vim /etc/profile.d/etcd
export ETCDCTL_API=3
export ETCDCTL_CACERT=/etc/kubernetes/TLS/etcd/ca.pem
export ETCDCTL_CERT=/etc/kubernetes/TLS/etcd/etcd-server.pem
export ETCDCTL_KEY=/etc/kubernetes/TLS/etcd/etcd-server-key.pem
export ETCDCTL_ENDPOINTS=https://172.19.82.157:2379,https://172.19.82.158:2379,https://172.19.82.159:2379

$ source /etc/profile.d/etcd

# 现在再使用etcdctl命令就方便很多
$ etcdctl -w table endpoint status --cluster
+----------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
|          ENDPOINT          |        ID        | VERSION | DB SIZE | IS LEADER | IS LEARNER | RAFT TERM | RAFT INDEX | RAFT APPLIED INDEX | ERRORS |
+----------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
| https://172.19.82.159:2379 |  207872b53980dcb |  3.4.27 |  7.7 MB |      true |      false |      1304 |     561313 |             561313 |        |
| https://172.19.82.158:2379 | 3d8a2a81d6e5d510 |  3.4.27 |  7.7 MB |     false |      false |      1304 |     561313 |             561313 |        |
| https://172.19.82.157:2379 | 4e998199ebbc5961 |  3.4.27 |  7.7 MB |     false |      false |      1304 |     561313 |             561313 |        |
+----------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
```
## 增删改查
- 增
```bash
$ etcdctl put <key> <value>
```
- 改
```bash
$ etcdctl put <key> <new_value>
```
- 查
```bash
# 获取单个key值
$ etcdctl get <key>
# 其他可选参数
## - --hex：以hex格式输出
## - --print-value-only：只打印value
## - --prefix：以该字段开头的key
## - --limit=2：分页查询

# 获取全部key
etcdctl get --prefix "" --keys-only
```
- 删
```bash
$ etcdctl del <key>
```
## 其他
```bash
# 获取集群健康状态
$ etcdctl endpoint health
# 获取集群节点详细信息，以table展示
$ etcdctl -w table endpoint status --cluster
```
## 参考链接
- [Interacting with etcd | etcd](https://etcd.io/docs/v3.4/dev-guide/interacting_v3/)
- [etcd Cheat Sheet](https://lzone.de/cheat-sheet/etcd)