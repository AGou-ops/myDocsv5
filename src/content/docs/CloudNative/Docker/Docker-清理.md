---
title: Docker 清理
description: This is a document about Docker 清理.
---

```bash
# 移除所有没被使用的镜像
docker image prune -a
# 超过24小时创建的镜像
docker image prune -a --filter "until=24h"
# 除了数据卷其他全部清理
docker system prune
# 移除所有
docker system prune --volumes
```

