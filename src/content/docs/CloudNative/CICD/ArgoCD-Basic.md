---
title: ArgoCD Basic
description: This is a document about ArgoCD Basic.
---

## 简介
> Argo CD 是以 Kubernetes 作为基础设施，遵循声明式 GitOps 理念的持续交付（continuous delivery, CD）工具，支持多种配置管理工具，包括 ksonnet/jsonnet、kustomize 和 Helm 等。它的配置和使用非常简单，并且自带一个简单易用的可视化界面。
>
>按照官方定义，Argo CD 被实现为一个 Kubernetes 控制器，它会持续监控正在运行的应用，并将当前的实际状态与 Git 仓库中声明的期望状态进行比较，如果实际状态不符合期望状态，就会更新应用的实际状态以匹配期望状态。

## 部署到k8s
### 使用helm chart
```bash
$ helm repo add argo https://argoproj.github.io/argo-helm

$ helm install argocd argo/argo-cd -n argocd ----create-namespace argocd

```
部署完之后可以配置一个nginx ingress进行外部访问：
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-argo
  namespace: argo
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  rules:
  - host: argocd.nblh.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 443
  ingressClassName: nginx
---
```
这样就可以通过域名加Nodeport的方式进行访问.
### 使用yaml
```bash
kubectl create namespace argocd kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```
## argocd CLI
argocd CLI是argocd的命令行工具.
### 安装
```bash
# macos 下使用brew安装
brew install argocd
```
其他平台可以从[Release v2.8.4 · argoproj/argo-cd · GitHub](https://github.com/argoproj/argo-cd/releases/latest)这里进行下载.
### 登录
登录到argocd server：
```bash
# 后面的地址是nginx ingress的地址
argocd login argocd.nblh.local:37332
# 随后允许不安全的证书，输入账号密码即可
```
登录完之后会生成一个配置文件，配置文件路径为:
```bash
❯ cat ~/.config/argocd/config
───────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
       │ File: /Users/agou-ops/.config/argocd/config
───────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   1   │ contexts:
   2   │ - name: argocd.nblh.local:37332
   3   │   server: argocd.nblh.local:37332
   4   │   user: argocd.nblh.local:37332
   5   │ current-context: argocd.nblh.local:37332
   6   │ servers:
   7   │ - grpc-web-root-path: ""
   8   │   insecure: true
   9   │   server: argocd.nblh.local:37332
  10   │ users:
  11   │ - auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcmdvY2QiLCJzdWIiOiJhZG1pbjpsb2dpbiIsImV4cCI6MTY5NDc0MzU3OCwibmJmIjoxNjk0NjU3MTc4LCJpYXQiOjE2OTQ2NTcx
       │ NzgsImp0aSI6ImNkMDhmYTgzLTQ3MDEtNDdjNC05YzI2LWExNDZhZmQ0YzJiYiJ9.i_VhZYmI5AaqWn0e7YE3F_OeLrj-xmhB6ZeAmiINpTM
  12   │   name: argocd.nblh.local:37332
───────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

```
### 常用命令
```bash
# 列举所有应用
$ argocd app list

# 查看应用状态
$ argocd app get dubbo-sample
# output
Name:               argo/dubbo-sample
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          dubbo
URL:                https://argocd.nblh.local:37332/applications/dubbo-sample
Repo:               http://git.nblh.local/devops/sample-project.git
Target:             gitops
Path:               1-basic/dubbo-samples-spring-boot/helm-chart
Helm Values:        values.yaml
SyncWindow:         Sync Allowed
Sync Policy:        Automated
Sync Status:        OutOfSync from gitops (bb71241)
Health Status:      Healthy

GROUP  KIND        NAMESPACE  NAME               STATUS     HEALTH   HOOK  MESSAGE
apps   Deployment  dubbo      dubbo-admin-16     OutOfSync  Healthy        ignored (requires pruning)
apps   Deployment  dubbo      dubbo-consumer-16  OutOfSync  Healthy        ignored (requires pruning)
apps   Deployment  dubbo      dubbo-provider-16  OutOfSync  Healthy        ignored (requires pruning)
apps   Deployment  dubbo      dubbo-admin-17     Synced     Healthy        deployment.apps/dubbo-admin-17 created
apps   Deployment  dubbo      dubbo-consumer-17  Synced     Healthy        deployment.apps/dubbo-consumer-17 created
apps   Deployment  dubbo      dubbo-provider-17  Synced     Healthy        deployment.apps/dubbo-provider-17 created
# 从上面输出可以看到应用目前处于OutofSync，可以使用一下命令同步应用，ApplyOutOfSyncOnly仅同步outsync
$ argocd app sync dubbo-sample --sync-option ApplyOutOfSyncOnly=true
# output
# 输出太长就不放了，可以通过上面的argocd app get 命令查看同步结果
```
### 使用示例
#### 使用清单文件
示例清单文件：
```yaml
# application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-argo-application
  namespace: argocd
spec:
  project: default

  source:
    repoURL: https://github.com/USER/REPO.git
    targetRevision: HEAD
    path: dev
  destination: 
    server: https://kubernetes.default.svc
    namespace: myapp

  syncPolicy:
    syncOptions:
    - CreateNamespace=true

    automated:
      selfHeal: true
      prune: true
```
参数解释：
>
>- **syncPolicy** : 指定自动同步策略和频率，不配置时需要手动触发同步。
  >  
>- **syncOptions** : 定义同步方式。
    >
    - **CreateNamespace=true** : 如果不存在这个 namespace，就会自动创建它。
>- **automated** : 检测到实际状态与期望状态不一致时，采取的同步措施。
>    
    - **selfHeal** : 当集群世纪状态不符合期望状态时，自动同步。
    - **prune** : 自动同步时，删除 Git 中不存在的资源。
>
>Argo CD 默认情况下**每 3 分钟**会检测 Git 仓库一次，用于判断应用实际状态是否和 Git 中声明的期望状态一致，如果不一致，状态就转换为 `OutOfSync`。默认情况下并不会触发更新，除非通过 `syncPolicy` 配置了自动同步。
>
> 如果嫌周期性同步太慢了，也可以通过设置 Webhook 来使 Git 仓库更新时立即触发同步。具体的使用方式会放到后续的教程中，本文不再赘述。


仓库dev路径下：
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  selector:
    matchLabels:
      app: myapp
  replicas: 2
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: nginx:latest
        ports:
        - containerPort: 80
        
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
```
最后创建application即可：
```bash
kubectl apply -f application.yaml
```
打开argocd的web页面可以看到新创建的应用。
#### 使用argocd客户端工具
```bash
kubectl config set-context --current --namespace=argocd
argocd app create guestbook --repo https://github.com/argoproj/argocd-example-apps.git --path guestbook --dest-server https://kubernetes.default.svc --dest-namespace default
```
## 参考链接
- [Command Reference - Argo CD - Declarative GitOps CD for Kubernetes](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd/)
- [Getting Started - Argo CD - Declarative GitOps CD for Kubernetes](https://argo-cd.readthedocs.io/en/stable/getting_started/)
- [Sync Options - Argo CD - Declarative GitOps CD for Kubernetes](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- [Argo CD 入门教程 – 云原生实验室 - Kubernetes|Docker|Istio|Envoy|Hugo|Golang|云原生](https://icloudnative.io/posts/getting-started-with-argocd/)