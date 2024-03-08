---
title: k8s安装Apollo配置中心
description: This is a document about k8s安装Apollo配置中心.
---

## 简介

> Apollo（阿波罗）是一款可靠的分布式配置管理中心，诞生于携程框架研发部，能够集中化管理应用不同环境、不同集群的配置，配置修改后能够实时推送到应用端，并且具备规范的权限、流程治理等特性，适用于微服务配置管理场景。
>
> Apollo支持4个维度管理Key-Value格式的配置：
>
> 1. application (应用)
> 2. environment (环境)
> 3. cluster (集群)
> 4. namespace (命名空间)
>
> 同时，Apollo基于开源模式开发，开源地址：https://github.com/ctripcorp/apollo

<!--more-->

## 建库及修改配置项

Apollo服务端共需要两个数据库：`ApolloPortalDB`和`ApolloConfigDB`.

分别下载[apolloportaldb.sql](https://github.com/apolloconfig/apollo/blob/master/scripts/sql/apolloportaldb.sql)和[apolloconfigdb.sql](https://github.com/apolloconfig/apollo/blob/master/scripts/sql/apolloconfigdb.sql)，并导入到MySQL当主（注意该SQL已经包含建库语句，所以不需要提前建库，直接source即可）：

```sql
mysql> source /path/to/apolloportaldb.sql;
mysql> source /path/to/apolloconfigdb.sql;
-- 修改默认的eureka服务地址
mysql> update `ApolloConfigDB`.`ServerConfig` set Value="http://apollo-config-svc.apollo:8080/eureka/" where Id=1;
-- 其他修改项 。。。
```

## yaml配置

- `apollo-config-secret.yaml`文件内容：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: apollo-config-secret
  namespace: apollo
type: Opaque
data:
  SPRING_DATASOURCE_URL: amRiYzpteXNxbDovL215c3FsLTAubXlzcWwtc3ZjLmRlZmF1bHQ6MzMwNi9BcG9sbG9Db25maWdEQj9jaGFyYWN0ZXJFbmNvZGluZz11dGY4    # 数据库的jdbc地址，比如我的是jdbc:mysql://mysql-0.mysql-svc.default:3306/ApolloConfigDB?characterEncoding=utf8%，base64加密
  SPRING_DATASOURCE_USERNAME: cm9vdA==		# 数据库账号
  SPRING_DATASOURCE_PASSWORD: ""   # 数据库密码
```

- `apollo-portal-secret.yaml`文件内容：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: apollo-portal-secret
  namespace: apollo
type: Opaque
data:
  SPRING_DATASOURCE_URL: amRiYzpteXNxbDovL215c3FsLTAubXlzcWwtc3ZjLmRlZmF1bHQ6MzMwNi9BcG9sbG9Qb3J0YWxEQj9jaGFyYWN0ZXJFbmNvZGluZz11dGY4
  SPRING_DATASOURCE_USERNAME: cm9vdA==
  SPRING_DATASOURCE_PASSWORD: ""
  APOLLO_PORTAL_ENVS: ZGV2   # 环境信息
  DEV_META: aHR0cDovL2Fwb2xsby1jb25maWctc3ZjLmFwb2xsbzo4MDgw  # apollo服务地址，比如我的是http://apollo-config-svc.apollo:8080%，base64加密
```

- `apollo-config.yaml`文件内容：

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    appName: apollo
    workloadKind: Deployment
    workloadName: apollo-config
  name: apollo-config-svc
  namespace: apollo
spec:
  ports:
  - name: apollo-config-port
    port: 8080
    protocol: TCP
    targetPort: 8080
  selector:
    name: apollo-config
  type: NodePort
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    appName: apollo
  name: apollo-config
  namespace: apollo
spec:
  replicas: 1
  selector:
    matchLabels:
      name: apollo-config
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: apollo
        name: apollo-config
    spec:
      containers:
      - name: apollo-config
        envFrom:
        - prefix: ''
          secretRef:
            name: apollo-config-secret
        image: apolloconfig/apollo-configservice:2.1.0
        imagePullPolicy: IfNotPresent

        resources:
          limits:
            cpu: "4"
            memory: 4Gi
          requests:
            cpu: 100m
            memory: 128Mi
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
        volumeMounts:
        - mountPath: /etc/localtime
          name: localtime
          readOnly: true
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      volumes:
      - hostPath:
          path: /etc/localtime
          type: ""
        name: localtime
```

- `apollo-admin.yaml`文件内容：

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    appName: apollo
    workloadKind: Deployment
    workloadName: apollo-admin
  name: apollo-admin-svc
  namespace: apollo
spec:
  ports:
  - name: apollo-admin-port
    port: 8090
    protocol: TCP
    targetPort: 8090
  selector:
    name: apollo-admin
  type: NodePort
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    appName: apollo
  name: apollo-admin
  namespace: apollo
spec:
  replicas: 1
  selector:
    matchLabels:
      name: apollo-admin
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: apollo
        name: apollo-admin
    spec:
      containers:
      - name: apollo-admin
        envFrom:
        - prefix: ''
          secretRef:
            name: apollo-config-secret
        image: apolloconfig/apollo-adminservice:2.1.0
        imagePullPolicy: IfNotPresent
        resources:
          limits:
            cpu: "4"
            memory: 4Gi
          requests:
            cpu: 100m
            memory: 128Mi
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
        volumeMounts:
        - mountPath: /etc/localtime
          name: localtime
          readOnly: true
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      volumes:
      - hostPath:
          path: /etc/localtime
          type: ""
        name: localtime
```

- `apollo-portal.yaml`文件内容：

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    appName: apollo
    workloadKind: Deployment
    workloadName: apollo-portal
  name: apollo-portal-svc
  namespace: apollo
spec:
  ports:
  - name: apollo-portal-port
    port: 8070
    protocol: TCP
    targetPort: 8070
  selector:
    name: apollo-portal
  type: NodePort
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    appName: apollo
  name: apollo-portal
  namespace: apollo
spec:
  replicas: 1
  selector:
    matchLabels:
      name: apollo-portal
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: apollo
        name: apollo-portal
    spec:
      containers:
      - name: apollo-portal
        envFrom:
        - prefix: ''
          secretRef:
            name: apollo-portal-secret
        image: apolloconfig/apollo-portal:2.1.0
        imagePullPolicy: Always
        resources:
          limits:
            cpu: "4"
            memory: 4Gi
          requests:
            cpu: 100m
            memory: 128Mi
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
        volumeMounts:
        - mountPath: /etc/localtime
          name: localtime
          readOnly: true
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      volumes:
      - hostPath:
          path: /etc/localtime
          type: ""
        name: localtime
```

最后应用配置文件即可：

```bash
kubectl apply -f apollo-config-secret.yaml -f apollo-portal-secret.yaml
# 启动Apollo服务时最好依次启动, config --> admin --> portal
kubectl apply -f apollo-config.yaml
kubectl apply -f apollo-admin.yaml
kubectl apply -f apollo-portal.yaml
```

## 检查部署状态

获取pod和svc：

![image-20230911143908435](https://cdn.agou-ops.cn/others/image-20230911143908435.png)

打开`apollo-config`查看服务注册状态，比如我的是：http://<NODE_IP>:38623

![image-20230911144103703](/Users/agou-ops/Library/Application Support/typora-user-images/image-20230911144103703.png)

打开`apollo-portal`，使用默认的`apollo/admin`账户进行登录：

![image-20230911144201659](https://cdn.agou-ops.cn/others/image-20230911144201659.png)

Done.

## 附录-mysql主从

```yaml
# apiVersion: v1
# kind: Namespace
# metadata:
#   name: mysql
# ---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-cm
  labels:
    app: mysql
    app.kubernetes.io/name: mysql
data:
  primary.cnf: |
    [mysqld]
    log-bin
  replica.cnf: |
    [mysqld]
    super-read-only
---
# https://kubernetes.io/docs/concepts/services-networking/service/
apiVersion: v1
kind: Service
metadata:
  name: mysql-svc
  labels:
    app: mysql
    app.kubernetes.io/name: mysql
spec:
  selector:
    app: mysql
  ports:
  - name: mysql
    protocol: TCP
    port: 3306
  clusterIP: None
---
# https://kubernetes.io/docs/concepts/services-networking/service/
apiVersion: v1
kind: Service
metadata:
  name: mysql-read-svc
  labels:
    app: mysql
    app.kubernetes.io/name: mysql
    readOnly: "true"
spec:
  selector:
    app: mysql
    app.kubernetes.io/name: mysql
  ports:
  - name: mysql
    protocol: TCP
    port: 3306
  clusterIP: None
---
# https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  selector:
    matchLabels:
      app: mysql
  serviceName: "mysql-svc"
  replicas: 1
  template:
    metadata:
      labels:
        app: mysql
        app.kubernetes.io/name: mysql
    spec:
      initContainers:
        - name: init-mysql
          image: mysql:5.7.43
          command:
            - bash
            - "-c"
            - |
              set -ex
              # 基于 Pod 序号生成 MySQL 服务器的 ID。
              [[ $HOSTNAME =~ -([0-9]+)$ ]] || exit 1
              ordinal=${BASH_REMATCH[1]}
              echo [mysqld] > /mnt/conf.d/server-id.cnf
              # 添加偏移量以避免使用 server-id=0 这一保留值。
              echo server-id=$((100 + $ordinal)) >> /mnt/conf.d/server-id.cnf
              # 将合适的 conf.d 文件从 config-map 复制到 emptyDir。
              if [[ $ordinal -eq 0 ]]; then
                cp /mnt/config-map/primary.cnf /mnt/conf.d/
              else
                cp /mnt/config-map/replica.cnf /mnt/conf.d/
              fi
          volumeMounts:
            - name: conf
              mountPath: /mnt/conf.d
            - name: config-map
              mountPath: /mnt/config-map
        - name: clone-mysql
          image: ist0ne/xtrabackup:1.0
          command:
            - bash
            - "-c"
            - |
              set -ex
              # 如果已有数据，则跳过克隆。
              [[ -d /var/lib/mysql/mysql ]] && exit 0
              # 跳过主实例（序号索引 0）的克隆。
              [[ `hostname` =~ -([0-9]+)$ ]] || exit 1
              ordinal=${BASH_REMATCH[1]}
              [[ $ordinal -eq 0 ]] && exit 0
              # 从原来的对等节点克隆数据。
              ncat --recv-only mysql-$(($ordinal-1)).mysql-svc 3307 | xbstream -x -C /var/lib/mysql
              # 准备备份。
              xtrabackup --prepare --target-dir=/var/lib/mysql
          volumeMounts:
          - name: data
            mountPath: /var/lib/mysql
            subPath: mysql
          - name: conf
            mountPath: /etc/mysql/conf.d
      containers:
        - name: mysql
          image: mysql:5.7.43
          env:
            - name: MYSQL_ALLOW_EMPTY_PASSWORD
              value: "1"
          ports:
            - containerPort: 3306
              name: mysql
          volumeMounts:
            - mountPath: /var/lib/mysql
              name: data
              subPath: mysql
            - name: conf
              mountPath: /etc/mysql/conf.d
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
          livenessProbe:
            exec:
              command:
                - "mysqladmin"
                - "ping"
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
          readinessProbe:
            exec:
              command:
                - "mysql"
                - "-h"
                - "127.0.0.1"
                - "-e"
                - "SELECT 1"
            initialDelaySeconds: 5
            periodSeconds: 2
            timeoutSeconds: 1
        - name: xtrabackup
          image: ist0ne/xtrabackup:1.0
          ports:
            - name: xtrabackup
              containerPort: 3307
          command:
            - "bash"
            - "-c"
            - |
              set -ex
              cd /var/lib/mysql

              # 确定克隆数据的 binlog 位置（如果有的话）。
              if [[ -f xtrabackup_slave_info && "x$(<xtrabackup_slave_info)" != "x" ]]; then
                # XtraBackup 已经生成了部分的 “CHANGE MASTER TO” 查询
                # 因为我们从一个现有副本进行克隆。(需要删除末尾的分号!)
                cat xtrabackup_slave_info | sed -E 's/;$//g' > change_master_to.sql.in
                # 在这里要忽略 xtrabackup_binlog_info （它是没用的）。
                rm -f xtrabackup_slave_info xtrabackup_binlog_info
              elif [[ -f xtrabackup_binlog_info ]]; then
                # 我们直接从主实例进行克隆。解析 binlog 位置。
                [[ `cat xtrabackup_binlog_info` =~ ^(.*?)[[:space:]]+(.*?)$ ]] || exit 1
                rm -f xtrabackup_binlog_info xtrabackup_slave_info
                echo "CHANGE MASTER TO MASTER_LOG_FILE='${BASH_REMATCH[1]}',\
                      MASTER_LOG_POS=${BASH_REMATCH[2]}" > change_master_to.sql.in
              fi

              # 检查我们是否需要通过启动复制来完成克隆。
              if [[ -f change_master_to.sql.in ]]; then
                echo "Waiting for mysqld to be ready (accepting connections)"
                until mysql -h 127.0.0.1 -e "SELECT 1"; do sleep 1; done

                echo "Initializing replication from clone position"
                mysql -h 127.0.0.1 \
                      -e "$(<change_master_to.sql.in), \
                              MASTER_HOST='mysql-0.mysql-svc', \
                              MASTER_USER='root', \
                              MASTER_PASSWORD='', \
                              MASTER_CONNECT_RETRY=10; \
                            START SLAVE;" || exit 1
                # 如果容器重新启动，最多尝试一次。
                mv change_master_to.sql.in change_master_to.sql.orig
              fi

              # 当对等点请求时，启动服务器发送备份。
              exec ncat --listen --keep-open --send-only --max-conns=1 3307 -c \
                "xtrabackup --backup --slave-info --stream=xbstream --host=127.0.0.1 --user=root"
          volumeMounts:
          - name: data
            mountPath: /var/lib/mysql
            subPath: mysql
          - name: conf
            mountPath: /etc/mysql/conf.d
          resources:
            requests:
              cpu: 100m
              memory: 100Mi
      volumes:
      - name: conf
        emptyDir: {}
      - name: config-map
        configMap:
          name: mysql-cm
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "nfs-client-159"
      resources:
        requests:
          storage: 20Gi
```

## 参考链接

- https://www.apolloconfig.com/#/zh/design/apollo-introduction
- https://github.com/ctripcorp/apollo
