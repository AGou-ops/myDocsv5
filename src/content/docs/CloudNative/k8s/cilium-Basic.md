---
title: cilium Basic
description: This is a document about cilium Basic.
---

## 快速安装
```bash
# 安装 cilium-cli
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}
sha256sum --check cilium-linux-${CLI_ARCH}.tar.gz.sha256sum
sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
rm cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}


# 安装
cilium install --version 1.14.5


# 检查安装结果j
cilium status --wait

```
使用helm安装：
```bash
helm repo add cilium https://helm.cilium.io/


kubectl create secret generic -n kube-system cilium-etcd-secrets \
    --from-file=etcd-client-ca.crt=/etc/kubernetes/TLS/etcd/ca.pem  \
    --from-file=etcd-client.key=/etc/kubernetes/TLS/etcd/etcd-server-key.pem \
    --from-file=etcd-client.crt=/etc/kubernetes/TLS/etcd/etcd-server.pem 

  
helm install cilium cilium/cilium --version 1.14.5 \
  --namespace kube-system \
  --set etcd.enabled=true \
  --set etcd.ssl=true \
  --set "etcd.endpoints[0]=https://172.19.82.157:2379" \
  --set "etcd.endpoints[1]=https://172.19.82.158:2379" \
  --set "etcd.endpoints[2]=https://172.19.82.159:2379"

```

## 参考链接
- [Installation using Helm — Cilium 1.14.5 documentation](https://docs.cilium.io/en/stable/installation/k8s-install-helm/)
- [Cilium Quick Installation — Cilium 1.14.5 documentation](https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/)