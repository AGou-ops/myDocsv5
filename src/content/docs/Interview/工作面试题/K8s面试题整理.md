---
title: K8s面试题整理
description: This is a document about K8s面试题整理.
---

## 什么是 Kubernetes？为什么使用它？

Kubernetes 是一个开源的容器编排系统，可以自动化应用程序的部署、扩展和管理。它帮助组织更有效地管理他们的应用程序。

## Kubernetes 集群的主要组件是什么？

一个 Kubernetes 集群包括一组节点，包括控制节点、工作节点和 etcd 集群。

## 您能解释一下 Kubernetes 中 Pod 的概念吗？

Pods 是 Kubernetes 中的最小部署单位，代表一组容器。每个 Pod 都有一个唯一的 IP 地址，共享存储和网络命名空间，并且可以共享数据。这使得多个容器可以相互协作，共享资源，并且可以通过一个统一的 IP 地址进行通信。

## 请描述一下 Kubernetes 中的服务（Service）。

服务是一种抽象的资源，用于将应用程序的一组 Pod 暴露给集群外部或内部的其他应用程序。它为应用程序提供了一个持久的 IP 地址和一组端口，以及一个可用性保证。服务可以使用负载均衡器（例如，NGINX）将请求分发到其关联的 Pod 中。

## Kubernetes 中的自动扩展（Autoscaling）如何工作？

Kubernetes 中的自动扩展功能允许您根据应用程序的负载自动调整 Pod 的数量。您可以使用各种触发器（例如，内存使用率）来设置自动扩展，以保证应用程序具有所需的资源和可用性。当您的应用程序需要更多资源时，Kubernetes 将自动创建更多的 Pod；当您的应用程序需要更少资源时，Kubernetes 将自动删除多余的 Pod。

## 请描述一下 Kubernetes 中的配置管理（ConfigMaps）。 

ConfigMaps 是 Kubernetes 中用于存储配置数据的资源。它们可以用于管理应用程序的配置，例如数据库连接字符串、API 密钥等。您可以通过声明性配置或从外部文件加载配置数据到 ConfigMap 中，并将其与您的应用程序关联。ConfigMap 可以被多个 Pod 共享，并且可以随时在不重新部署应用程序的情况下更新配置数据。

## 请描述一下 Kubernetes 中的私有存储卷（Private Volumes）。 

私有存储卷是指只能在特定的 Pod 中访问的存储卷。这些存储卷可以用于存储敏感数据，例如密钥、证书等。您可以通过使用 Kubernetes 内置的存储卷类型（例如，emptyDir）或外部存储系统（例如，NFS）

## 请描述一下在 Kubernetes 中的服务发现。

服务发现是在 Kubernetes 中实现的功能，用于允许容器和 Pod 之间的通信。当您创建一个服务，Kubernetes 会分配一个独特的 IP 地址和 DNS 名称给该服务，以便其他容器和 Pod 可以使用该地址和名称来通信。服务发现还可以在容器和 Pod 之间负载均衡流量，以提高应用程序的可用性。

## 请描述 Kubernetes 中的名称空间（Namespaces）。 

Kubernetes 名称空间是用于组织和隔离 Kubernetes 资源的方法。您可以使用名称空间将资源分配到不同的团队、项目或环境中，例如开发、测试和生产环境。在单个 Kubernetes 集群中，每个名称空间都具有唯一的资源和名称，并且可以在集群中隔离资源。

## 请描述 Kubernetes 中的状态持久化（StatefulSets）。 

StatefulSets 是 Kubernetes 中用于管理有状态应用程序的资源。它们与普通的部署（Deployments）不同，因为它们确保每个 Pod 有唯一的标识符（例如，DNS 名称）和持久的存储。这使得您可以将数据库、缓存或其他具有状态的应用程序部署到 Kubernetes 集群中，并确保该应用程序的数据在 Pod 的生命周期中保持不变。StatefulSets 还可以管理 Pod 的顺序启动和停止，以确保有状态应用程序的数据完整性。

