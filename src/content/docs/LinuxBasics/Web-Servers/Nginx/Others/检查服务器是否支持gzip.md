---
title: 检查服务器是否支持gzip
description: This is a document about 检查服务器是否支持gzip.
---

```bash
curl -I -H ‘Accept-Encoding: gzip,deflate’ -H “Host:域名”  http://ip/url
# 
Content-Encoding: gzip			# 主要查看这个
```

