---
title: Jenkinsfile 自定义函数
description: This is a document about Jenkinsfile 自定义函数.
---

```groovy
pipeline {
    agent any
    
    environment {
       _version = createVersion()
    }
    
    stages {
        stage ('build') {
            steps {
                echo "${_version}"
            }
        }
    }
}

def createVersion() {
    return new Date().format('yyyy-MM-dd') + "-${env.BUILD_NUMBER}"
}
```