## 请描述 Kubernetes 中的自动扩展（Horizontal Pod Autoscaling）。

 Horizontal Pod Autoscaling 是 Kubernetes 中的一项功能，可根据资源使用率和负载自动扩展 Pod 的数量。例如，如果您的应用程序的 CPU 使用率达到预定值，Horizontal Pod Autoscaling 就会自动扩展该应用程序的 Pod 数量，以减轻 CPU 负载。您可以通过定义预定的资源使用率阈值来配置自动扩展，以使您的应用程序保持可用性和性能。

## 请解释 Kubernetes 中的资源限制和配额（Resource Quotas and Limits）。 

Kubernetes 资源限制和配额是一项功能，用于限制集群中的每个命名空间的资源使用情况。这是通过限制命名空间中 Pod 的最大 CPU 和内存使用量来实现的。通过使用资源限制和配额，您可以确保集群中的每个命名空间都有足够的资源，以确保其他命名空间中的应用程序能够正常运行。您也可以防止某些命名空间中的应用程序对集群总体资源的使用产生过大的影响。

## Kubernetes 有哪些组件？

- API Server：提供了对 Kubernetes 集群状态的访问，并允许用户创建、更新、删除资源对象。
- etcd：是一个高可用的数据存储，用于存储集群的状态。
- Controller Manager：负责维护集群状态，例如调度 Pods 和控制复制集。
- Scheduler：根据集群状态调度新的 Pods 到特定的节点。
- kubelet：是每个节点上运行的代理，负责管理该节点上的 Pod 和容器。
- kube-proxy：负责实现 Kubernetes 服务网络，以及将来自集群内部的请求转发到相应的 Pod 上。

## Pod 可以通过 Kubernetes Autoscaler 实现自动伸缩。

Autoscaler 可以根据 CPU 利用率、内存使用率或其他指标动态地调整 Pod 的数量。当指标超过预定阈值时，Autoscaler 可以自动增加 Pod 的数量；当指标低于预定阈值时，Autoscaler 可以自动减少 Pod 的数量。

可以通过 Horizontal Pod Autoscaler（HPA）实现 Kubernetes 自动伸缩。HPA 可以定义对某个 Deployment、ReplicaSet 或者 StatefulSet 的缩放策略，并定期评估集群资源利用率，然后调整 Replica 数量以维护指定的负载。

## Kubernetes 集群的高可用怎么实现？

Kubernetes 集群的高可用通常可以通过以下几种方式实现：

- 多 Master 节点：通过增加 Master 节点数量，以确保有多个 Master 节点可用来执行管理任务，从而提高集群的可用性。
- 存储备份：通过定期备份集群中的状态数据，以保证在 Master 节点故障时可以恢复集群的状态。
- 负载均衡：通过使用负载均衡器来平衡请求流量，从而缓解单个节点的负载，并保证集群的高可用性。
- 节点备份：通过增加 Worker 节点数量，以保证在某个 Worker 节点故障时可以通过其他的 Worker 节点来替代该节点的工作，从而确保集群的高可用性。

以上是 Kubernetes 集群高可用的常见实现方式，不同的实现方式需要根据实际情况进行选择和组合，以实现不同的需求。

## 什么是 Kubernetes 的 Liveness 和 Readiness Probes？

​	Liveness 和 Readiness Probes 是 Kubernetes 用于监测应用程序健康状况的工具。

​	Liveness Probe 用于检测应用程序是否正常运行，如果检测到应用程序不正常，Kubernetes 将重启该容器以尝试恢复它。

​	Readiness Probe 用于检测应用程序是否已准备好接收请求，如果应用程序不处于就绪状态，Kubernetes 将不会转发请求到该容器中。

​	通过使用 Liveness 和 Readiness Probes，可以保证应用程序在运行过程中保持健康，并及时对异常情况进行响应。

