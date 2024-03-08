---
title: Zabbix 安装中文包
description: This is a document about Zabbix 安装中文包.
---

```bash
apt-get install language-pack-zh-hant language-pack-zh-hans

vi /etc/environment 
# 添加以下内容
LANG="zh_CN.UTF-8"
LANGUAGE="zh_CN:zh:en_US:en"

dpkg-reconfigure locales
```

