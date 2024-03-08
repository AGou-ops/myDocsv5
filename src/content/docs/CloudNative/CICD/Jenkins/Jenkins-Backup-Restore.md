---
title: Jenkins Backup Restore
description: This is a document about Jenkins Backup Restore.
---

## 使用thinbackup插件进行备份

略



## 使用git仓库进行备份

示例脚本：

```bash
#!/bin/bash
# terminate on error
set -e

cd $JENKINS_HOME
echo "Recent changes:"
git log -5 --pretty=oneline --stat

echo "Checking status of $JENKINS_HOME"
git status

echo "Adding new files..."
git add .

echo "Git status:"
git status

echo "Committing changes..."
# Only try commit if something changed, otherwise this produces an error.
git diff-index --quiet HEAD || git commit -m "$GIT_COMMENT"

# Push changes upstream
git push
```

