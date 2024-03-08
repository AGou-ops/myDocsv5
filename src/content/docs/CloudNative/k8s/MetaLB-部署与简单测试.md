---
title: MetaLB 部署与简单测试
description: This is a document about MetaLB 部署与简单测试.
---

## MetaLB 部署
```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml
```

其他参考：[MetalLB, bare metal load-balancer for Kubernetes](https://metallb.universe.tf/installation/)

## 测试
layer2模式配置：
```yaml
cat <<EOF > IPAddressPool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: pool40-50
  namespace: metallb-system
spec:
  addresses:
  # 可分配的 IP 地址,可以指定多个，包括 ipv4、ipv6
  - 172.19.82.40-172.19.82.50
EOF

kubectl apply -f IPAddressPool.yaml



cat <<EOF > L2Advertisement.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: example
  namespace: metallb-system
spec:
  ipAddressPools:
  - pool40-50 #上一步创建的 ip 地址池，通过名字进行关联
EOF

kubectl apply -f L2Advertisement.yaml
```

BGP模式配置：
```yaml
cat <<EOF > BGPPeer.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: sample
  namespace: metallb-system
spec:
  myASN: 64500 # MetalLB 使用的 AS 号
  peerASN: 64501 # 路由器的 AS 号
  peerAddress: 10.0.0.1 # 路由器地址
EOF

kubectl apply -f BGPPeer.yaml


cat <<EOF > IPAddressPool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: first-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.240-192.168.1.250 # 可分配的 IP 地址
EOF

kubectl apply -f IPAddressPool.yaml


cat <<EOF > L2Advertisement.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: example
  namespace: metallb-system
spec:
  ipAddressPools:
  - first-pool
EOF

kubectl apply -f  L2Advertisement.yaml

```

### 部署nginx进行测试
```yaml
cat <<EOF > nginx-dp.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: docker.io/nginx:latest
        ports:
        - containerPort: 80
EOF

kubectl apply -f nginx-dp.yaml


cat <<EOF > nginx-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx2
  labels:
    app: nginx
spec:
  selector:
    app: nginx
  ports:
  - name: nginx-port
    protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
EOF

kubectl apply -f nginx-svc.yaml

```
结果与检查：
```bash
|16:18:51|root@Debain12-template:[metalb]> kubectl get svc
NAME                 TYPE           CLUSTER-IP       EXTERNAL-IP     PORT(S)                                        AGE
kubernetes           ClusterIP      10.96.0.1        <none>          443/TCP                                        112d
nginx2               LoadBalancer   10.107.216.124   172.19.82.240   80:38417/TCP                                   2m24s
zookeeper            NodePort       10.104.239.48    <none>          2181:32970/TCP,2888:31332/TCP,3888:30597/TCP   101d
zookeeper-headless   ClusterIP      None             <none>          2181/TCP,2888/TCP,3888/TCP                     101d


|16:19:02|root@Debain12-template:[metalb]> curl 172.19.82.240
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```