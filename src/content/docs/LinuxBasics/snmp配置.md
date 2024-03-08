---
title: snmp配置
description: This is a document about snmp配置.
---

## 安装与启动
```bash
# centos 
yum -y install net-snmp net-snmp-utils

# debian
apt install -y snmpd snmp


# 启动
systemctl start snmpd.service

# ss -tnulp | grep snmpd
udp    UNCONN     0      0                                  *:161                                            *:*                   users:(("snmpd",pid=31796,fd=6))
```

## 配置
```bash

#       sec.name  source          community
com2sec notConfigUser  default       public

####
# Second, map the security name into a group name:

#       groupName      securityModel securityName
group   notConfigGroup v1           notConfigUser
group   notConfigGroup v2c           notConfigUser

####
# Third, create a view for us to let the group have rights to:

# Make at least  snmpwalk -v 1 localhost -c public system fast again.
#       name           incl/excl     subtree         mask(optional)
view    systemview    included   .1.3.6.1.2.1.1
view    systemview    included   .1.3.6.1.2.1.25.1.1
# 添加下面
view    AllView         included        .1


####
# Finally, grant the group read-only access to the systemview view.

#       group          context sec.model sec.level prefix read   write  notif
# 修改为AllView
access  notConfigGroup ""      any       noauth    exact  AllView none none

# -----------------------------------------------------------------------------
```

## 测试
```bash
snmpwalk -v 2c -c public -O e 127.0.0.1



# 启用3
net-snmp-create-v3-user -ro -A o2ps2w0dD -a SHA -X r30svV33 -x AES snmpuser

snmpwalk -v3 -a SHA -A o2ps2w0dD -x AES -X r30svV33 -l authPriv -u snmpuser 127.0.0.1 | head


snmpget -v 2c -c public 10.50.3.15 SNMPv2-MIB::sysUpTime.0

# 将snmp oid转换为唯一标识符
snmptranslate .1.3.6.1.2.1.1.3.0

```