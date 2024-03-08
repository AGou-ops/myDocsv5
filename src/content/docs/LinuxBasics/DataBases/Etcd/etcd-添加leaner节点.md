---
title: etcd 添加leaner节点
description: This is a document about etcd 添加leaner节点.
---

> 在 etcd 3.4 版本中，引入了新的 learner 角色的节点，learner 角色除了不参与投票外，跟其他普通节点一致，并且支持将 learner 节点提升为普通的参与投票的节点。因此针对上面的情况，如果有配置错误的情况，刚开始作为 learner 节点启动就会发现问题，因为 learner 节点不影响 quorum，所以 quorum 不会改变。在保证新节点增加没有问题后，可以将 learner 节点提升为普通节点，规避运维风险。

```bash
# 添加一个节点
$ etcdctl member add etcd-server-170 --peer-urls=http://172.19.82.170:2380 --learner
# output 
Member b3fd2dac6cb6b1ab added to cluster 40dd0d9ac0d2b2cd

ETCD_NAME="etcd-server-170"
ETCD_INITIAL_CLUSTER="etcd-server-159=https://172.19.82.159:2380,etcd-server-158=https://172.19.82.158:2380,etcd-server-157=https://172.19.82.157:2380,etcd-server-170=http://172.19.82.170:2380"
ETCD_INITIAL_ADVERTISE_PEER_URLS="http://172.19.82.170:2380"
ETCD_INITIAL_CLUSTER_STATE="existing"

# 检查节点状态
$  etcdctlx member list -w table
+------------------+-----------+-----------------+----------------------------+----------------------------+------------+
|        ID        |  STATUS   |      NAME       |         PEER ADDRS         |        CLIENT ADDRS        | IS LEARNER |
+------------------+-----------+-----------------+----------------------------+----------------------------+------------+
|  207872b53980dcb |   started | etcd-server-159 | https://172.19.82.159:2380 | https://172.19.82.159:2379 |      false |
| 3d8a2a81d6e5d510 |   started | etcd-server-158 | https://172.19.82.158:2380 | https://172.19.82.158:2379 |      false |
| 4e998199ebbc5961 |   started | etcd-server-157 | https://172.19.82.157:2380 | https://172.19.82.157:2379 |      false |
| b3fd2dac6cb6b1ab | unstarted |                 |  http://172.19.82.170:2380 |                            |       true |
+------------------+-----------+-----------------+----------------------------+----------------------------+------------+

# 启动新节点
$ export ETCD_NAME="etcd-server-170"
$ export ETCD_INITIAL_CLUSTER="etcd-server-159=https://172.19.82.159:2380,etcd-server-158=https://172.19.82.158:2380,etcd-server-157=https://172.19.82.157:2380,etcd-server-170=http://172.19.82.170:2380"
$ export ETCD_INITIAL_CLUSTER_STATE=existing


./etcd --data-dir=`pwd`/data/etcd --name etcd-server-170 \
  --initial-cluster etcd-server-159=https://172.19.82.159:2380,etcd-server-158=https://172.19.82.158:2380,etcd-server-157=https://172.19.82.157:2380,etcd-server-170=https://172.19.82.170:2380 \
    --initial-advertise-peer-urls http://172.19.82.170:2380 \
    --listen-peer-urls http://172.19.82.170:2380 \
    --advertise-client-urls http://172.19.82.170:2379 \
    --listen-client-urls http://172.19.82.170:2379 \
      --initial-cluster-state existing

```

参考链接：[How to Add and Remove Members | etcd](https://etcd.io/docs/v3.6/tutorials/how-to-deal-with-membership/)