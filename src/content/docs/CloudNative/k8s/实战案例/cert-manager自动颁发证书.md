---
title: cert-manager自动颁发证书
description: This is a document about cert-manager自动颁发证书.
---

## cert-manager简介

> cert-manager 是一个云原生证书管理开源项目，用于在 Kubernetes 集群中自动管理和颁发来自各种颁发源的 TLS 证书，它可以从各种受支持的来源颁发证书，包括 [Let’s Encrypt](https://letsencrypt.org/)、[HashiCorp Vault](https://www.vaultproject.io/)和[Venafi](https://www.venafi.com/)以及私有 PKI，它将确保证书定期有效和更新，并在到期前的适当时间尝试更新证书。

## k8s集群中安装cert-manager

参考：[Installation - cert-manager Documentation](https://cert-manager.io/docs/installation/)

推荐使用helm chart进行安装：

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.crds.yaml
helm install \
  cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.0 \
  # --set installCRDs=true
```

<!--more-->

## 为nginx-ingress自动签发证书

### 使用CA

这里使用一个官方的示例，但略有不同：

- `selfsigned-cert.yaml`

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-cluster-issuer
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: selfsigned-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: ca.nblh.local
  subject:
    countries:
      - CN
    localities:
      - HangZhou
    organizationalUnits:
      - Root CA
    organizations:
      - nblh.local
    postalCodes:
      - "310000"
    provinces:
      - ZheJiang
    streetAddresses:
      - fandou graden
    serialNumber: SELF20230919
  duration: 43800h
  secretName: selfsigned-ca-secret
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: selfsigned-cluster-issuer
    kind: ClusterIssuer
    group: cert-manager.io

---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: cluster-ca-issuer
spec:
  ca:
    secretName: selfsigned-ca-secret
---
# 手动签发证书
# apiVersion: cert-manager.io/v1
# kind: Certificate
# metadata:
#   name: kuard-tls
#   namespace: test
# spec:
#   dnsNames:
#     - kuard.nblh.local
#     - w1.nblh.local
#   issuerRef:
#     group: cert-manager.io
#     kind: ClusterIssuer
#     name: selfsigned-cluster-issuer
#   secretName: kuard-tls
#   duration: 87600h
#   usages:
#   - digital signature
#   - key encipherment

```

- `kuard-deploy.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kuard
  namespace: test
spec:
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  selector:
    app: kuard
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kuard
  namespace: test
spec:
  selector:
    matchLabels:
      app: kuard
  replicas: 1
  template:
    metadata:
      labels:
        app: kuard
    spec:
      containers:
      - image: gcr.io/kuar-demo/kuard-amd64:blue
        imagePullPolicy: IfNotPresent
        name: kuard
        ports:
        - containerPort: 8080
```

- `kuard-ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kuard
  annotations:
    cert-manager.io/cluster-issuer: "cluster-ca-issuer"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - kuard.nblh.local
    - w1.nblh.local
    secretName: kuard-tls
  rules:
  - host: kuard.nblh.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kuard
            port:
              number: 80
```

应用清单文件创建证书：

```bash
kubectl apply -f kuard-deploy.yaml -f selfsigned-cert.yaml -f kuard-ingress.yaml
# 创建完成之后使用以下命令查看证书颁发状态，READY为True则表示已颁发
kubectl get certificate -A
NAMESPACE      NAME            READY   SECRET                 AGE
cert-manager   selfsigned-ca   True    selfsigned-ca-secret   9s
test           kuard-tls       True    kuard-tls              3s
```

导出证书文件安装到操作系统或者浏览器当中：

```bash
kubectl get secrets kuard-tls -ojsonpath='{.data.tls\.crt}'  | base64 -d > tls.crt
```

MacOS钥匙串中选择始终信任：

![image-20230919150606112](https://cdn.agou-ops.cn/others/image-20230919150606112.png)

打开浏览器直接访问，可以看到自签证书已经可以正常使用：

![image-20230919150747892](https://cdn.agou-ops.cn/others/image-20230919150747892.png)

## 直接签发

- `selfsigned-cert.yaml`

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: selfsigned-issuer
  namespace: test
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: selfsigned-cert
spec:
  dnsNames:
  - kuard.nblh.local
  secretName: selfsigned-cert-tls
  issuerRef:
    name: selfsigned-issuer
```

- `kuard-ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kuard
  annotations:
    cert-manager.io/issuer: "selfsigned-issuer"   # 与上面的issuer对应
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - kuard.nblh.local
    - w1.nblh.local
    secretName: selfsigned-cert-tls            # 与上面的secret对应
  rules:
  - host: kuard.nblh.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kuard
            port:
              number: 80
```

步骤和上面类似，就不在此赘述。
## 手动更新证书

```bash
kubectl edit certificate kuard-tls -n test
# 在spec字段下添加以下两行
  duration: 87600h # 10 years
  renewBefore: 720h # 30 days
# 保存并退出

# 删除原来的secret，让certmanager重新自动生成secret
kubectl get certificate kuard-tls -o=jsonpath='{.spec.secretName}' | xargs kubectl delete secret
```

## 参考链接

-  [SelfSigned - cert-manager Documentation](https://cert-manager.io/docs/configuration/selfsigned/)

