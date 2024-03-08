---
title: jenkins结合
description: This is a document about jenkins结合.
---

## 插件
- [Kubernetes plugin](https://plugins.jenkins.io/kubernetes)：用于连接k8s集群，运行agent、打包构建推送镜像、运行helm命令等；
- [Kubernetes CLI Plugin](https://plugins.jenkins.io/kubernetes-cli)：kubectl工具调用；
- [Config File Provider Plugin](https://plugins.jenkins.io/config-file-provider)：全局的一个配置文件插件，提供 例如maven的setting.xml文件等；
## 配置及使用
### kubernetes plugin
#### 配置
在jenkins中依次打开，`管理jenkins`--> `Nodes` --> `Clouds` --> `New Cloud`
![image.png](https://cdn.agou-ops.cn/others/20230912095924.png)
![image.png](https://cdn.agou-ops.cn/others/20230912100649.png)
关键配置项有以下几个：
- Kubernetes URL：填写k8s的API server地址，可以用FQDN或者IP
- Kubernetes server certificate key：这里不填的话，下面的禁用https证书校验要关掉；
- Credentials：认证token，这里可以自己专门为jenkins创建一个sa，并生成一个token专门使用；参考[附-生成jenkins sa及token](#附-生成jenkins sa及token)
- Pod Templates:
	- name: 名字可以为空，默认会自动生成，格式为`jenkins-agent-<随机子串>
	- namespace: 运行的名称空间；
	- Labels：标签，后面流水线中可以使用；
	- Containers：
		- name: 容器名称；
		- Docker image：`jenkins/jnlp-slave:latest-jdk11`
配置完成之后可以点击测试k8s连接，如果通的话，就可以在流水线中正式使用了.
#### 使用示例
新建jenkins pipeline作业：
```groovy
podTemplate(label: 'jnlp-agent',cloud: 'local-k8s' ){
    // 在代理节点上运行脚本
    node ('jnlp-agent') {
        echo "Running in k8s cluster..."
    }
}
```
#### 附-生成jenkins sa及token
照着改改（部分摘自官方github仓库）：
```yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: jenkins
  namespace: dubbo

---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: jenkins
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["create","delete","get","list","patch","update","watch"]
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create","delete","get","list","patch","update","watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get","list","watch"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["watch"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: jenkins
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: jenkins
subjects:
- kind: ServiceAccount
  name: jenkins
  namespace: dubbo
---
apiVersion: v1
kind: Secret
metadata:
  name: jenkins-secret
  namespace: dubbo
  annotations:
    kubernetes.io/service-account.name: jenkins
type: kubernetes.io/service-account-token
```
获取jenkins token（最下面那个token就是）：
```bash
k describe secret/jenkins-secret -n dubbo
Name:         jenkins-secret
Namespace:    dubbo
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: jenkins
              kubernetes.io/service-account.uid: 486e93a5-8ce1-4234-8d74-e948369ea75b

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1314 bytes
namespace:  5 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6IlhYRkQ2bmRNc0s2WktiWHYxT044M1ZfWTQ2UWRxZk81U3Q4TFJnRFo2QncifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJkdWJibyIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJqZW5raW5zLXNlY3JldCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50Lm5hbWUiOiJqZW5raW5zIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQudWlkIjoiNDg2ZTkzYTUtOGNlMS00MjM0LThkNzQtZTk0ODM2OWVhNzViIiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmR1YmJvOmplbmtpbnMifQ.TTHyEMRkqUFCLibbnQcJiGasNuVVxUn5JT47RlTmA6DDkDVLqXICNoJY-2pOTzw0mdX53MU0AWBIq8ffxKJSeE_shozRkl6LYDJuWV2PTAJuAXf4NSiBHCeKIjwUFijmTi54y2xxQnTZ4xJAZ7xeUmswQcFBzv-K2jvKX7PzQWcXJlS525F7owFEOV0ks3JR7RuiZ_HSVudCsThjsgmkUIbceiGqXH3XtiZWC9S29wJD6uzIe8v5zcNsWxTzOBCA-PG9xW0DWIWd5hOO40SZunuE54Uf3BWv4h9EnFLtjRqr6ldKQh7taSmUdLOGL_IuFKVoDPtSrfKm8lbkTwIXeA

```
### kubernetes CLI
安装好插件之后即可直接在pipeline中使用：
```groovy
    withKubeConfig(clusterName: 'local-k8s', contextName: 'default', credentialsId: 'k8s-token', namespace: 'jenkins', restrictKubeConfigAccess: true, serverUrl: 'https://kubernetes.default.svc.cluster.local:6443') {
    sh 'kubectl get pod -A'
```
### Config FIle Provider
![image.png](https://cdn.agou-ops.cn/others/20230912103408.png)
主要用途就是改下maven的镜像地址：
```xml
...
 <mirrors>
  <mirror>
    <id>nexus-public</id>
    <mirrorOf>*</mirrorOf>
    <name>central repository</name>
    <url>http://nexus.nblh.local/repository/mvn-group</url>
  </mirror>
  </mirrors>
...
```
## 附-pipeline示例
```groovy
// 执行Helm的方法
def helmDeploy(Map args) {
    if(args.init){
        println "Helm 初始化"
        sh "helm init --client-only --stable-repo-url ${args.url}"
    } else if (args.dry_run) {
        println "尝试 Helm 部署，验证是否能正常部署"
        sh "helm upgrade --install ${args.name} --namespace ${args.namespace} ${args.values} --set ${images},${tag} stable/${args.template} --dry-run --debug"
    } else {
        println "正式 Helm 部署"
        sh "helm upgrade --install ${args.name} --namespace ${args.namespace} ${args.values} --set ${images},${tag} stable/${args.template}"
    }
}

// jenkins slave 执行流水线任务
timeout(time: 600, unit: 'SECONDS') {
    try{
        def label = "jnlp-agent"
        podTemplate(label: label,cloud: 'kubernetes' ){
            node (label) {
                stage('Git阶段'){
                    echo "Git 阶段"
                    git branch: "master" ,changelog: true , url: "https://github.com/my-dlq/springboot-helloworld.git"
                }
                stage('Maven阶段'){
                    echo "Maven 阶段"
                    container('maven') {
                        //这里引用上面设置的全局的 settings.xml 文件，根据其ID将其引入并创建该文件
                        configFileProvider([configFile(fileId: "75884c5a-4ec2-4dc0-8d87-58b6b1636f8a", targetLocation: "settings.xml")]){
                            sh "mvn clean install -Dmaven.test.skip=true --settings settings.xml"
                        }
                    }
                }
                stage('Docker阶段'){
                    echo "Docker 阶段"
                    container('docker') {
                        // 读取pom参数
                        echo "读取 pom.xml 参数"
                        pom = readMavenPom file: './pom.xml'
                        // 设置镜像仓库地址
                        hub = "registry.cn-shanghai.aliyuncs.com"
                        // 设置仓库项目名
                        project_name = "mydlq"
                        echo "编译 Docker 镜像"
                        docker.withRegistry("http://${hub}", "ffb3b544-108e-4851-b747-b8a00bfe7ee0") {
                            echo "构建镜像"
                            // 设置推送到aliyun仓库的mydlq项目下，并用pom里面设置的项目名与版本号打标签
                            def customImage = docker.build("${hub}/${project_name}/${pom.artifactId}:${pom.version}")
                            echo "推送镜像"
                            customImage.push()
                            echo "删除镜像"
                            sh "docker rmi ${hub}/${project_name}/${pom.artifactId}:${pom.version}" 
                        }
                    }
                }
                stage('Helm阶段'){
                    container('helm-kubectl') {
                        withKubeConfig([credentialsId: "8510eda6-e1c7-4535-81af-17626b9575f7",serverUrl: "https://kubernetes.default.svc.cluster.local"]) {
                            // 设置参数
                            images = "image.repository=${hub}/${project_name}/${pom.artifactId}"
        		            tag = "image.tag=${pom.version}"
        		            template = "spring-boot"
        		            repo_url = "http://chart.mydlq.club"
        		            app_name = "${pom.artifactId}"
        		            // 检测是否存在yaml文件
        		            def values = ""
        		            if (fileExists('values.yaml')) {
        		                values = "-f values.yaml"
        		            }
        		            // 执行 Helm 方法
                            echo "Helm 初始化"
                            helmDeploy(init: true ,url: "${repo_url}");
                            echo "Helm 执行部署测试"
                            helmDeploy(init: false ,dry_run: true ,name: "${app_name}" ,namespace: "mydlqcloud" ,image: "${images}" ,tag: "${tag}" , values: "${values}" ,template: "${template}")
                            echo "Helm 执行正式部署"
                            helmDeploy(init: false ,dry_run: false ,name: "${app_name}" ,namespace: "mydlqcloud",image: "${images}" ,tag: "${tag}" , values: "${values}" ,template: "${template}")
                        }
                    }
                }
            }
        }
    }catch(Exception e) {
        currentBuild.result = "FAILURE"
    }finally {
        // 获取执行状态
        def currResult = currentBuild.result ?: 'SUCCESS' 
        // 判断执行任务状态，根据不同状态发送邮件
        stage('email'){
            if (currResult == 'SUCCESS') {
                echo "发送成功邮件"
                emailext(subject: '任务执行成功',to: '3*****7@qq.com',body: '''任务已经成功构建完成...''')
            }else {
                echo "发送失败邮件"
                emailext(subject: '任务执行失败',to: '3*****7@qq.com',body: '''任务执行失败构建失败...''')
            }
        }
    }
}
```
## 参考链接
- [GitHub - my-dlq/springboot-helloworld: This project is the mirror docker image of Helm Chart template.](https://github.com/my-dlq/springboot-helloworld/)