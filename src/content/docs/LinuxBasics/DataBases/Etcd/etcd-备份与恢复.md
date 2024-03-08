---
title: etcd 备份与恢复
description: This is a document about etcd 备份与恢复.
---

etcd的备份与恢复十分简单，使用`etcdctl`命令即可.
```bash
# 备份
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \  
--cacert=/etc/kubernetes/pki/etcd/ca.crt \  
--cert=/etc/kubernetes/pki/etcd/server.crt \  
--key=/etc/kubernetes/pki/etcd/server.key \  
snapshot save <backup-file-location>
# 恢复
ETCDCTL_API=3 etcdctl --data-dir="/var/lib/etcd-backup" \  
--endpoints=https://127.0.0.1:2379 \  
--cacert=/etc/kubernetes/pki/etcd/ca.crt \  
--cert=/etc/kubernetes/pki/etcd/server.crt \  
--key=/etc/kubernetes/pki/etcd/server.key \  
snapshot restore backup.db

# 另外
etcdctl snapshot restore /usr/local/etcd-v3.4.27/snapshot/snapshot.db \
--name etcd-server-159 \
--initial-cluster=etcd-server-157=https://172.19.82.157:2380,etcd-server-158=https://172.19.82.158:2380,etcd-server-159=https://172.19.82.159:2380 \
  --initial-advertise-peer-urls=https://172.19.82.159:2380 \
  --data-dir=/data/etcd
```