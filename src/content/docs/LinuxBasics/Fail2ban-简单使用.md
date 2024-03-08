---
title: Fail2ban 简单使用
description: This is a document about Fail2ban 简单使用.
---

> Fail2ban是一款用來阻擋使用暴力破解法登入伺服器的工具，最常被應用在SSH伺服器上。它會去檢查伺服器的日誌(Log)，並將登入失敗的IP位址記錄下來，如果該IP在一段時間內錯了超過規定的次數，就會自動添加規則至防火牆中，阻擋該IP一段時間的連入。

## 安装

```bash
# debain系
apt install fail2ban
# REHL系
dnf install fail2ban

sudo systemctl enable --now fail2ban
```

## 配置

配置ssh远程登录次数（/etc/fail2ban/jail.d/sshd.local）：

```bash
[sshd]
enabled = true
 
bantime = 10m
bantime.increment = true
bantime.maxtime = 1d
 
findtime = 10m
 
maxretry = 5
```

重载配置：

```bash
sudo fail2ban-client reload
sudo fail2ban-client status
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd unbanip 192.168.56.1
# 查看所有被ban的IP
sudo fail2ban-client banned
# 解封所有被ban的IP
sudo fail2ban-client unban --all

```

