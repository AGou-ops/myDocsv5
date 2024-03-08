---
title: k8s安装MinIO对象存储
description: This is a document about k8s安装MinIO对象存储.
---

# 单节点部署

## 参考文档

http://www.minio.org.cn/docs/minio/kubernetes/upstream/#quickstart-minio-for-kubernetes
## 部署minIO

创建资源

```
[root@k8s-master minio]# cat > minio.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: minio
  name: minio
  namespace: minio
spec:
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
      - name: minio
        image: quay.io/minio/minio:latest
        command:
        - /bin/bash
        - -c
        args: 
        - minio server /data --console-address :9090
        volumeMounts:
        - mountPath: /data
          name: localvolume
        ports:
        - containerPort: 9090
          name: console
        - containerPort: 9000
          name: api
      nodeSelector:
        kubernetes.io/hostname: k8s-master
      volumes:
      - name: localvolume
        hostPath:
          path: /data/minio
          type: DirectoryOrCreate
---
apiVersion: v1
kind: Service
metadata:
  name: minio-service
  namespace: minio
spec:
    type: NodePort 
    selector:     
      app: minio
    ports:
    - name: console
      port: 9090
      protocol: TCP
      targetPort: 9090
      nodePort: 30300
    - name: api
      port: 9000
      protocol: TCP
      targetPort: 9000
      nodePort: 30200
EOF
[root@k8s-master minio]# kubectl apply -f minio.yaml 
deployment.apps/minio created
service/minio-service created
```

使用NodePort方式访问web页面

```
[root@k8s-master minio]# kubectl get pod -n minio 
NAME                     READY   STATUS    RESTARTS   AGE
minio-86577f8755-l65mf   1/1     Running   0          11m
[root@k8s-master minio]# kubectl get svc -n minio 
NAME            TYPE       CLUSTER-IP       EXTERNAL-IP   PORT(S)                         AGE
minio-service   NodePort   10.102.223.132   <none>        9090:30300/TCP,9000:30200/TCP   10m
```

