---
title: Jenkinsfile Sample
description: This is a document about Jenkinsfile Sample.
---

重试和超时：

```groovy
pipeline {
    agent any
    stages {
        stage('Deploy') {
            steps {
                retry(3) {
                    sh './flakey-deploy.sh'
                }

                timeout(time: 3, unit: 'MINUTES') {
                    sh './health-check.sh'
                }
                // 扩展:如果我们想要重试部署任务 5 次，但是总共花费的时间不能超过 3 分钟。
                timeout(time: 3, unit: 'MINUTES') {
                    retry(5) {
                        sh './flakey-deploy.sh'
                    }
                }
            }
        }
    }
}
```

`waitUnit`: 等待条件满足，不断重复waitUnit内的代码直到为true，最好和timeout结合使用，避免死循环

```groovy
timeout(50) {
   waitUnit {
      script {
          def r = sh script: 'curl http://example', returnStatus: true
          return (r == 0)
      }
   }
}
```



根据构建参数进行逻辑判断：

```groovy
stage('debug') {
    steps {
        script {
            if (params.p_deploy_env == 'dev') {
                 echo "deploy to dev"
            } 
        }
    }
}  
```

pipeline中使用系统凭证：

```groovy
withCredentials([string(credentialsId: 'dingding-robot-token', variable: 'my_dingtalk_token')]) {
    // 注意：构建记录中只会输出 ****
    echo "${my_dingtalk_token}"
}
// 另外可以
pipeline {
    agent any
    environment {
        ding_robot_token = credentials('dingding-robot-token')
    }

    stages {
        stage('debug') {
            steps {
                sh "printenv"
            }
        }
    }
    
    post {
        success {
          script {
            // 输出 **** ，即在console中看不到真实信息
            echo "${env.ding_robot_token}"
          }
          // 通知钉钉机器人，需要安装dingtalk插件
          dingTalk accessToken: "${env.ding_robot_token}", imageUrl: '', jenkinsUrl: '', message: '构建成功', notifyPeople: ''
        }
  }
}
```

when指令中beforeagent的用法（只有当分支为`production`时才会执行，可以避免agent中拉取代码，从而提高流水线速度）：

```groovy
pipeline {
   agent none
   stages {
     stage ('example build')  {
        steps {
           echo 'hello world'
        }
     }
     stage ('example deploy') {
       agent {
          label 'some-label'
       }
       when {
          beforeAgent true
          branch 'production' 
       }
       steps {
          echo  'deploying'
       }
     }
   }
}
```

流水线中操作镜像：

```groovy
// 需要安装 Jenkins docker workflow 插件, 下面的例子展示了：

// - 连接远程Docker主机
// - 登录私有Docker 仓库(阿里云镜像服务)
// - 根据代码中的 Dockerfile 构建镜像并push
// - 删除Docker远程主机中构建好的镜像，不占用空间
// - 不包含目标主机中部署镜像 其实就说上篇文章中的pipeline版本
pipeline {
    agent any
    
    environment {
        // PATH="/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin"
        _docker_remote_server='tcp://192.100.155.155:2375'
        _aliyun_registry='https://registry.cn-zhangjiakou.aliyuncs.com'
    }

    stages {
        stage('debug')  {
            steps {
                script {
                    sh "printenv"
                }
            }
        }

        stage('connect remote docker') {
            steps {
                // 注意 代码是先拉到了Jenkins主机上，但是构建镜像在Docker远程
                git 'https://github.com/mafeifan/docker-express-demo.git'

                script {
                    docker.withServer("${env._docker_remote_server}") {
                         // 第一个参数是私有仓库地址，注意要带http(s)，第二个参数是账号密码登录凭证，需要提前创建
                        docker.withRegistry("${env._aliyun_registry}", 'aliyun-docker-registry') {
                            // 使用 ${GIT_PREVIOUS_COMMIT} 取不到 commint_id
                            // https://stackoverflow.com/questions/35554983/git-variables-in-jenkins-workflow-plugin
                            git_commit = sh(returnStdout: true, script: "git rev-parse HEAD").trim()
                            echo git_commit
                            def customImage = docker.build("fineyma/node-demo:${env.BUILD_NUMBER}-${git_commit}")
                            /* Push the container to the custom Registry */
                            customImage.push()
                            // 可以优化，用匹配搜索并删除
                            sh "docker rmi fineyma/node-demo:${env.BUILD_NUMBER}-${git_commit}"
                        }
                    }
                }

                // clean workspace
                cleanWs()
            }
        }
    }
}
```

> 以上部分内容来源于网络。
