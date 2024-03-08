---
title: PVE 初始化相关
description: This is a document about PVE 初始化相关.
---

## 去除登录订阅弹窗

备份该文件:

```bash
cp /usr/share/javascript/proxmox-widget-toolkit/proxmoxlib.js{,.bak}
```

找到以下代码，大概在`546`行:

```javascript
546                     if (res === null || res === undefined || !res || res
547                         .data.status.toLowerCase() !== 'active') {
```

将以上的if条件改为false即可，如下：

```javascript
if (false) {
```

修改完保存文件，重启服务：

```bash
systemctl restart pveproxy
```

最后重登账号，刷新即可。

## 更换国内镜像源

更换自带的企业源：

```bash
# 备份自带的源
mv /etc/apt/sources.list.d/pve-enterprise.list{,.bak}

# 添加官方，非订阅源（和下面国内非订阅源，二选一）
echo 'deb http://download.proxmox.com/debian/pve bullseye pve-no-subscription' >> /etc/apt/sources.list.d/pve-no-subscription.list

# 这个是国内，非订阅源，PS：注意pve版本的Debian代号，11就是bulleye
echo 'deb http://mirrors.ustc.edu.cn/proxmox/debian/pve bullseye pve-no-subscription' >> /etc/apt/sources.list.d/pve-no-subscription.list
```

更换Linux源为国内源：

```bash
# 备份文件：/etc/apt/sources.list
mv /etc/apt/sources.list{,.bak}

#整个文件内容改为（将原始内容每行前面加#也可以）：
cat << EOF > /etc/apt/sources.list
# debian aliyun source
deb https://mirrors.aliyun.com/debian bullseye main contrib
deb https://mirrors.aliyun.com/debian bullseye-updates main contrib
# security updates
deb https://mirrors.aliyun.com/debian-security bullseye-security main contrib
EOF
```

更新：

```bash
apt-get update -y
# apt-get dist-upgrade -y
PveServer@2023
```

## 模板镜像源设置

- ubuntu 22.04

```bash
$ mv /etc/apt/sources.list{,.bak}
$ cat << EOF > /etc/apt/sources.list
# 默认注释了源码镜像以提高 apt update 速度，如有需要可自行取消注释
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy main restricted universe multiverse
# deb-src https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse
# deb-src https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-backports main restricted universe multiverse
# deb-src https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-backports main restricted universe multiverse

# deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-security main restricted universe multiverse
# # deb-src https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-security main restricted universe multiverse

deb http://security.ubuntu.com/ubuntu/ jammy-security main restricted universe multiverse
# deb-src http://security.ubuntu.com/ubuntu/ jammy-security main restricted universe multiverse

# 预发布软件源，不建议启用
# deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-proposed main restricted universe multiverse
# # deb-src https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-proposed main restricted universe multiverse
EOF
$ apt update -y
```

- Debian 11

```bash
$ mv /etc/apt/sources.list{,.bak}
$ cat << EOF > /etc/apt/sources.list
# 默认注释了源码镜像以提高 apt update 速度，如有需要可自行取消注释
deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy main restricted universe multiverse
# deb-src http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy main restricted universe multiverse
deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse
# deb-src http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse
deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-backports main restricted universe multiverse
# deb-src http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-backports main restricted universe multiverse

# deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-security main restricted universe multiverse
# # deb-src http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-security main restricted universe multiverse

deb http://security.ubuntu.com/ubuntu/ jammy-security main restricted universe multiverse
# deb-src http://security.ubuntu.com/ubuntu/ jammy-security main restricted universe multiverse

# 预发布软件源，不建议启用
# deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-proposed main restricted universe multiverse
# # deb-src http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-proposed main restricted universe multiverse
EOF
$ apt update -y
```

- Rockylinux 9

```bash
$ sed -e 's|^mirrorlist=|#mirrorlist=|g' \
    -e 's|^#baseurl=http://dl.rockylinux.org/$contentdir|baseurl=https://mirrors.sdu.edu.cn/rocky|g' \
    -i.bak \
    /etc/yum.repos.d/rocky-*.repo
    
$ dnf clean all
$ dnf autoremove
$ dnf makecache
```

