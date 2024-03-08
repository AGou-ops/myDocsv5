---
title: Generic Webhook Trigger
description: This is a document about Generic Webhook Trigger.
---

初始化:

```groovy
pipeline {
    agent {
        node {
            label 'testserver-agent'
        }
    }
    triggers {
        GenericTrigger(
            genericVariables: [
              [key: 'ref', value: '$. ref']
            ],
            token: 'secret' ,
            causeString: ' Triggered on $ref' ,
            printContributedVariables: true,
            printPostContent: true
        )
    }
    stages {
        stage('GWT env') {
            steps {
                sh "echo $ref"
                sh "printenv"
            }
        }
    }
}
```

