---
title: Jenkins 删除构建历史
description: This is a document about Jenkins 删除构建历史.
---

```
def jobName = "<YOUR_PIPELINE_NAME>"
def job = Jenkins.instance.getItem(jobName)
job.getBuilds().each { it.delete() }


// 以下为重置build number
job.updateNextBuildNumber(1)
```