## Kubernetes 中的 ConfigMap 和 Secret 有什么区别？

ConfigMap 和 Secret 都是 Kubernetes 中用于存储配置数据的对象，但它们有如下区别：

- 安全性：Secret 是加密的配置数据，用于存储敏感信息，例如密码、证书和 API 密钥等。ConfigMap 存储的是非敏感信息，例如配置文件。
- 大小限制：Secret 的数据大小有限制，最大为 1 MB。ConfigMap 可以存储更多数据。
- 映射：ConfigMap 可以映射为容器的环境变量或文件系统。Secret 可以映射为容器的环境变量或 Docker 镜像的文件系统中的文件。

​    ConfigMap 适用于存储非敏感信息，而 Secret 适用于存储敏感信息。

## 为什么在部署一个新的版本前需要先进行滚动更新？

在部署一个新的版本之前需要先进行滚动更新的原因有以下几点：

- 稳定性：滚动更新可以在部署新版本的同时保证当前版本的稳定性。如果在部署过程中发生错误，可以轻松回滚到原始版本。
- 故障转移：滚动更新可以更快地进行故障转移，从而避免故障的扩散。
- 兼容性：滚动更新可以评估新版本是否与当前环境兼容，并避免在部署新版本时对当前环境产生影响。
- 集体测试：滚动更新可以通过分步部署新版本，在每一步进行测试，来确保新版本的正确性。

通过滚动更新，可以更快地部署新版本，同时避免对当前环境产生影响，从而保证稳定性和安全性。

## 请详细解释Kubernetes中的Pod。

Pod是Kubernetes中最小的运行单元，它是容器的宿主。一个Pod可以包含一个或多个容器，这些容器共享相同的网络命名空间和存储资源。这意味着容器可以直接进行通信，并且它们可以共享同一个数据卷。

Pod的生命周期与容器的生命周期相同，当Pod的所有容器停止运行时，Pod也将停止运行。

Kubernetes使用Pod来管理容器，从而保证容器的可靠性和稳定性。如果一个Pod中的容器发生故障，Kubernetes可以自动重启容器，从而保证Pod的正常运行。此外，Kubernetes还可以通过调度Pod来实现资源分配和负载平衡。

Pod是Kubernetes中的一个重要概念，对于提高容器的可靠性和稳定性起着至关重要的作用。

## 请详细解释Kubernetes中的Replication Controller。

Replication Controller是Kubernetes中的一个重要概念，它负责管理Pod的生命周期。它确保一直有足够数量的Pod在运行，并且保证Pod的副本总是可以提供服务。

如果一个Pod因为故障或其他原因停止运行，Replication Controller会自动重新创建一个新的Pod来替代原来的Pod。此外，Replication Controller还可以动态地根据资源需求增加或减少Pod的数量。

Replication Controller与Deployment是Kubernetes中的重要组件，都用于管理Pod的生命周期。不同之处在于Replication Controller仅提供简单的Pod副本管理，而Deployment提供了更为全面的部署管理，包括滚动升级、回滚等功能。

Replication Controller是Kubernetes中的重要概念，它负责管理Pod的生命周期，从而保证服务的可靠性和稳定性。

## Kubernetes中的Service是什么？

Kubernetes的Service是一种管理Pod的方式，它提供了一个抽象层，使得外部系统和Pod间的通信更加容易和稳定。

Service提供了一个固定的IP地址和端口，通过这个固定的地址和端口，外部系统就可以访问运行在Kubernetes集群内的Pod。它还提供了负载均衡和容错功能，使得单个Pod的故障不会影响到整个系统的正常运行。

Service可以通过标签来对Pod进行选择，这样就可以实现在不同的环境中，使用不同的Pod版本。

Service是Kubernetes中的重要概念，它提供了一个抽象层，使得外部系统和Pod间的通信更加容易和稳定，从而保证服务的可靠性和稳定性。

