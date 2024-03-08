---
title: Zabbix agent执行远程命令
description: This is a document about Zabbix agent执行远程命令.
---

```bash
# 编辑/etc/zabbix/zabbix_agentd.conf
### Option: EnableRemoteCommands - Deprecated, use AllowKey=system.run[*] or DenyKey=system.run[*] instead
#       Internal alias for AllowKey/DenyKey parameters depending on value:
#       0 - DenyKey=system.run[*]
#       1 - AllowKey=system.run[*]
#
# Mandatory: no
AllowKey=system.run[*]   # 必须开启此项


$ systemctl restart zabbix-agnet

# 检查zabbix用户
[root@node01 ~]# id zabbix
uid=995(zabbix) gid=993(zabbix) 组=993(zabbix)

# 4 授权sudo无密码执行命令  vim /etc/sudoers
# 若非批量设置，推荐使用visudo命令设置，自带语法检查
## Read drop-in files from /etc/sudoers.d (the # here does not mean a comment)
#includedir /etc/sudoers.d

zabbix    ALL=(ALL)    NOPASSWD: ALL  # 所有的sudo 命令都不需要密码【生产环境不推荐,不安全】【推荐针对特定命令授权sudo】
# zabbix   ALL=(ALL)  NOPASSWD: /bin/systemctl   # 仅对执行sudo systemctl 命令不需要密码
# zabbix   ALL=(ALL)  NOPASSWD: /bin/systemctl,/bin/cat,/bin/touch  # 指定的多个命令，执行sudo 不需要密码
```

参考：https://zhuanlan.zhihu.com/p/434879809