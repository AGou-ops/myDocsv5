---
title: helm安装zookeeper集群
description: This is a document about helm安装zookeeper集群.
---

helm安装zookeeper集群，并使用nfs作为后端存储.
## 安装nfs
官方仓库：[GitHub - kubernetes-sigs/nfs-subdir-external-provisioner: Dynamic sub-dir volume provisioner on a remote NFS server.](https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner)
```bash
# 使用helm命令快速安装nfs-provisioner
$ helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/
$ helm install nfs-subdir-external-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
    --set nfs.server=x.x.x.x \   # 这里填写你nfs服务器的IP和存储地址
    --set nfs.path=/exported/path
```
nfs搭建很简单，网上教程很多，在此不再赘述。
## 安装zookeeper集群
这里我使用`bitnami/zookeeper`这个helm charts进行安装，需要稍微修改点东西：
```bash
# 添加bitnami chart仓库
$ helm repo add bitnami https://charts.bitnami.com/bitnami
$ helm repo update
# 下载zookeeper的chart到本地，并解压
$ helm pull bitnami/zookeeper --untar --untardir .

# 进入zookeeper
$ cd zookeeper

$ vim values.yaml
# 下面我主要列举重要的选项修改
# 将stat命令添加进白名单，方便查看集群状态，开发测试环境使用
fourlwCommandsWhitelist: stat, srvr, mntr, ruok
# 指定storageClass，注意，需要指定动态卷
persistence:
    storageClass: local-path
# 副本数量
replicaCount: 3
```
使用一下命令安装helm chart：
```bash
helm install zookeeper .
```
检查集群运行状态：
```bash
# 进入任一zookeeper节点pod
    export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=zookeeper,app.kubernetes.io/instance=zookeeper,app.kubernetes.io/component=zookeeper" -o jsonpath="{.items[0].metadata.name}")
    kubectl exec -it $POD_NAME -- bash

# 如果提示报错stat不在白名单，则需要加一下白名单，上面有。
$ echo stat | nc localhost 2181
# output
Zookeeper version: 3.9.0-1674a5e97f43bc38e9bf56b04f83a7ae34d68249, built on 2023-07-19 09:09 UTC
Clients:
 /0:0:0:0:0:0:0:1:46652[0](queued=0,recved=1,sent=0)

Latency min/avg/max: 0/0.0/0
Received: 3
Sent: 2
Connections: 1
Outstanding: 0
Zxid: 0x500000000
Mode: follower
Node count: 5

```