---
title: Kubeadm 快速部署手册
description: This is a document about Kubeadm 快速部署手册.
---

```bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# sysctl params required by setup, params persist across reboots
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# Apply sysctl params without reboot
sudo sysctl --system

# Verify that the br_netfilter, overlay modules are loaded by running the following commands:
lsmod | grep br_netfilter
lsmod | grep overlay
sysctl net.bridge.bridge-nf-call-iptables net.bridge.bridge-nf-call-ip6tables net.ipv4.ip_forward


swapoff -a
```

安装containerd:

```bash
wget https://github.com/containerd/containerd/releases/download/v1.7.2/containerd-1.7.2-linux-amd64.tar.gz
tar Cxzvf /usr/local containerd-1.7.2-linux-amd64.tar.gz

wget https://raw.githubusercontent.com/containerd/containerd/main/containerd.service -O /usr/lib/systemd/system/containerd.service


systemctl daemon-reload
systemctl enable --now containerd
```

安装runC：

```bash
wget https://github.com/opencontainers/runc/releases/download/v1.1.7/runc.amd64
install -m 755 runc.amd64 /usr/local/sbin/runc
```

安装CNI插件：

```bash
wget https://github.com/containernetworking/plugins/releases/download/v1.3.0/cni-plugins-linux-amd64-v1.3.0.tgz
mkdir -p /opt/cni/bin
tar Cxzvf /opt/cni/bin cni-plugins-linux-amd64-v1.3.0.tgz
```

Configuring the systemd cgroup driver:

```bash
/etc/containerd/config.toml添加一下内容：
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
    SystemdCgroup = true
[plugins."io.containerd.grpc.v1.cri"]
  sandbox_image = "registry.k8s.io/pause:3.2"
    
disabled_plugins = []
```

`systemctl restart containerd`



apt安装kubeadm、kubectl、kubelet：

```bash
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl
curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-archive-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-archive-keyring.gpg] https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
apt install kubeadm=1.25.4-00 kubectl=1.25.4-00 kubelet=1.25.4-00 -y
# sudo apt-get install -y kubelet kubeadm kubectl
# 标记包以免被误升级
sudo apt-mark hold kubelet kubeadm kubectl
#sudo apt-mark unhold kubelet kubeadm kubectl
```



```bash
/usr/lib/systemd/system/containerd.service

Environment="HTTP_PROXY=http://172.19.82.111:7891/"
Environment="HTTPS_PROXY=http://172.19.82.111:7891/"


Environment="HTTP_PROXY=http://172.19.82.111:7891/" "HTTPS_PROXY=http://172.19.82.111:7891/" "NO_PROXY=192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,127.0.0.1,localhost,.local,.svc,.nblh.local"

```



kubeadm:

```bash
kubeadm config images pull --kubernetes-version=1.25.4

kubeadm config images list --kubernetes-version=1.25.4

  
ctr image pull registry.k8s.io/kube-apiserver:v1.25.4
ctr image pull registry.k8s.io/kube-controller-manager:v1.25.4
ctr image pull registry.k8s.io/kube-scheduler:v1.25.4
ctr image pull registry.k8s.io/kube-proxy:v1.25.4
ctr image pull registry.k8s.io/pause:3.8
ctr image pull registry.k8s.io/etcd:3.5.5-0
ctr image pull registry.k8s.io/coredns/coredns:v1.9.3




kubeadm init --kubernetes-version=1.25.4 --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address 0.0.0.0 --apiserver-bind-port 6443 --apiserver-cert-extra-sans 127.0.0.1,101.69.229.138,nblh.local --apiserver-advertise-address 172.19.82.157


kubeadm init --kubernetes-version=1.25.10 --apiserver-advertise-address 0.0.0.0 --apiserver-bind-port 6443 --apiserver-cert-extra-sans 127.0.0.1,101.69.229.138 --apiserver-advertise-address 172.19.82.157

kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
```



helm:

```bash
https://ranchermanager.docs.rancher.com/pages-for-subheaders/install-upgrade-on-a-kubernetes-cluster#kubernetes-cluster
```





rancher:

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable

    ./cert.sh --ssl-domain=rancher.nblh.local --ssl-size=2048 --ssl-date=3650

    helm install rancher rancher-stable/rancher \
    --namespace cattle-system \
    --set hostname=rancher.nblh.local \
    --set bootstrapPassword=admin \
    --set replicas=1 \
    --set ingress.tls.source=secret \
    --set privateCA=true \
    --set global.cattle.psp.enabled=false
  
  helm uninstall rancher --namespace cattle-system
```