- CentOS 8（停止维护了，~~我不用，你随意~~。）

以下说明来自清华大学开源镜像站：

> **请注意，CentOS 8（非 Stream 版）已提前进入 EOL 停止服务阶段，因此镜像已被官方移动。如果您正在寻找关于这些系统的镜像，请参考 centos-vault 的帮助。**
>
> 该文件夹只提供 CentOS 7 与 8，架构仅为 `x86_64` ，如果需要较早版本的 CentOS，请参考 centos-vault 的帮助，若需要其他架构，请参考 centos-altarch 的帮助。
>
> 
>
> ```shell
> # 对于 CentOS 7
> sudo sed -e 's|^mirrorlist=|#mirrorlist=|g' \
>          -e 's|^#baseurl=http://mirror.centos.org/centos|baseurl=https://mirrors.tuna.tsinghua.edu.cn/centos|g' \
>          -i.bak \
>          /etc/yum.repos.d/CentOS-*.repo
> 
> # 对于 CentOS 8
> sudo sed -e 's|^mirrorlist=|#mirrorlist=|g' \
>          -e 's|^#baseurl=http://mirror.centos.org/$contentdir|baseurl=https://mirrors.tuna.tsinghua.edu.cn/centos|g' \
>          -i.bak \
>          /etc/yum.repos.d/CentOS-*.repo
> ```
>
> 注意其中的`*`通配符，如果只需要替换一些文件中的源，请自行增删。
>
> 注意，如果需要启用其中一些 repo，需要将其中的 `enabled=0` 改为 `enabled=1`。
>
> 最后，更新软件包缓存
>
> 
>
> ```shell
> sudo yum makecache
> ```

## 必要的软件包

```bash
# 基础工具
apt install -y vim git jq curl dnsutils traceroute htop iotop qemu-guest-agent nginx

# docker -- Rocky
sudo yum install -y yum-utils
sudo yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# docker -- Debian
apt-get update -y
apt-get install -y ca-certificates gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# docker -- ubuntu
apt-get update -y
apt-get install -y ca-certificates gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

配置docker镜像加速（阿里云）：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://hjsi0rjf.mirror.aliyuncs.com"]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## 挂载samba/NFS

```bash
# samba
sudo apt-get install cifs-utils
sudo mount -t cifs //172.19.82.15/pve-shared ~/nas_share -o username=al-admin,password=123
# 添加为自动挂载
//172.19.82.15/pve-shared /root/nas_share cifs credentials=/root/.smbcredentials,uid=1000,gid=1000,iocharset=utf8 0 0

# .smbcredentials文件内容：
username=al-admin
password=123

# NFS
sudo mount -t nfs nfs-server:/path/to/sharename ~/nfs
```

## 修改配置参数

```bash
# 减少开关机服务等待时间
# 编辑/etc/systemd/system.conf文件,修改下面两个参数
$ vim /etc/systemd/system.conf
DefaultTimeoutStartSec=10s
DefaultTimeoutStopSec=10s
$ systemctl daemon-reload
```

## 设置静态IP

```bash
# -- ubuntu系统
# 修改/etc/netplan下对应的文件
network:
    version: 2
    ethernets:
        ens20:
            dhcp4: false
            addresses: [172.19.82.170/24]
            optional: true
            routes:
              - to: default
                via: 172.19.82.254
            nameservers:
              addresses: [172.19.82.111,233.6.6.6]
```

## 添加一个只读用户

![image-20230510164442313](https://cdn.agou-ops.cn/others/image-20230510164442313.png)

添加一个用户，用于游客用户，鉴权领域选择PVE内置的认证系统就可以了.

![image-20230510164604088](https://cdn.agou-ops.cn/others/image-20230510164604088.png)

为用户添加权限，权限角色为`PVEAuditor`.

## 参考链接

- https://blog.csdn.net/MiddleWeek/article/details/120272402