## 在Kubernetes中如何管理长时间运行的任务？

在Kubernetes中，可以通过使用Job或CronJob等资源来管理长时间运行的任务。

Job是Kubernetes中的一种资源，用于管理一次性的任务，这些任务在完成后就会终止。如果任务失败，Job可以重试任务，直到任务成功完成或达到最大重试次数为止。

CronJob是Kubernetes中的另一种资源，它用于管理周期性任务，例如每天运行一次的任务。CronJob可以通过设置cron表达式来控制任务的运行周期。

在使用Job或CronJob时，需要提供一个Pod模板，描述需要运行的任务。在任务运行期间，Kubernetes会创建一个或多个Pod，运行任务，并在任务完成后删除Pod。

在Kubernetes中，可以通过使用Job和CronJob等资源来管理长时间运行的任务，从而使任务运行更加可靠和稳定。

## K8s 集群的扩容有哪些方法？

K8s 集群的扩容可以通过以下方法实现：

- 通过管理工具，如 kubeadm 或 kops，在集群中加入新的节点。
- 使用自动扩容工具，如 Horizontal Pod Autoscaler (HPA)，根据资源使用情况自动调整 Pod 数量。
- 使用预定义的模板，如 Kubernetes Deployment，通过更改 replicas 数量来扩容集群。
- 手动创建新的 Node 并加入集群。

## 如何使用 K8s 进行服务发现和负载均衡？

K8s 通过 Service 和 Endpoints 资源实现服务发现和负载均衡。

Service 是一个抽象层，用于代表一组 Pods。Endpoints 记录了 Service 与其所代表的 Pods 之间的映射关系。

当请求发送到 Service，K8s 会使用 Endpoints 记录的映射关系，将请求分发到相应的 Pod。通过这种方式，K8s 可以实现服务发现和负载均衡。

## k8s集群节点故障后如何处理？

一种常见的方法是使用kubectl drain命令将该节点上的所有pod迁移到其他可用节点上，然后进行维修或替换。替换完后，可以使用kubectl uncordon命令将该节点标记为可用。也可以使用第三方工具来管理k8s集群的故障节点，例如kops或kubeadm。

## k8s中如何实现服务发现与负载均衡？

k8s中服务发现和负载均衡通常是通过Kubernetes的Service对象实现的。Service对象在集群中定义一个逻辑上的应用组件，并为该组件创建一个唯一的DNS名称和IP地址。当请求到达Service对象时，k8s内部的负载均衡机制会将请求转发到Service对象关联的Pod中的一个实例上。这样可以实现服务发现和负载均衡。

## 如何在Kubernetes中实现滚动升级？

在Kubernetes中实现滚动升级通常需要以下步骤：

1. 部署新版本的应用：使用新的镜像在集群中创建一组新的Pod。
2. 切换流量：使用Kubernetes的Service对象或者Ingress对象将请求从旧的Pod转移到新的Pod。
3. 检查新的Pod是否正常工作：在切换流量后，检查新的Pod是否正常工作。
4. 删除旧的Pod：如果新的Pod正常工作，可以删除旧的Pod。

通过这样的步骤，可以实现在不中断服务的情况下对应用进行升级

## 什么是Kubernetes的 DaemonSet？

DaemonSet是Kubernetes中的一种特殊的Pod管理模型，可以确保集群中的每个节点都运行着一个特定的Pod。

例如，您可以使用DaemonSet在每个节点上运行一个日志收集容器，以确保所有节点上的日志都被收集并可以方便地分析。

在Kubernetes中创建DaemonSet需要使用YAML配置文件，其中定义了Pod模板、选择器和策略等。Kubernetes将根据您的配置在集群中运行指定数量的Pod，并确保它们始终运行。

## 请简述Kubernetes的网络模型。

Kubernetes的网络模型基于容器网络技术，为每个Pod分配一个独立的IP地址，并在集群内的容器之间创建虚拟网络。在Kubernetes中，每个Pod都可以使用该集群中的其他Pod的IP地址进行通信，无需对外部网络进行任何配置。