访问k8s节点ip:30300，默认用户名密码都是**minioadmin**
![image.png](https://cdn.agou-ops.cn/others/1681288151994-3eb8a828-d5d8-430b-a505-4beee56f8c3b.png)
使用ingress方式访问

```
[root@k8s-master minio]# cat minio-ingress.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: minio-console
  namespace: minio
spec:
  entryPoints:
  - web
  routes:
  - match: Host(`minio.test.com`) # 域名
    kind: Rule
    services:
      - name: minio-service  # 与svc的name一致
        port: 9090           # 与svc的port一致
---
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: minio-api
  namespace: minio
spec:
  entryPoints:
  - web
  routes:
  - match: Host(`minio-api.test.com`) # 域名
    kind: Rule
    services:
      - name: minio-service  # 与svc的name一致
        port: 9000           # 与svc的port一致
[root@k8s-master minio]# kubectl apply -f minio-ingress.yaml 
ingressroute.traefik.containo.us/minio-console created
ingressroute.traefik.containo.us/minio-api created
```

添加hosts记录`192.168.10.10 minio.test.com`访问域名即可

# 部署minIO集群

minIO集群方式部署使用operator或者helm均可。helm部署minIO参考文档：https://artifacthub.io/packages/helm/bitnami/minio。operator部署minIO参考文档：https://operator.min.io/，此处使用helm方式部署

## 集群角色规划

使用分布式方式部署高可用的minIO集群时，驱动器总数至少是4 个，以保证纠删码。我们可以在k8s-work1和k8s-work2上的data1和data2路径存放minIO数据，使用local pv方式持久化数据。

```
# 创建数据存放路径
[root@k8s-work1 ~]# mkdir -p /data1/minio
[root@k8s-work1 ~]# mkdir -p /data2/minio
[root@k8s-work2 ~]# mkdir -p /data1/minio
[root@k8s-work2 ~]# mkdir -p /data2/minio
```

## 下载helm包

```
[root@k8s-master ~]# helm repo add bitnami https://charts.bitnami.com/bitnami
[root@k8s-master ~]# helm pull bitnami/minio --untar 
[root@k8s-master ~]# cd minio
[root@k8s-master minio]# ls
Chart.lock  charts  Chart.yaml  README.md  templates  values.yaml
```

## 修改配置

添加storage-class模板配置：

```
[root@k8s-master minio]# cat > templates/storage-class.yaml << EOF
kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: minio-local-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
EOF
```

添加 pv模板配置

```
[root@k8s-master minio]# cat templates/pv.yaml
{{- $size := .Values.persistence.size -}}
{{- $accessModes := .Values.persistence.accessModes -}}
{{- $storageClass := .Values.persistence.storageClass -}}
{{- range .Values.persistence.local }}
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: {{ .name }}
spec:
  capacity:
    storage: {{ $size }}
  volumeMode: Filesystem
  accessModes: {{ $accessModes }}
  persistentVolumeReclaimPolicy: Delete
  storageClassName: {{ $storageClass }}
  local:
    path: {{ .path }}
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - {{ .host }}
--- 
{{- end }}
```

修改配置values.yaml

```
91  mode: distributed # 集群模式，单节点为standalone，分布式集群为distributed

185 statefulset:
203   replicaCount: 2 # 节点数
206   zones: 1 # 区域数，1个即可
209   drivesPerNode: 2 # 每个节点数据目录数.2节点×2目录组成4节点的mimio集群

594 service:
597   type: NodePort # 修改server类型为NodePort
608   nodePorts: # 指定NodePort端口号
609     api: "30900"
610     console: "30901"

886 persistence:
889   enabled: true
897   storageClass: "minio-local-storage"
900   mountPath: /data
903   accessModes:
904     - ReadWriteOnce
907   size: 10Gi
910   annotations: {}
913   existingClaim: ""
914   local:
915     - name: minio-pv-0
916       path: /data1/minio
917       host: k8s-work1
918     - name: minio-pv-1
919       path: /data2/minio
920       host: k8s-work1
921     - name: minio-pv-2
922       path: /data1/minio
923       host: k8s-work2
924     - name: minio-pv-3
925       path: /data2/minio
926       host: k8s-work2
```

## 部署minIO

```
[root@k8s-master minio]# kubectl create ns minio
[root@k8s-master minio]# helm install minio . -f values.yaml -n minio
NAME: minio
LAST DEPLOYED: Thu Apr 13 13:52:22 2023
NAMESPACE: minio
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
CHART NAME: minio
CHART VERSION: 12.2.4
APP VERSION: 2023.3.24

** Please be patient while the chart is being deployed **

MinIO&reg; can be accessed via port  on the following DNS name from within your cluster:

   minio.minio.svc.cluster.local

To get your credentials run:

   export ROOT_USER=$(kubectl get secret --namespace minio minio -o jsonpath="{.data.root-user}" | base64 -d)
   export ROOT_PASSWORD=$(kubectl get secret --namespace minio minio -o jsonpath="{.data.root-password}" | base64 -d)

To connect to your MinIO&reg; server using a client:

- Run a MinIO&reg; Client pod and append the desired command (e.g. 'admin info'):

   kubectl run --namespace minio minio-client \
     --rm --tty -i --restart='Never' \
     --env MINIO_SERVER_ROOT_USER=$ROOT_USER \
     --env MINIO_SERVER_ROOT_PASSWORD=$ROOT_PASSWORD \
     --env MINIO_SERVER_HOST=minio \
     --image docker.io/bitnami/minio-client:2023.3.23-debian-11-r0 -- admin info minio

To access the MinIO&reg; web UI:

- Get the MinIO&reg; URL:

   export NODE_PORT=$(kubectl get --namespace minio -o jsonpath="{.spec.ports[0].nodePort}" services minio)
   export NODE_IP=$(kubectl get nodes --namespace minio -o jsonpath="{.items[0].status.addresses[0].address}")
   echo "MinIO&reg; web URL: http://$NODE_IP:$NODE_PORT/minio"
```

## 查看资源信息

```
[root@k8s-master minio]# kubectl get pod -n minio
NAME      READY   STATUS    RESTARTS   AGE
minio-0   1/1     Running   0          24m
minio-1   1/1     Running   0          24m
[root@k8s-master minio]# kubectl get all -n minio 
NAME          READY   STATUS    RESTARTS   AGE
pod/minio-0   1/1     Running   0          25m
pod/minio-1   1/1     Running   0          25m

NAME                     TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                         AGE
service/minio            NodePort    10.100.230.196   <none>        9000:30900/TCP,9001:30901/TCP   25m
service/minio-headless   ClusterIP   None             <none>        9000/TCP,9001/TCP               25m

NAME                     READY   AGE
statefulset.apps/minio   2/2     25m
[root@k8s-master minio]# kubectl get pvc -n minio 
NAME             STATUS   VOLUME       CAPACITY   ACCESS MODES   STORAGECLASS          AGE
data-0-minio-0   Bound    minio-pv-3   10Gi       RWO            minio-local-storage   25m
data-0-minio-1   Bound    minio-pv-0   10Gi       RWO            minio-local-storage   25m
data-1-minio-0   Bound    minio-pv-2   10Gi       RWO            minio-local-storage   25m
data-1-minio-1   Bound    minio-pv-1   10Gi       RWO            minio-local-storage   25m
[root@k8s-master minio]# kubectl get pv -n minio 
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                               STORAGECLASS          REASON   AGE
minio-pv-0                                 10Gi       RWO            Delete           Bound    minio/data-0-minio-1                minio-local-storage            25m
minio-pv-1                                 10Gi       RWO            Delete           Bound    minio/data-1-minio-1                minio-local-storage            25m
minio-pv-2                                 10Gi       RWO            Delete           Bound    minio/data-1-minio-0                minio-local-storage            25m
minio-pv-3                                 10Gi       RWO            Delete           Bound    minio/data-0-minio-0                minio-local-storage            25m
```

## 创建ingress资源

以ingrss-nginx为例：

```
# cat > ingress.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minio-ingreess
  namespace: minio
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: minio.local.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: minio
            port:
              number: 9001
EOF
```

以traefik为例：

```
[root@k8s-master minio]# cat ingress.yaml 
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: minio-console
  namespace: minio
spec:
  entryPoints:
  - web
  routes:
  - match: Host(`minio.local.com`) # 域名
    kind: Rule
    services:
      - name: minio  # 与svc的name一致
        port: 9001      # 与svc的port一致
---
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: minio-api
  namespace: minio
spec:
  entryPoints:
  - web
  routes:
  - match: Host(`minio-api.local.com`) # 域名
    kind: Rule
    services:
      - name: minio  # 与svc的name一致
        port: 9000      # 与svc的port一致
[root@k8s-master minio]# kubectl apply -f ingress.yaml 
ingressroute.traefik.containo.us/minio-console created
ingressroute.traefik.containo.us/minio-api created
```

## 访问测试

```
# 获取用户名和密码
[root@k8s-master minio]# kubectl get secret --namespace minio minio -o jsonpath="{.data.root-user}" | base64 -d
admin[root@k8s-master minio]# 
[root@k8s-master minio]# kubectl get secret --namespace minio minio -o jsonpath="{.data.root-password}" | base64 -d
WtAbQDQITX[root@k8s-master minio]# 
```

## 访问web管理页

![image.png](https://cdn.agou-ops.cn/others/1692006006827-dc9b1c7c-7eb9-48eb-824a-3f2037923024.png)

# minIO使用

## 创建bucket

![image.png](https://cdn.agou-ops.cn/others/1681288250619-9e71b807-95a6-428d-84bd-c2ee3ba7e451.png)
![image.png](https://cdn.agou-ops.cn/others/1681288331888-6b91729a-67c0-4675-a628-5bcd6260f7ad.png)
![image.png](https://cdn.agou-ops.cn/others/1681288347417-c7c79085-cd11-48f4-97f1-34ba97cb8e78.png)

## 创建Access Keys

![image.png](https://cdn.agou-ops.cn/others/1681288392924-8647ad8a-64c2-4e23-b609-dfdb6333f403.png)

## 创建访问控制权限

Minio 的存储桶默认是不跟任何 Acess Key 关联的，不过由于 Minio 支持标准的 S3 协议，我们可以给 Access Key 授予某个 Bucket 存储桶的访问权限，实现 Key 和 Bucket 的绑定。
创建policy
![image.png](https://cdn.agou-ops.cn/others/1689994620680-5022ac1d-e950-40f5-98ba-0512c9e40f9a.png)

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListAllMyBuckets",
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::es-backup/*"
            ]
        }
    ]
}
```

创建user
这里 Access Key 是用户名，Access Secret 是对应的口令。设置时关联上刚才创建的 Policy 即可。
![image.png](https://cdn.agou-ops.cn/others/1689994774057-67d85be0-91d3-4e67-a42c-e0f12d09c89c.png)
我们就创建了一个新的存储桶，并且给这个存储桶设置了一个用户，同时授权了用户对存储桶的访问，包括列表、上传、下载这几个基本权限。

# mc客户端使用

MinIO Client (mc)为ls，cat，cp，mirror，diff，find等UNIX命令提供了一种替代方案。它支持文件系统和兼容Amazon S3的云存储服务（AWS Signature v2和v4）。

## 安装mc客户端（Linux二进制文件）

```
[root@k8s-master minio]# curl https://dl.min.io/client/mc/release/linux-amd64/mc --create-dirs -o /usr/local/minio-binaries/mc
[root@k8s-master local]# cd /usr/local/minio-binaries
[root@k8s-master minio-binaries]# ls
mc
[root@k8s-master minio-binaries]# chmod +x mc 
[root@k8s-master minio-binaries]# ./mc --help
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── (q)uit/esc
NAME:                                                                              
  mc - MinIO Client for object storage and filesystems.                            

USAGE:                                                                             
  mc [FLAGS] COMMAND [COMMAND FLAGS | -h] [ARGUMENTS...]
# 添加环境变量
[root@k8s-master minio-binaries]# cat /etc/profile
export PATH="$PATH:/usr/local/minio-binaries"
[root@k8s-master minio-binaries]# source /etc/profile
[root@k8s-master minio-binaries]# mc --help
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── (q)uit/esc
  mc [FLAGS] COMMAND [COMMAND FLAGS | -h] [ARGUMENTS...]
```

## 安装mc客户端（docker）

```
[root@tiaoban ~]# docker run -it --rm minio/mc ls play
mc: Configuration written to `/root/.mc/config.json`. Please update your access credentials.
mc: Successfully created `/root/.mc/share`.
mc: Initialized share uploads `/root/.mc/share/uploads.json` file.
mc: Initialized share downloads `/root/.mc/share/downloads.json` file.
[2023-04-13 01:39:27 UTC]     0B 64375d4bed2b146c15d5383f-files/
[2023-03-15 11:55:17 UTC]     0B abc/
[2023-03-31 18:46:54 UTC]     0B awdkenny/
```

## mc客户端常用命令

| 命令    | 功能                                            |
| ------- | ----------------------------------------------- |
| ls      | 列出文件和文件夹。                              |
| mb      | 创建一个存储桶或一个文件夹。                    |
| cat     | 显示文件和对象内容。                            |
| pipe    | 将一个STDIN重定向到一个对象或者文件或者STDOUT。 |
| share   | 生成用于共享的URL。                             |
| cp      | 拷贝文件和对象。                                |
| mirror  | 给存储桶和文件夹做镜像。                        |
| find    | 基于参数查找文件。                              |
| diff    | 对两个文件夹或者存储桶比较差异。                |
| rm      | 删除文件和对象。                                |
| events  | 管理对象通知。                                  |
| watch   | 监视文件和对象的事件。                          |
| policy  | 管理访问策略。                                  |
| config  | 管理mc配置文件。                                |
| update  | 检查软件更新。                                  |
| version | 输出版本信息。                                  |

## mc连接minIO服务

```
# 添加对象存储服务
[root@k8s-master minio-binaries]# mc alias set k8s-minio http://10.102.223.132:9000 minioadmin minioadmin
Added `k8s-minio` successfully.
[root@k8s-master minio-binaries]# mc admin info k8s-minio
●  10.102.223.132:9000
   Uptime: 41 minutes 
   Version: 2023-04-07T05:28:58Z
   Network: 1/1 OK 
   Drives: 1/1 OK 
   Pool: 1

Pools:
   1st, Erasure sets: 1, Drives per erasure set: 1

12 MiB Used, 1 Bucket, 2 Objects
1 drive online, 0 drives offline
```

## bucket操作

```
# 创建bucket
[root@k8s-master ~]# mc mb k8s-minio/test
Bucket created successfully `k8s-minio/test`.
# 查看bucket
[root@k8s-master ~]# mc ls k8s-minio
[2023-04-13 10:02:02 CST]     0B test/

# 删除没有文件的bucket
[root@k8s-master ~]# mc rb k8s-minio/demo
# 删除有文件的bucket
[root@k8s-master ~]# mc rb k8s-minio/test --force
```

## 上传下载操作

```
# 上传文件到bucket
[root@k8s-master ~]# mc cp /etc/hosts k8s-minio/test
/etc/hosts:                   2.09 KiB / 2.09 KiB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 60.07 KiB/s 0s[root@k8s-master ~]# mc cp /etc/yum.repos.d k8s-minio/test
# 上传目录到bucket
[root@k8s-master ~]# mc cp /etc/yum.repos.d k8s-minio/test --recursive
...m.repos.d/kubernetes.repo: 19.46 KiB / 19.46 KiB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 121.99 KiB/s 0s

# 下载bucket文件到本地
[root@k8s-master ~]# mkdir /tmp/download
[root@k8s-master ~]# mc cp k8s-minio/test/hosts /tmp/download/
...2.223.132:9000/test/hosts: 2.09 KiB / 2.09 KiB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 66.18 KiB/s 0s[root@k8s-master ~]# ls /tmp/download/
hosts
[root@k8s-master ~]# cat /tmp/download/hosts 
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
# 下载bucket目录到本地
[root@k8s-master ~]# mc cp k8s-minio/test/yum.repos.d /tmp/download/ --recursive
...m.repos.d/kubernetes.repo: 19.46 KiB / 19.46 KiB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 87.10 KiB/s 0s[root@k8s-master ~]# ls /tmp/download/yum.repos.d/
docker-ce.repo     epel-testing-modular.repo  Rocky-AppStream.repo
```

## 文件操作

```
# 查看bucket文件列表
[root@k8s-master ~]# mc ls k8s-minio/test
[2023-04-13 10:04:59 CST] 2.1KiB STANDARD hosts
[2023-04-13 10:10:42 CST]     0B yum.repos.d/
# 查看bucket目录内容
[root@k8s-master ~]# mc ls k8s-minio/test/yum.repos.d
[2023-04-13 10:05:34 CST]   710B STANDARD Rocky-AppStream.repo
[2023-04-13 10:05:34 CST]   695B STANDARD Rocky-BaseOS.repo
[2023-04-13 10:05:34 CST] 1.7KiB STANDARD Rocky-Debuginfo.repo
[2023-04-13 10:05:34 CST]   360B STANDARD Rocky-Devel.repo
# 查看bucket文件内容
[root@k8s-master ~]# mc cat k8s-minio/test/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6

# 删除文件
[root@k8s-master ~]# mc rm k8s-minio/test/hosts
Removed `k8s-minio/test/hosts`.
# 删除目录
[root@k8s-master ~]# mc rm k8s-minio/test/yum.repos.d --recursive --force
Removed `k8s-minio/test/yum.repos.d/Rocky-AppStream.repo`.
Removed `k8s-minio/test/yum.repos.d/Rocky-BaseOS.repo`.
Removed `k8s-minio/test/yum.repos.d/Rocky-Debuginfo.repo`.
Removed `k8s-minio/test/yum.repos.d/Rocky-Devel.repo`.
```

# curl客户端使用

## 上传文件

上传文件脚本，按实际情况修改host、s3_key、s3_secret和-x

```
[root@tiaoban ~]# cat push.sh 
#!/bin/bash
export PATH=$PATH:/bin:/usr/bin:/usr/local/bin
if [ $# != 2 ] ; then 
echo "Usage: `basename $0` my-bucket my-file.zip" >&2
exit 1
fi
bucket=$1
file=$2
host=minio-api.test.com
s3_key=GfuHooI5byVpGf2RGwl3
s3_secret=YpYqXKKhI4bNUmWWULa3qf5n5WPq3TDedb1uzREc
resource="/${bucket}/${file}"
content_type="application/zstd"
date=`date -R`
_signature="PUT\n\n${content_type}\n${date}\n${resource}"
signature=`echo -en ${_signature} | openssl sha1 -hmac ${s3_secret} -binary | base64`

curl -v -X PUT -T "${file}" \
          -H "Host: ${host}" \
          -x "192.168.10.10:80" \
          -H "Date: ${date}" \
          -H "Content-Type: ${content_type}" \
          -H "Authorization: AWS ${s3_key}:${signature}" \
          http://${host}${resource}
```

上传文件

```
[root@tiaoban ~]# ls
anaconda-ks.cfg  cfssl  defaults.ini  es  go  push.sh
[root@tiaoban ~]# ./push.sh test defaults.ini 
*   Trying 192.168.10.10...
* TCP_NODELAY set
* Connected to 192.168.10.10 (192.168.10.10) port 80 (#0)
> PUT http://minio-api.test.com/test/defaults.ini HTTP/1.1
> Host: minio-api.test.com
> User-Agent: curl/7.61.1
> Accept: */*
> Proxy-Connection: Keep-Alive
> Date: Sat, 06 May 2023 10:10:07 +0800
> Content-Type: application/zstd
> Authorization: AWS bhUsp7nwc6XNPzoI:w2ddmcsQWOijC2BZJSGE4u7DgFc=
> Content-Length: 55875
> Expect: 100-continue
> 
< HTTP/1.1 100 Continue
* We are completely uploaded and fine
< HTTP/1.1 200 OK
< Accept-Ranges: bytes
< Content-Length: 0
< Content-Security-Policy: block-all-mixed-content
< Date: Sat, 06 May 2023 02:10:07 GMT
< Etag: "1b0bdd8f4c5f31ef5661380efcaefce5"
< Server: MinIO
< Strict-Transport-Security: max-age=31536000; includeSubDomains
< Vary: Origin
< Vary: Accept-Encoding
< X-Amz-Id-2: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
< X-Amz-Request-Id: 175C6BE8ACF79B53
< X-Content-Type-Options: nosniff
< X-Xss-Protection: 1; mode=block
< 
* Connection #0 to host 192.168.10.10 left intact
```

查看bucket文件
![image.png](https://cdn.agou-ops.cn/others/1683339253090-6b00229f-cf94-4f0f-a62f-9d52bf38cc6d.png)

## 下载文件

下载文件脚本

```
#!/usr/bin/env sh
if [ $# != 3 ] ; then 
echo "Usage: `basename $0` my-bucket minio-filename localfile" >&2
echo "Usage: `basename $0` test-bucket 1.log /tmp/1.log" >&2
exit 1
fi
# User Minio Vars
host=minio-api.test.com
s3_key=bhUsp7nwc6XNPzoI
s3_secret=w3KBPxMZ5Nw4apRGZY3uAHON7bkkKprP
BUCKET=$1
MINIO_PATH="/${BUCKET}/$2"
OUT_FILE=$3
# Static Vars
DATE=$(date -R)
CONTENT_TYPE='application/zstd'
SIG_STRING="GET\n\n${CONTENT_TYPE}\n${DATE}\n${MINIO_PATH}"
SIGNATURE=`echo -en ${SIG_STRING} | openssl sha1 -hmac ${s3_secret} -binary | base64`

curl -v -o "${OUT_FILE}" \
    -x "192.168.10.10:80" \
    -H "Host: $host" \
    -H "Date: ${DATE}" \
    -H "Content-Type: ${CONTENT_TYPE}" \
    -H "Authorization: AWS ${s3_key}:${SIGNATURE}" \
    http://$URL${MINIO_PATH}
```

下载文件

```
[root@tiaoban ~]# ./pull.sh test defaults.ini /tmp/defaults.ini
*   Trying 192.168.10.10...
* TCP_NODELAY set
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0* Connected to 192.168.10.10 (192.168.10.10) port 80 (#0)
> GET http://minio-api.test.com/test/defaults.ini HTTP/1.1
> Host: minio-api.test.com
> User-Agent: curl/7.61.1
> Accept: */*
> Proxy-Connection: Keep-Alive
> Date: Sat, 06 May 2023 10:17:18 +0800
> Content-Type: application/zstd
> Authorization: AWS bhUsp7nwc6XNPzoI:sl8feCFiJC4MpaKSKrGU9HlDMLw=
> 
< HTTP/1.1 200 OK
< Accept-Ranges: bytes
< Content-Length: 55875
< Content-Security-Policy: block-all-mixed-content
< Content-Type: application/zstd
< Date: Sat, 06 May 2023 02:17:18 GMT
< Etag: "1b0bdd8f4c5f31ef5661380efcaefce5"
< Last-Modified: Sat, 06 May 2023 02:10:07 GMT
< Server: MinIO
< Strict-Transport-Security: max-age=31536000; includeSubDomains
< Vary: Origin
< Vary: Accept-Encoding
< X-Amz-Id-2: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
< X-Amz-Request-Id: 175C6C4CF3EB56C4
< X-Content-Type-Options: nosniff
< X-Xss-Protection: 1; mode=block
< 
{ [3529 bytes data]
100 55875  100 55875    0     0  1474k      0 --:--:-- --:--:-- --:--:-- 1515k
* Connection #0 to host 192.168.10.10 left intact
[root@tiaoban ~]# ls -lh /tmp/defaults.ini 
-rw-r--r-- 1 root root 55K 5月   6 10:17 /tmp/defaults.ini
```
> 该文章来源于网络，仅做个人备份.