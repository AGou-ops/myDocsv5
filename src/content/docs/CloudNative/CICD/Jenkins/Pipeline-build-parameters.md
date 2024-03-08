---
title: Pipeline build parameters
description: This is a document about Pipeline build parameters.
---

# pipeline添加构建参数

1. 勾选`This project is parameterized`选项，然后自定义即可。



2. 在声明式流水线中，注意需要先运行一遍才会生效

```groovy
pipeline {
  agent any

  parameters {
    booleanParam(defaultValue: true, description: '', name: 'p_userFlag')
        
    choice(
       choices: 'dev\nprod',
       description: 'choose deploy environment',
       name: 'p_deploy_env'
   )
   string (name: 'p_version', defaultValue: '1.0.0', description: 'build version')
 
   text (name: 'p_deploy_text', defaultValue: 'One\nTwo\nThree', description: '')

   password (name: 'p_password', defaultValue: '', description: '')
  }
    // 没有下面这段的话，会构建失败，提示缺少stages配置段，用于占位，内容随意。
  stages {
      stage('test') {
          steps {
              echo 'hello'
          }
      }
  }
}
```

