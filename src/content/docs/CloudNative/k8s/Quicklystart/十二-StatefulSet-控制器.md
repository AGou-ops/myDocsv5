---
title: 十二 StatefulSet 控制器
description: This is a document about 十二 StatefulSet 控制器.
---

# 十二 StatefulSet 控制器

StatefulSet 适用于有状态的应用，一般它管理的具有一下特点的 POD 资源

1.  稳定且唯一的网络标识符
2.  稳定且持久的存储
3.  有序、平滑的部署和扩展
4.  有序、平滑的终止和删除
5.  有序的滚动更新

一个典型的 StatefulSet 应用一般包含三个组件：

1.  headless service （无头 service）
2.  StatefulSet （控制器）
3.  volumeClaimTemplate（存储卷申请模板）



> 限制：
>
> - 给定 Pod 的存储必须由 [PersistentVolume 驱动](https://github.com/kubernetes/examples/tree/main/staging/persistent-volume-provisioning/README.md) 基于所请求的 `storage class` 来提供，或者由管理员预先提供。
> - 删除或者收缩 StatefulSet 并*不会*删除它关联的存储卷。 这样做是为了保证数据安全，它通常比自动清除 StatefulSet 所有相关的资源更有价值。
> - StatefulSet 当前需要[无头服务](https://kubernetes.io/zh/docs/concepts/services-networking/service/#headless-services) 来负责 Pod 的网络标识。你需要负责创建此服务。
> - 当删除 StatefulSets 时，StatefulSet 不提供任何终止 Pod 的保证。 为了实现 StatefulSet 中的 Pod 可以有序地且体面地终止，可以在删除之前将 StatefulSet 缩放为 0。
> - 在默认 [Pod 管理策略](https://kubernetes.io/zh/docs/concepts/workloads/controllers/statefulset/#pod-management-policies)(`OrderedReady`) 时使用 [滚动更新](https://kubernetes.io/zh/docs/concepts/workloads/controllers/statefulset/#rolling-updates)，可能进入需要[人工干预](https://kubernetes.io/zh/docs/concepts/workloads/controllers/statefulset/#forced-rollback) 才能修复的损坏状态。

## 12.1 清单格式

```yaml
podManagementPolicy    <string>      # 控制扩展时候的顺序策略
replicas	           <integer>     # 模板运行的副本数
revisionHistoryLimit   <integer>     # 更新历史最大保存数量
selector               <Object>      # 标签选择器
serviceName            <string>      # headless service 的名称，基于这个 service 为 POD 分配标识符
template               <Object>      # POD 对象模板，需要配置挂载存储卷，应该使用 PCV 类型
updateStrategy         <Object>      # StatefulSet 更新策略
volumeClaimTemplates   <[]Object>    # pvs 的列表
```

-   POD 关联使用 PVC 逻辑

每个 POD 中应该定义一个 PVC 类型的 volume ，这个 PVC 类型的 volume 应该关联到一个当前同一个名称空间的 PVC，这个 PVC 应该关联到集群级别的 PV 上。

statefullset 会为 POD 自动创建 PVC 类型的 Volume ，并且在 POD 所在的名称空间中自动创建 PVC。



在 StatefulSet 中，每一个 POD 的名字是固定且唯一的，即有序的数字来标识，例如：web-0 挂了，重建的 POD 还叫做 web-0。



访问 Service 时候的格式：$(servicename).$(namespace).svc.cluster.local，这个无头 Service 名字在解析时，解析为 POD 名称的别名。

headless 能保证，对 service 的访问能够解析为 POD IP，但是现在需要标识的是每个 POD 的名字，所以，只需要在 Service 前加上 POD 的名称即可。

例如：pod 名称为 web-0，服务名为：myapp，那么访问这个 POD 就使用

```bash
web-0.myapp.default.svc.cluster.local
```

## 12.2 创建 NFS PV

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-001
  labels:
    name: pv001
spec:
  accessModes:
    - ReadWriteMany
    - ReadWriteOnce
  capacity:
    storage: 5Gi
  nfs:
    path: /data/volumes/v1
    server: 172.16.100.104
---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-002
  labels:
    name: pv003
spec:
  accessModes:
    - ReadWriteMany
    - ReadWriteOnce
  capacity:
    storage: 5Gi
  nfs:
    path: /data/volumes/v2
    server: 172.16.100.104

---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-003
  labels:
    name: pv003
spec:
  accessModes:
    - ReadWriteMany
    - ReadWriteOnce
  capacity:
    storage: 5Gi
  nfs:
    path: /data/volumes/v3
    server: 172.16.100.104

---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-004
  labels:
    name: pv004
spec:
  accessModes:
    - ReadWriteMany
    - ReadWriteOnce
  capacity:
    storage: 10Gi
  nfs:
    path: /data/volumes/v4
    server: 172.16.100.104

---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-005
  labels:
    name: pv005
spec:
  accessModes:
    - ReadWriteMany
    - ReadWriteOnce
  capacity:
    storage: 10Gi
  nfs:
    path: /data/volumes/v5
    server: 172.16.100.104

```

## 12.3 创建 statefulSet

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  ports:
    - port: 80
      name: web
  clusterIP: None
  selector:
    app: myapp-pod

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: myapp
spec:
  serviceName: myapp
  replicas: 3
  selector:
    matchLabels:
      app: myapp-pod
  template:
    metadata:
      labels:
        app: myapp-pod
    spec:
      containers:
        - name: myapp
          image: ikubernetes/myapp:v1
          ports:
            - containerPort: 80
              name: web
          volumeMounts:
            - name: myappdata
              mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
    - metadata:
        name: myappdata
      spec:
        accessModes:
          - ReadWriteOnce
		# storageClassName: "my-storage-class"		# 使用sc
        resources:
          requests:
            storage: 5Gi
```

-   访问 pod

```bash
pod_name.service_name.ns_name.svc.cluster.local
```

## 12.4 扩容和升级

-   扩容和缩容

```bash
kubectl scale sts myapp --replicas=5
```

-   升级策略，kubectl explain sts.spec.updateStrategy.rollingUpdate.partition

```bash
可以实现金丝雀发布，首先仅仅更新大于等于多少的部分，然后更新大于 0 的，就可以全部更新了
kubectl patch sta myapp -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":4}}}}'
```

```bash
kubectl set image statefulset/myapp myapp=ikubernetes/myapp:v2kubectl 
```

```bash
 kubectl patch sta myapp -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":0}}}}'
```

## 参考链接

- Kubernetes docs -- statefulset: [https://kubernetes.io/zh/docs/concepts/workloads/controllers/statefulset/](https://kubernetes.io/zh/docs/concepts/workloads/controllers/statefulset/)