Kubernetes还提供了Service抽象，用于在集群内提供一致的访问方式，并隐藏了Pod的动态变化。Service可以为每个Pod提供一个固定的IP地址，并使用选择器将请求路由到后面的Pod。

Kubernetes还支持使用Ingress控制器对外部访问进行路由，从而可以控制对集群内资源的访问。通过Kubernetes的网络模型，您可以轻松构建可扩展、高可用的分布式系统。



Kubernetes（简称k8s）的网络模型主要分为两部分，分别是Pod之间的通信和Pod与Service之间的通信。



Pod之间的通信是通过在每个节点上创建一个名为kube-proxy的代理程序，它会监视API服务器来获取新的端点信息，并在本地的iptables规则中添加或删除相关规则。每个Pod都有自己的IP地址，它通过kube-proxy代理程序访问其他Pod。



Pod与Service之间的通信是通过集群中的Service对象来实现的。Service对象会封装一组Pod，然后分配一个虚拟IP地址，其它的Pod可以通过这个虚拟IP地址和端口号来访问这组Pod。当一个Service对象被创建或更新后，kube-proxy代理程序会更新本地的iptables规则，以便将请求路由到正确的Pod。

## 如何解决 Kubernetes 集群中的故障域问题？

一种方法是在每个节点上启用容器故障探测器，在集群内部分布式系统中使用心跳消息来监测每个节点的健康状况。另一种方法是在集群范围内使用节点监控器，监测每个节点的状态，并在发生故障时自动触发重新分配容器的操作。此外，使用容器容量管理工具，如 Kubernetes 自带的 Horizontal Pod Autoscaler（HPA），也可以帮助解决故障域问题。

## 什么是 Kubernetes 的资源限制？

Kubernetes 资源限制是对容器在集群中的 CPU 和内存使用量的限制。通过设置这些限制，可以确保每个容器不会使用过多的系统资源，从而保证集群的稳定性和可靠性。在定义容器时，可以通过 Kubernetes API 设置资源限制，也可以使用 Kubernetes 配置文件预先定义好资源限制，并在部署容器时使用。

## 什么是 Kubernetes 的自动扩展？

Kubernetes 自动扩展是指自动根据集群的负载情况增加或减少容器数量的过程。这是通过  Horizontal Pod Autoscaler（HPA）实现 Kubernetes 自动伸缩。HPA 可以定义对某个 Deployment、ReplicaSet 或者 StatefulSet 的缩放策略，并定期评估集群资源利用率，然后调整 Replica 数量以维护指定的负载。

## 如何实现对K8s集群的备份与恢复？

实现对K8s集群的备份与恢复可以通过多种方法来实现，例如：

- 使用kubectl命令：通过kubectl命令备份集群中的所有资源，并使用相同的命令在需要的时候恢复。
- 使用Kubeadm工具：通过Kubeadm工具备份集群，并在需要的时候使用相同的工具进行恢复。
- 使用第三方工具：使用第三方备份工具，例如Velero，进行K8s集群的备份与恢复。

不同的备份方法有不同的特点，根据实际需求选择最合适的备份方法是非常重要的

## K8s中如何设置节点自动扩容？

Kubernetes 支持通过 Horizontal Pod Autoscaler (HPA) 来实现节点的自动扩容。HPA 通过监控 Deployment、ReplicationController、ReplicaSet 或 StatefulSet 的 CPU 或内存使用情况，并且在必要时通过创建新的副本来扩容 Pod 数量。需要为 HPA 配置阈值，以控制何时应该扩容，并且提供比例因子，指定每次扩容的数量。

该功能可以通过 Kubernetes API 或命令行工具来配置。如果使用命令行，可以通过“kubectl autoscale”命令来创建 HPA，并且通过“kubectl describe hpa”命令来查看 HPA 的状态。

## Kubernetes 集群的扩容方式有哪些？

- 手动添加节点：可以手动添加更多的节点，然后将它们加入到集群中。
- 自动扩容：使用第三方工具，如Kubeadm或Kops等，自动扩展Kubernetes集群。
- 无缝升级：无需关闭整个集群，可以逐个升级每个节点，从而扩容集群。

## Kubernetes 中有哪些资源对象？

Kubernetes 中常见的资源对象包括：

- Pod：表示一组容器，是Kubernetes最小的部署单元。
- ReplicationController：维护Pod的副本数量，确保始终有指定数量的副本运行。
- ReplicaSet：是ReplicationController的替代品，提供了更为灵活的副本管理。
- Deployment：用于更新应用程序，它管理着ReplicaSet和Pod的生命周期。
- Service：提供了一个稳定的IP地址和端口，用于访问一组Pod。
- ConfigMap：存储了配置数据，可以在Pod内部被读取。
- Secret：存储了敏感数据，例如密码和密钥，可以在Pod内部被读取。
- StatefulSet：维护有状态应用程序的副本，保证每个副本有一个唯一的标识符。
- Job：用于执行一次性任务，确保任务完成后集群中不再有Pod运行

## Kubernetes的滚动更新是什么？如何配置？

滚动更新是指在不停止服务的情况下逐个更新部署的Pod，以确保服务的可用性。滚动更新通过使用新版本的Pod并逐渐将旧版本的Pod删除，来实现更新。

要配置滚动更新，需要在部署中指定maxUnavailable和maxSurge字段，以限制同时处于不可用状态的Pod数量。例如：

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-container
        image: my-image:v2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

在上面的示例中，滚动更新将同时删除一个Pod并创建一个新的Pod，直到更新完所有的Pod为止。

## k8s helm 是什么的

Helm是Kubernetes的包管理工具，可以方便地部署，管理和升级应用程序。它使用模板语言生成Kubernetes资源描述符，并使用命令行工具或Web UI部署和管理应用程序。它允许用户把应用程序分成独立的Charts，可以作为模块使用，避免了部署复杂度的增加。

## k8s operator 是什么

Kubernetes Operator 是一种设计模式，旨在将业务领域的知识编码到 Kubernetes 中。Operator 通过执行特定的控制循环，以管理应用程序的状态和配置，从而使应用程序能够在 Kubernetes 中部署和管理。这样，开发人员和运维人员可以以更高效的方式部署和管理应用程序。



## 如何实现业务容器化容器编排落地

实现业务容器化容器编排落地，通常需要以下几个步骤：

1. 容器镜像的制作：通过Dockerfile制作容器镜像，将应用程序和所需的依赖打包到镜像中。
2. 容器镜像的托管：将制作好的镜像上传到私有镜像仓库或公共镜像仓库，以备后续使用。
3. 集群的搭建：搭建Kubernetes集群，包括Master节点和Worker节点。
4. 部署应用：通过Kubernetes API或命令行工具，创建Deployment、Service、ConfigMap、Secret等资源，将容器镜像部署到集群中。
5. 运行监控：使用工具如Prometheus、Grafana等监控容器的运行情况，以便及时发现问题并进行修复。
6. 进行自动化：通过CI/CD流程，实现自动化部署，提高效率和可靠性。



## k8s运维中遇到什么故障问题

在运维k8s时可能遇到的故障问题包括：

1. 网络故障：容器间、pod间、node间网络不通，导致无法进行通信。
2. 资源配置不当：内存、CPU等资源不足，导致容器/pod无法正常启动或运行。
3. API服务故障：API服务挂掉，导致集群管理失效。
4. 存储故障：存储卷损坏或丢失，导致数据丢失。
5. 节点故障：节点宕机或网络不稳定，导致pod无法正常运行。

这些故障需要通过监控、日志分析等方法排查定位，并采取对应的措施进行解决。