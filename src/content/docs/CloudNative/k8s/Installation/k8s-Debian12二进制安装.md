---
title: k8s Debian12二进制安装
description: This is a document about k8s Debian12二进制安装.
---

## 一、预先准备
### 1.1 服务器角色
环境信息：
- k8s版本：v1.25.12
- Debian12(bookworm)：内核6.1.0-9-amd64

| 角色   | IP            | 组件列表                                                                                      |
| ------ | ------------- | --------------------------------------------------------------------------------------------- |
| master | 172.19.82.157 | kube-apiserver、kube-controller-manage、kube-scheduler、kubelet、kube-proxy、etcd、containerd |
| node01 | 172.19.82.158 | kubelet、kube-proxy、containerd、etcd                                                               |
| node02 | 172.19.82.159 | kubelet、kube-proxy、containerd、etcd                                                                                      |

ℹ由于手上资源有限，所以搭建一个一主两从的集群，如果后续想要扩展的话，仅需要再添加master或者node节点即可，此外etcd可以部署到集群之外并做高可用。
### 1.2 系统初始化
```bash
# 禁用防火墙
systemctl stop ufw
systemctl disable ufw
# 关闭SELinux，我这里cloudint安装的系统，没有防火墙和selinux
sed -i 's/enforcing/disabled/' /etc/selinux/config  
setenforce 0
# 关闭交换分区swap
swap -a
sed -ri 's/.*swap.*/#&/' /etc/fstab
# 同步时区与时间，**非常重要**
timedatectl set-timezone Asia/Shanghai
ntpdate ntp.aliyun.com    # 没有ntpdate的话，需要安装一下，apt install ntpdate -y
# 配置ulimit，最大文件打开数，优化linux性能，重新退出登录当前shell即可生效
ulimit -SHn 65535
cat >> /etc/security/limits.conf << EOF
root soft nofile 65536
root hard nofile 131072
root soft nproc 65535
root hard nproc 655350
root soft memlock unlimited
root hard memlock unlimited
EOF
# 安装ipvs
apt install ipvsadm ipset sysstat conntrack -y
# 加载
modprobe -- ip_vs
modprobe -- ip_vs_rr
modprobe -- ip_vs_wrr
modprobe -- ip_vs_sh
modprobe -- nf_conntrack
# 写入配置文件永久生效
cat >> /etc/modules-load.d/ipvs.conf <<EOF 
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh
nf_conntrack
ip_tables
ip_set
xt_set
ipt_set
ipt_rpfilter
ipt_REJECT
ipip
EOF
# 重启服务以加载模块
systemctl restart systemd-modules-load.service
# 检查模块是否加载，这里可以reboot一下
lsmod | grep -e ip_vs -e nf_conntrack
# 修改内核参数，按需修改即可
cat > /etc/sysctl.d/k8s.conf <<EOF
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
fs.may_detach_mounts = 1
vm.overcommit_memory=1
vm.panic_on_oom=0
fs.inotify.max_user_watches=89100
fs.file-max=52706963
fs.nr_open=52706963
net.netfilter.nf_conntrack_max=2310720

net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_keepalive_intvl =15
net.ipv4.tcp_max_tw_buckets = 36000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_max_orphans = 327680
net.ipv4.tcp_orphan_retries = 3
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 16384
net.ipv4.ip_conntrack_max = 65536
net.ipv4.tcp_max_syn_backlog = 16384
net.ipv4.tcp_timestamps = 0
net.core.somaxconn = 16384

net.ipv6.conf.all.disable_ipv6 = 0
net.ipv6.conf.default.disable_ipv6 = 0
net.ipv6.conf.lo.disable_ipv6 = 0
net.ipv6.conf.all.forwarding = 0
EOF
# 使其生效
sysctl --system
```
### 1.3 hosts设置
#### 1.3.1 通过hosts文件配置
```bash
cat >> /etc/hosts << EOF
172.19.82.157 master.k8s.local master
172.19.82.158 node01.k8s.local node01
172.19.82.159 node02.k8s.local node02
EOF

# 测试网络连通
for i in master node01 node02; do ping -c 2 $i; done
```
#### 1.3.2 使用bind9 DNS工具
ℹ仅在一台机器上安装bind9即可，我这里选择master节点，如果有高可用需求的话可以安装多个bind做集群。
```bash
# 安装bind9 DNS工具
apt install bind9 dnsutils -y
```
修改配置：
```bash
vim /etc/bind/named.conf.options
# 内容如下(删掉了部分注释)
options {
        directory "/var/cache/bind";
        // 当DNS解析不到时，转发给其他DNS服务器
        forwarders {
                8.8.8.8;
        };
        dnssec-validation auto;

        listen-on-v6 { any; };
};
```
![image.png](https://cdn.agou-ops.cn/others/20230822111122.png)
配置解析域以及模板文件：
```bash
# 配置解析域
vim /etc/bind/named.conf.default-zones
// 正向解析域
zone "k8s.local" IN {
        type master;
        file "/etc/bind/db.k8s.local";
};
// 反向解析域
zone "82.19.172.in-addr.zrpa" IN {
        type master;
        file "/etc/bind/db.in-addr.k8s.local";
};
# 复制模版文件
cp -a /etc/bind/db.local /etc/bind/db.k8s.local
cp -a /etc/bind/db.127 /etc/bind/db.in-addr.k8s.local
# 配置正向解析文件
vim /etc/bind/db.k8s.local
$TTL    604800
@       IN      SOA     dns.k8s.local. k8s.local. (
                              2         ; Serial
                         604800         ; Refresh
                          86400         ; Retry
                        2419200         ; Expire
                         604800 )       ; Negative Cache TTL
;
@       IN      NS      dns.k8s.local.
dns     IN      A       172.19.82.157
master  IN      A       172.19.82.157
node01  IN      A       172.19.82.158
node02  IN      A       172.19.82.159
# 配置反向解析文件
vim /etc/bind/db.in-addr.k8s.local
$TTL    604800
@       IN      SOA     dns.k8s.local. k8s.local. (
                              1         ; Serial
                         604800         ; Refresh
                          86400         ; Retry
                        2419200         ; Expire
                         604800 )       ; Negative Cache TTL
;
@       IN      NS      dns.k8s.local.
157     IN      PTR     k8s.local.
157     IN      PTR     master.k8s.local.
158     IN      PTR     node01.k8s.local.
159     IN      PTR     node02.k8s.local.
```
重启服务及测试：
```bash
systemctl restart bind9
# 修改主机的首选DNS地址为172.19.82.157
cat /etc/resolv.conf
nameserver 172.19.82.157
nameserver 8.8.8.8
# 测试
for i in master node01 node02; do dig +short $i.k8s.local; done
# 应当输出，截图如下
172.19.82.157
172.19.82.158
172.19.82.159
```
![image.png](https://cdn.agou-ops.cn/others/20230822114543.png)
### 1.4 （可选）安装supervisor
安装supervisor简单实现服务“高可用”.
ℹ非必须，使用systemd来管理也可以.
```bash
 apt install supervisor -y
 # 设置为开机自启，并启动
 systemctl enable supervisor --now
```
## 二、安装CRI容器运行时及harbor私有仓
### 2.1 安装containerd
安装方式有好几种，二进制安装，仓库安装以及编译安装。

这里我使用二进制进行安装，仓库安装参考：[https://github.com/containerd/containerd/blob/main/docs/getting-started.md#option-2-from-apt-get-or-dnf](https://github.com/containerd/containerd/blob/main/docs/getting-started.md#option-2-from-apt-get-or-dnf)
😄 let's go~
#### 2.1.1 步骤一安装containerd
```bash
# 从https://github.com/containerd/containerd/releases，下载containerd的二进制包，注意软件包架构.
wget https://github.com/containerd/containerd/releases/download/v1.6.23/containerd-1.6.23-linux-amd64.tar.gz

tar Cxzvf /usr/local containerd-1.6.23-linux-amd64.tar.gz

# 安装service服务
wget -O /lib/systemd/system/containerd.service https://raw.githubusercontent.com/containerd/containerd/main/containerd.service
# 重载并启动服务，设置为开机自启动
systemctl daemon-reload
systemctl enable containerd --now
```
![image.png](https://cdn.agou-ops.cn/others/20230822131441.png)
#### 2.1.2 步骤二安装runC
```bash
 wget https://github.com/opencontainers/runc/releases/download/v1.1.9/runc.amd64
install -m 755 runc.amd64 /usr/local/sbin/runc
```
#### 2.1.3 步骤三安装CNI插件
```bash
wget https://github.com/containernetworking/plugins/releases/download/v1.3.0/cni-plugins-linux-amd64-v1.3.0.tgz
# tar Cxzvf /usr/local/bin cni-plugins-linux-amd64-v1.3.0.tgz
tar Cxzvf /opt/cni/bin cni-plugins-linux-amd64-v1.3.0.tgz
```
#### 2.1.4 配置containerd使用systemd cgroup驱动
```bash
# 生成默认的配置文件
containerd config default | tee /etc/containerd/config.toml
```
![image.png](https://cdn.agou-ops.cn/others/20230822132245.png)
大概第125行，修改   `SystemdCgroup` 为`true`.
```bash
vim /etc/containerd/config.toml
# 修改默认的pause容器镜像地址为阿里云国内源
sandbox_image = "registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.9"
```
![image.png](https://cdn.agou-ops.cn/others/20230822132616.png)
大概第61行。
修改完保存之后，重启`systemctl restart containerd`.
检查运行状态：
![image.png](https://cdn.agou-ops.cn/others/20230822132807.png)
#### 2.1.5 安装crictl客户端工具
```bash
wget https://github.com/kubernetes-sigs/cri-tools/releases/download/v1.28.0/crictl-v1.28.0-linux-amd64.tar.gz
tar xf crictl-v1.28.0-linux-amd64.tar.gz -C /usr/local/bin
# 编写默认配置文件，方便客户端使用
bash -c "cat > /etc/crictl.yaml"  <<EOF
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
debug: false
EOF
```
检查是否安装成功`crictl ps`
![image.png](https://cdn.agou-ops.cn/others/20230822133349.png)
### 2.2 安装harbor私有仓
harbor建议部署在其他主机上，比如说主控机，与k8s集群分割开来，这个随便，看你自己。
```bash
# 下载离线安装包
wget https://github.com/goharbor/harbor/releases/download/v2.8.4/harbor-offline-installer-v2.8.4.tgz
tar xzvf harbor-offline-installer-v2.8.4.tgz
# 运行安装程序即可
sudo ./install.sh 
```
后续步骤略.
## 三、使用cfssl生成证书
### 3.1 安装cfssl
ℹ在master节点或者主控机（如果有的话）上安装cfssl即可，其他主机不需要。
```bash
wget https://github.com/cloudflare/cfssl/releases/download/v1.6.4/cfssl_1.6.4_linux_amd64
wget https://github.com/cloudflare/cfssl/releases/download/v1.6.4/cfssljson_1.6.4_linux_amd64
wget https://github.com/cloudflare/cfssl/releases/download/v1.6.4/cfssl-certinfo_1.6.4_linux_amd64
install -m 755 cfssl_1.6.4_linux_amd64 /usr/local/bin/cfssl
install -m 755 cfssljson_1.6.4_linux_amd64 /usr/local/bin/cfssl-json
install -m 755 cfssl-certinfo_1.6.4_linux_amd64 /usr/local/bin/cfssl-certinfo
```
检查安装：
![image.png](https://cdn.agou-ops.cn/others/20230822134549.png)
### 3.2 初始化及说明
创建k8s集群及etcd所需要的证书目录：
```bash
# 下面一个命令三个主机都执行一下。
mkdir -pv /etc/kubernetes/TLS/{etcd,k8s}
```
说明：一共创建了三个CA，分别用于：
- etcd集群
- apiserver、controller manager、kubelet、kube-scheduler等
- front-proxy
## 四、部署master节点
### 4.1 部署etcd集群
#### 4.1.1 下载安装etcd和etcdctl二进制文件
我们需要在157，158和159三台机器中都装上etcd，以组成etcd集群，保证etcd的高可用。
```bash
# 157，158，159机器上，也就是master和node01、node02节点执行以下命令
# 创建etcd用户
useradd -s /sbin/nologin -M etcd
wget https://github.com/etcd-io/etcd/releases/download/v3.4.27/etcd-v3.4.27-linux-amd64.tar.gz
tar xf etcd-v3.4.27-linux-amd64.tar.gz -C /usr/local
mv /usr/local/etcd-v3.4.27-linux-amd64 /usr/local/etcd-v3.4.27
# 创建软连接方便使用
ln -sv /usr/local/etcd-v3.4.27/etcd /usr/local/bin
ln -sv /usr/local/etcd-v3.4.27/etcdctl /usr/local/bin
```
检查etcd安装结果：
![image.png](https://cdn.agou-ops.cn/others/20230822141125.png)
#### 4.1.2 为etcd制作证书
```bash
# 仅在master主机上执行
cd /etc/kubernetes/TLS/etcd
vim ca-config.json
{
  "signing": {
    "default": {
      "expiry": "87600h"
    },
    "profiles": {
      "etcd": {
         "expiry": "87600h",
         "usages": [
            "signing",
            "key encipherment",
            "server auth",
            "client auth"
        ]
      }
    }
  }
}


vim ca-csr.json
{
    "CN": "etcd CA",
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "HangZhou",
            "ST": "ZheJiang"
        }
    ]
}

cfssl gencert -initca ca-csr.json | cfssl-json -bare ca
# 检查ca生成结果，见下图

cd /etc/kubernetes/TLS/etcd
# 将可能用到的IP加到hosts字段里面。
vim etcd-server-csr.json
{
    "CN": "etcd",
    "hosts": [
        "172.19.82.157",
        "172.19.82.158",
        "172.19.82.159",
        "192.168.3.28",
        "127.0.0.1",
        "10.96.0.1"
    ],
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "HangZhou",
            "ST": "ZheJiang"
        }
    ]
}
# 使用上面的自签CA签发etcd证书
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=etcd etcd-server-csr.json | cfssl-json -bare etcd-server
```
 配置文件字段解释：
> - CN：Common Name，浏览器使用该字段验证网址是否合法，一般写域名，非常重要
> - ST：State，省
> - L：Locality，地区
> - O：Organization Name，组织名称
> - OU：Organization Unit Name，组织单位名称

检查CA生成结果：
![image.png](https://cdn.agou-ops.cn/others/20230823104905.png)

	ca-config.json解析：
> 
> expiry：有效期为200年
> profiles-server：启动server的时候需要配置证书
> profiles-client：client去连接server的时候需要证书
> profiles-peer：双向证书，服务端找客户端需要证书，客户端找服务端需要证书
> etcd-peer-csr解析：
> 
> hosts：etcd有可能部署到哪些组件的IP都要填进来
> cfssl gencert：生成证书
![image.png](https://cdn.agou-ops.cn/others/20230823105545.png)
#### 4.1.3 配置及启动etcd集群
复制证书文件：
```bash
# 复制3.3中生成的证书到certs目录，注意，三个主机都要执行
# node01，自己做免密哦，这里就不教了。
scp -r master:/etc/kubernetes/TLS/etcd/*.pem /etc/kubernetes/TLS/etcd
# node02
scp -r master:/etc/kubernetes/TLS/etcd/*.pem /etc/kubernetes/TLS/etcd
```
编写启动脚本：
⚠注意以下脚本中，node01（158），node02（159）主机上都要修改对应的监听地址，不能照搬.
需要修改的地方有以下五处：
- `--name`
- `--advertise-client-urls `
- `--initial-advertise-peer-urls`
- `--listen-peer-urls`
- `--listen-client-urls`
```bash
# 在157 master主机上
vim /usr/local/etcd-v3.4.27/etcd-startup.sh
#!/usr/bin/env sh
./etcd --name=etcd-server-157 \
  --advertise-client-urls=https://172.19.82.157:2379 \
  --cert-file=/etc/kubernetes/TLS/etcd/etcd-server.pem \
  --client-cert-auth=true \
  --data-dir=/data/etcd \
  --experimental-initial-corrupt-check=true \
  --experimental-watch-progress-notify-interval=5s \
  --initial-advertise-peer-urls=https://172.19.82.157:2380 \
  --initial-cluster=etcd-server-157=https://172.19.82.157:2380,etcd-server-158=https://172.19.82.158:2380,etcd-server-159=https://172.19.82.159:2380 \
  --key-file=/etc/kubernetes/TLS/etcd/etcd-server-key.pem \
  --listen-client-urls=https://127.0.0.1:2379,https://172.19.82.157:2379 \
  --listen-metrics-urls=http://127.0.0.1:2381 \
  --listen-peer-urls=https://172.19.82.157:2380 \
  --peer-cert-file=/etc/kubernetes/TLS/etcd/etcd-server.pem \
  --peer-client-cert-auth=true \
  --peer-key-file=/etc/kubernetes/TLS/etcd/etcd-server-key.pem \
  --peer-trusted-ca-file=/etc/kubernetes/TLS/etcd/ca.pem \
  --snapshot-count=10000 \
  --trusted-ca-file=/etc/kubernetes/TLS/etcd/ca.pem
```
![image.png](https://cdn.agou-ops.cn/others/20230823111335.png)
修改脚本及目录权限：
```bash
chmod +x /usr/local/etcd-v3.4.27/etcd-startup.sh
chown -R etcd:etcd /usr/local/etcd-v3.4.27/
chown -R etcd:etcd /data/etcd/
chown -R etcd:etcd /data/logs/etcd-server/
chown -R etcd:etcd /etc/kubernetes/TLS/etcd/
```
创建supervisor配置文件：
三个主机都得执行，不同主机只需要修改下`[program:etcd-server-157]`这个即可，换成158和159.
```bash
vim /etc/supervisor/conf.d/etcd-server.conf
[program:etcd-server-157]
command=/usr/local/etcd-v3.4.27/etcd-startup.sh                 ; the program (relative uses PATH, can take args)
numprocs=1                                                      ; number of processes copies to start (def 1)
directory=/usr/local/etcd-v3.4.27                               ; directory to cwd to before exec (def no cwd)
autostart=true                                                  ; start at supervisord start (default: true)
autorestart=true                                                ; retstart at unexpected quit (default: true)
startsecs=0                                                    ; number of secs prog must stay running (def. 1)
startretries=3                                                  ; max # of serial start failures (default 3)
exitcodes=0,2                                                   ; 'expected' exit codes for process (default 0,2)
stopsignal=QUIT                                                 ; signal used to kill process (default TERM)
stopwaitsecs=10                                                 ; max num secs to wait b4 SIGKILL (default 10)
user=etcd                                                       ; setuid to this UNIX account to run the program
redirect_stderr=true                                            ; redirect proc stderr to stdout (default false)
stdout_logfile=/data/logs/etcd-server/etcd.stdout.log           ; stdout log path, NONE for none; default AUTO
stdout_logfile_maxbytes=64MB                                    ; max # logfile bytes b4 rotation (default 50MB)
stdout_logfile_backups=4                                        ; # of stdout logfile backups (default 10)
stdout_capture_maxbytes=1MB                                     ; number of bytes in 'capturemode' (default 0)
stdout_events_enabled=false                                     ; emit events on stdout writes (default false)
```
重载supervisor配置文件：
```bash
supervisorctl update
supervisorctl status
```
![image.png](https://cdn.agou-ops.cn/others/20230822151410.png)
使用以下命令可以查看集群状态（leader是谁？）
```bash
etcdctl -w table --cacert=/etc/kubernetes/TLS/etcd/ca.pem --cert=/etc/kubernetes/TLS/etcd/etcd-server.pem --key=/etc/kubernetes/TLS/etcd/etcd-server-key.pem --endpoints https://172.19.82.157:2379 endpoint status --cluster

```
![image.png](https://cdn.agou-ops.cn/others/20230823111655.png)
```bash
etcdctl -w table --cacert=/etc/kubernetes/TLS/etcd/ca.pem --cert=/etc/kubernetes/TLS/etcd/etcd-server.pem --key=/etc/kubernetes/TLS/etcd/etcd-server-key.pem --endpoints https://172.19.82.157:2379 member list
```
![image.png](https://cdn.agou-ops.cn/others/20230823111723.png)
### 4.2 部署API server
API server我就不做集群了（单节点），方法其实和etcd大差不差.
#### 4.2.1 使用cfssl生成证书
```bash
# 这里直接使用上面etcd的自建CA，如果etcd部署到集群之外的话，可以重新建个CA以作区分。
# master主机上
cd /etc/kubernetes/TLS/k8s/
vim ca-config.json
{
  "signing": {
    "default": {
      "expiry": "87600h"
    },
    "profiles": {
      "kubernetes": {
         "expiry": "87600h",
         "usages": [
            "signing",
            "key encipherment",
            "server auth",
            "client auth"
        ]
      }
    }
  }
}


vim ca-csr.json
{
    "CN": "kubernetes",
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "HangZhou",
            "ST": "ZheJiang",
            "O": "k8s",
            "OU": "System"
        }
    ]
}


cfssl gencert -initca ca-csr.json | cfssl-json -bare ca -

vim kube-apiserver-csr.json
{
    "CN": "kubernetes",
    "hosts": [
        "127.0.0.1",
        "kubernetes",
        "kubernetes.default",
        "kubernetes.default.svc",
        "kubernetes.default.svc.cluster",
        "kubernetes.default.svc.cluster.local",
        "172.19.82.157",
        "172.19.82.158",
        "172.19.82.159",
        "192.168.3.28",
        "10.96.0.1"
    ],
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "HangZhou",
            "ST": "ZheJiang",
            "O": "k8s",  
			"OU": "System"
        }
    ]
}

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes kube-apiserver-csr.json | cfssl-json -bare kube-apiserver

# 生成sa key，后面会用到
openssl genrsa -out sa.key 2048
openssl rsa -in sa.key -pubout -out sa.pub

mkdir proxy-client
cd proxy-client

vim front-proxy-ca-csr.json
{
  "CA":{
	  "expiry":"87600h"
  },
  "CN": "kubernetes",
  "key": {
     "algo": "rsa",
     "size": 2048
  }
}

cfssl gencert -initca front-proxy-ca-csr.json | cfssl-json -bare front-proxy-ca

vim front-proxy-client-csr.json
{
  "CN": "front-proxy-client",
  "key": {
     "algo": "rsa",
     "size": 2048
  }
}

cfssl gencert \
-ca=front-proxy-ca.pem \
-ca-key=front-proxy-ca-key.pem  \
-config=../ca-config.json   \
-profile=kubernetes front-proxy-client-csr.json | cfssl-json -bare front-proxy-client

```
![image.png](https://cdn.agou-ops.cn/others/20230823114325.png)
#### 4.2.2 部署api-server
仓库地址：[https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.25.md#v12512](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.25.md#v12512)
```bash
wget https://dl.k8s.io/v1.25.12/kubernetes-server-linux-amd64.tar.gz
tar xf kubernetes-server-linux-amd64.tar.gz -C /usr/local/
cd /usr/local/kubernetes
# 删除不必要的源码和文件
rm -f kubernetes-src.tar.gz
rm -rf server/bin/*.tar
rm -rf server/bin/*_tag
# 添加软连接方便使用
ln -sv /usr/local/kubernetes/server/bin/* /usr/local/bin/
```
启动脚本：
```bash
mkdir /etc/kubernetes/config
vim /usr/local/kubernetes/server/bin/kube-apiserver-startup.sh
#!/usr/bin/env sh
# 下面的cert和key统统用一套就好了。
#!/usr/bin/env sh
./kube-apiserver \
  --v=2  \
  --logtostderr=true  \
  --allow-privileged=true  \
  --bind-address=172.19.82.157  \
  --secure-port=6443  \
  --advertise-address=157 \
  --service-cluster-ip-range=10.244.0.0/12 \
  --service-node-port-range=30000-40000  \
  --etcd-servers=https://172.19.82.157:2379,https://172.19.82.158:2379,https://172.19.82.159:2379 \
  --etcd-cafile=/etc/kubernetes/TLS/etcd/ca.pem \
  --etcd-certfile=/etc/kubernetes/TLS/etcd/etcd-server.pem \
  --etcd-keyfile=/etc/kubernetes/TLS/etcd/etcd-server-key.pem \
  --client-ca-file=/etc/kubernetes/TLS/k8s/ca.pem \
  --tls-cert-file=/etc/kubernetes/TLS/k8s/kube-apiserver.pem \
  --tls-private-key-file=/etc/kubernetes/TLS/k8s/kube-apiserver-key.pem
  --kubelet-client-certificate=/etc/kubernetes/TLS/k8s/kube-apiserver.pem \
  --kubelet-client-key=/etc/kubernetes/TLS/k8s/kube-apiserver-key.pem \
  --service-account-key-file=/etc/kubernetes/TLS/k8s/sa.pub  \
  --service-account-signing-key-file=/etc/kubernetes/TLS/k8s/sa.key  \
  --service-account-issuer=https://kubernetes.default.svc.cluster.local \
  --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname  \
  --enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,DefaultTolerationSeconds,NodeRestriction,ResourceQuota  \
  --authorization-mode=Node,RBAC  \
  --enable-bootstrap-token-auth=true  \
  --requestheader-client-ca-file=/etc/kubernetes/TLS/k8s/proxy-client/front-proxy-ca.pem  \
  --proxy-client-cert-file=/etc/kubernetes/TLS/k8s/proxy-client/front-proxy-client.pem  \
  --proxy-client-key-file=/etc/kubernetes/TLS/k8s/proxy-client/front-proxy-client-key.pem  \
  --requestheader-allowed-names=front-proxy-client  \
  --requestheader-group-headers=X-Remote-Group  \
  --requestheader-extra-headers-prefix=X-Remote-Extra-  \
  --requestheader-username-headers=X-Remote-User  

chmod +x /usr/local/kubernetes/server/bin/kube-apiserver-startup.sh
mkdir -pv /data/logs/kubernetes/kube-apiserver
```
配置supervisor：
```bash
vim /etc/supervisor/conf.d/apiserver.conf
[program:apiserver-157]
command=/usr/local/kubernetes/server/bin/kube-apiserver-startup.sh                 ; the program (relative uses PATH, can take args)
numprocs=1                                                      ; number of processes copies to start (def 1)
directory=/usr/local/kubernetes/server/bin                               ; directory to cwd to before exec (def no cwd)
autostart=true                                                  ; start at supervisord start (default: true)
autorestart=true                                                ; retstart at unexpected quit (default: true)
startsecs=0                                                     ; number of secs prog must stay running (def. 1)
startretries=3                                                  ; max # of serial start failures (default 3)
exitcodes=0,2                                                   ; 'expected' exit codes for process (default 0,2)
stopsignal=QUIT                                                 ; signal used to kill process (default TERM)
stopwaitsecs=10                                                 ; max num secs to wait b4 SIGKILL (default 10)
user=root                                                       ; setuid to this UNIX account to run the program
redirect_stderr=true                                            ; redirect proc stderr to stdout (default false)
stdout_logfile=/data/logs/kubernetes/kube-apiserver/apiserver.stdout.log           ; stdout log path, NONE for none; default AUTO
stdout_logfile_maxbytes=64MB                                    ; max # logfile bytes b4 rotation (default 50MB)
stdout_logfile_backups=4                                        ; # of stdout logfile backups (default 10)
stdout_capture_maxbytes=1MB                                     ; number of bytes in 'capturemode' (default 0)
stdout_events_enabled=false                                     ; emit events on stdout writes (default false)


# 重载supervisor配置文件
supervisorctl update
ss -tnulp  | grep 6443
# output
tcp   LISTEN 0      16384                                *:6443             *:*    users:(("kube-apiserver",pid=5989,fd=7))                                            
```
![image.png](https://cdn.agou-ops.cn/others/20230822170053.png)
### 4.3 部署controller-manager
```bash
cd /etc/kubernetes/TLS/k8s
vim kube-controller-manager-csr.json
{
  "CN": "system:kube-controller-manager",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
    "names": [
        {
            "C": "CN",
            "L": "HangZhou",
            "ST": "ZheJiang",
			"O": "system:kube-controller-manager",
			"OU": "System"
        }
    ]
}

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes kube-controller-manager-csr.json | cfssl-json -bare kube-controller-manager

# 添加集群apiserver信息
kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/TLS/k8s/ca.pem \
  --embed-certs=true \
  --server="https://172.19.82.157:6443" \
  --kubeconfig=/etc/kubernetes/config/kube-controller-manager.kubeconfig
# 添加证书文件信息
kubectl config set-credentials system:kube-controller-manager \
	--client-certificate=/etc/kubernetes/TLS/k8s/kube-controller-manager.pem \
	--client-key=/etc/kubernetes/TLS/k8s/kube-controller-manager-key.pem \
  --embed-certs=true \
  --kubeconfig=/etc/kubernetes/config/kube-controller-manager.kubeconfig
# 添加用户
kubectl config set-context default \
  --cluster=kubernetes \
  --user=system:kube-controller-manager \
  --kubeconfig=/etc/kubernetes/config/kube-controller-manager.kubeconfig
# 指定默认的集群
kubectl config use-context default --kubeconfig=/etc/kubernetes/config/kube-controller-manager.kubeconfig


vim /usr/local/kubernetes/server/bin/kube-controller-manager-startup.sh
#!/usr/bin/env sh
./kube-controller-manager \
  --v=2 \
  --root-ca-file=/etc/kubernetes/TLS/k8s/ca.pem \
  --cluster-signing-cert-file=/etc/kubernetes/TLS/k8s/ca.pem \
  --cluster-signing-key-file=/etc/kubernetes/TLS/k8s/ca-key.pem \
  --service-account-private-key-file=/etc/kubernetes/TLS/k8s/sa.key \
  --kubeconfig=/etc/kubernetes/config/kube-controller-manager.kubeconfig \
  --leader-elect=true \
  --use-service-account-credentials=true \
  --node-monitor-grace-period=40s \
  --node-monitor-period=5s \
  --pod-eviction-timeout=2m0s \
  --controllers=*,bootstrapsigner,tokencleaner \
  --allocate-node-cidrs=true \
  --cluster-cidr=10.244.0.0/12 \
  --requestheader-client-ca-file=/etc/kubernetes/TLS/k8s/proxy-client/front-proxy-ca.pem \
  --node-cidr-mask-size=24

chmod +x /usr/local/kubernetes/server/bin/kube-controller-manager-startup.sh
mkdir -pv /data/logs/kubernetes/kube-controller-manager/

vim /etc/supervisor/conf.d/controller-manager.conf
[program:kube-controller-manager-157]
command=/usr/local/kubernetes/server/bin/kube-controller-manager-startup.sh                     ; the program (relative uses PATH, can take args)
numprocs=1                                                                        ; number of processes copies to start (def 1)
directory=/usr/local/kubernetes/server/bin                                              ; directory to cwd to before exec (def no cwd)
autostart=true                                                                    ; start at supervisord start (default: true)
autorestart=true                                                                  ; retstart at unexpected quit (default: true)
startsecs=30                                                                      ; number of secs prog must stay running (def. 1)
startretries=3                                                                    ; max # of serial start failures (default 3)
exitcodes=0,2                                                                     ; 'expected' exit codes for process (default 0,2)
stopsignal=QUIT                                                                   ; signal used to kill process (default TERM)
stopwaitsecs=10                                                                   ; max num secs to wait b4 SIGKILL (default 10)
user=root                                                                         ; setuid to this UNIX account to run the program
redirect_stderr=true                                                              ; redirect proc stderr to stdout (default false)
stdout_logfile=/data/logs/kubernetes/kube-controller-manager/controller.stdout.log  ; stderr log path, NONE for none; default AUTO
stdout_logfile_maxbytes=64MB                                                      ; max # logfile bytes b4 rotation (default 50MB)
stdout_logfile_backups=4                                                          ; # of stdout logfile backups (default 10)
stdout_capture_maxbytes=1MB                                                       ; number of bytes in 'capturemode' (default 0)
stdout_events_enabled=false                                                       ; emit events on stdout writes (default false)
```
![image.png](https://cdn.agou-ops.cn/others/20230823134408.png)
### 4.4 部署kube-scheduler
```bash
cd /etc/kubernetes/TLS/k8s
vim kube-scheduler-csr.json
{
  "CN": "system:kube-scheduler",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
        {
            "C": "CN",
            "L": "HangZhou",
            "ST": "ZheJiang",
			"O": "system:kube-scheduler",
			"OU": "System"
        }
  ]
}

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes kube-scheduler-csr.json | cfssl-json -bare kube-scheduler

# 添加集群apiserver信息
kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/TLS/k8s/ca.pem \
  --embed-certs=true \
  --server="https://172.19.82.157:6443" \
  --kubeconfig=/etc/kubernetes/config/kube-scheduler.kubeconfig
# 添加证书文件信息
kubectl config set-credentials system:kube-scheduler \
  --client-certificate=/etc/kubernetes/TLS/k8s/kube-scheduler.pem \
  --client-key=/etc/kubernetes/TLS/k8s/kube-scheduler-key.pem \
  --embed-certs=true \
  --kubeconfig=/etc/kubernetes/config/kube-scheduler.kubeconfig
# 添加用户
kubectl config set-context default \
  --cluster=kubernetes \
  --user=system:kube-scheduler \
  --kubeconfig=/etc/kubernetes/config/kube-scheduler.kubeconfig
# 指定默认的集群
kubectl config use-context default --kubeconfig=/etc/kubernetes/config/kube-scheduler.kubeconfig


vim /usr/local/kubernetes/server/bin/kube-scheduler-startup.sh
#!/usr/bin/env sh
./kube-scheduler \
  --v=2 \
  --leader-elect=true \
  --kubeconfig=/etc/kubernetes/config/kube-scheduler.kubeconfig

chmod +x /usr/local/kubernetes/server/bin/kube-scheduler-startup.sh
mkdir -pv /data/logs/kubernetes/kube-scheduler/

vim /etc/supervisor/conf.d/scheduler.conf
[program:kube-scheduler-157]
command=/usr/local/kubernetes/server/bin/kube-scheduler-startup.sh                   ; the program (relative uses PATH, can take args)
numprocs=1                                                               ; number of processes copies to start (def 1)
directory=/usr/local/kubernetes/server/bin                                  ; directory to cwd to before exec (def no cwd)
autostart=true                                                           ; start at supervisord start (default: true)
autorestart=true                                                         ; retstart at unexpected quit (default: true)
startsecs=0                                                             ; number of secs prog must stay running (def. 1)
startretries=3                                                           ; max # of serial start failures (default 3)
exitcodes=0,2                                                            ; 'expected' exit codes for process (default 0,2)
stopsignal=QUIT                                                          ; signal used to kill process (default TERM)
stopwaitsecs=10                                                          ; max num secs to wait b4 SIGKILL (default 10)
user=root                                                                ; setuid to this UNIX account to run the program
redirect_stderr=true                                                     ; redirect proc stderr to stdout (default false)
stdout_logfile=/data/logs/kubernetes/kube-scheduler/scheduler.stdout.log ; stderr log path, NONE for none; default AUTO
stdout_logfile_maxbytes=64MB                                             ; max # logfile bytes b4 rotation (default 50MB)
stdout_logfile_backups=4                                                 ; # of stdout logfile backups (default 10)
stdout_capture_maxbytes=1MB                                              ; number of bytes in 'capturemode' (default 0)
stdout_events_enabled=false                                              ; emit events on stdout writes (default false)

supervisorctl update
```
至此，master节点的核心组件基本安装完成了，使用ss命令查看服务监听状态：
```bash
> ss -tnulp | grep kube
tcp   LISTEN 0      16384                        127.0.0.1:10259      0.0.0.0:*    users:(("kube-scheduler",pid=9385,fd=7))                                                                     
tcp   LISTEN 0      16384                        127.0.0.1:10257      0.0.0.0:*    users:(("kube-controller",pid=9370,fd=7))                                                                    
tcp   LISTEN 0      16384                                *:6443             *:*    users:(("kube-apiserver",pid=5989,fd=7))                                                                    
```
### 4.5 配置kubectl所需要的kubeconfig
步骤大体和上面都是一致的。
```bash
cd /etc/kubernetes/TLS/k8s
vim kubectl-csr.json
{
  "CN": "kubectl",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
        {
            "C": "CN",
            "L": "HangZhou",
            "ST": "ZheJiang",
			"O": "system:masters",  
			"OU": "System"
        }
  ]
}

cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes kubectl-csr.json | cfssl-json -bare kubectl

# 这个你放到和上面同样的位置，然后复制到~/.kube里面也行，这里我图个方便
# 添加集群apiserver信息
kubectl config set-cluster kubernetes \
--certificate-authority=/etc/kubernetes/TLS/k8s/ca.pem \
--embed-certs=true \
--server="https://172.19.82.157:6443" \
--kubeconfig=/root/.kube/config
# 添加证书文件信息
kubectl config set-credentials cluster-admin \
--client-certificate=/etc/kubernetes/TLS/k8s/kubectl.pem \
--client-key=/etc/kubernetes/TLS/k8s/kubectl-key.pem \
--embed-certs=true \
--kubeconfig=/root/.kube/config
# 添加用户
kubectl config set-context default \
--cluster=kubernetes \
--user=cluster-admin \
--kubeconfig=/root/.kube/config
# 指定默认的集群
kubectl config use-context default --kubeconfig=/root/.kube/config
```
![image.png](https://cdn.agou-ops.cn/others/20230823163202.png)
### 4.6 部署node相关组件kube-proxy、kubelet
#### 4.6.1 bootstrap自动认证kubelet
```bash
cd /etc/kubernetes/config
# 生成随机认证tokenid和secret，并赋予权限，下面直到EOF一块执行。
TOKEN_ID=`head -c 16 /dev/urandom | od -An -t x | tr -d ' ' | head -c6`
TOKEN_SECRET=`head -c 16 /dev/urandom | od -An -t x | tr -d ' ' | head -c16`
cat > bootstrap.secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: bootstrap-token-$a
  namespace: kube-system
type: bootstrap.kubernetes.io/token
stringData:
  description: "The default bootstrap token generated by 'kubelet '."
  token-id: "$TOKEN_ID"
  token-secret: "$TOKEN_SECRET"
  usage-bootstrap-authentication: "true"
  usage-bootstrap-signing: "true"
  auth-extra-groups:  system:bootstrappers:default-node-token,system:bootstrappers:worker,system:bootstrappers:ingress
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kubelet-bootstrap
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:node-bootstrapper
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:bootstrappers:default-node-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-autoapprove-bootstrap
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:certificates.k8s.io:certificatesigningrequests:nodeclient
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:bootstrappers:default-node-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-autoapprove-certificate-rotation
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:certificates.k8s.io:certificatesigningrequests:selfnodeclient
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:nodes
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "true"
  labels:
    kubernetes.io/bootstrapping: rbac-defaults
  name: system:kube-apiserver-to-kubelet
rules:
  - apiGroups:
      - ""
    resources:
      - nodes/proxy
      - nodes/stats
      - nodes/log
      - nodes/spec
      - nodes/metrics
    verbs:
      - "*"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:kube-apiserver
  namespace: ""
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-apiserver-to-kubelet
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: kube-apiserver
EOF

# 添加集群apiserver信息
kubectl config set-cluster kubernetes  \
  --certificate-authority=/etc/kubernetes/TLS/k8s/ca.pem \
  --embed-certs=true   \
  --server="https://172.19.82.157:6443" \
  --kubeconfig=/etc/kubernetes/config/kubelet-bootstrap.kubeconfig
# 添加证书文件信息
kubectl config set-credentials kubelet-bootstrap-user  \
  --token=$TOKEN_ID.$TOKEN_SECRET \
  --kubeconfig=/etc/kubernetes/config/kubelet-bootstrap.kubeconfig
# 添加用户
kubectl config set-context kubelet-bootstrap-user@kubernetes \
  --cluster=kubernetes   \
  --user=kubelet-bootstrap-user \
  --kubeconfig=/etc/kubernetes/config/kubelet-bootstrap.kubeconfig
# 指定默认的集群
kubectl config use-context kubelet-bootstrap-user@kubernetes  \
  --kubeconfig=/etc/kubernetes/config/kubelet-bootstrap.kubeconfig
```
#### 4.6.2 部署kubelet
⚠ 由于master节点同样要运行一些pod，比如flannel、calico网络组件等，所以在master节点也需要安装Kubelet和Kube-proxy组件。
```bash
# 参考：https://kubernetes.io/zh-cn/docs/reference/config-api/kubelet-config.v1beta1/
vim /etc/kubernetes/config/kubelet-conf.yml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
address: 172.19.82.157
port: 10250
readOnlyPort: 10255
authentication:
  anonymous:
    enabled: false
  webhook:
    cacheTTL: 2m0s
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/TLS/k8s/ca.pem
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 5m0s
    cacheUnauthorizedTTL: 30s
cgroupDriver: systemd
cgroupsPerQOS: true
clusterDNS:
- 10.100.0.2
clusterDomain: cluster.local
containerLogMaxFiles: 5
containerLogMaxSize: 10Mi
contentType: application/vnd.kubernetes.protobuf
cpuCFSQuota: true
cpuManagerPolicy: none
cpuManagerReconcilePeriod: 10s
enableControllerAttachDetach: true
enableDebuggingHandlers: true
enforceNodeAllocatable:
- pods
eventBurst: 10
eventRecordQPS: 5
evictionHard:
  imagefs.available: 15%
  memory.available: 100Mi
  nodefs.available: 10%
  nodefs.inodesFree: 5%
evictionPressureTransitionPeriod: 5m0s
failSwapOn: true
fileCheckFrequency: 20s
hairpinMode: promiscuous-bridge
healthzBindAddress: 127.0.0.1
healthzPort: 10248
httpCheckFrequency: 20s
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 80
imageMinimumGCAge: 2m0s
iptablesDropBit: 15
iptablesMasqueradeBit: 14
kubeAPIBurst: 10
kubeAPIQPS: 5
makeIPTablesUtilChains: true
maxOpenFiles: 1000000
maxPods: 110
nodeStatusUpdateFrequency: 10s
oomScoreAdj: -999
podPidsLimit: -1
registryBurst: 10
registryPullQPS: 5
resolvConf: /etc/resolv.conf
rotateCertificates: true
runtimeRequestTimeout: 2m0s
serializeImagePulls: true
staticPodPath: /etc/kubernetes/manifests
streamingConnectionIdleTimeout: 4h0m0s
syncFrequency: 1m0s
volumeStatsAggPeriod: 1m0s


vim /usr/local/kubernetes/server/bin/kubelet-startup.sh
#!/usr/bin/env sh
./kubelet \
  --bootstrap-kubeconfig=/etc/kubernetes/config/kubelet-bootstrap.kubeconfig \
  --kubeconfig=/etc/kubernetes/config/kubelet.kubeconfig \
  --config=/etc/kubernetes/config/kubelet-conf.yml \
  --hostname-override=master0 \
  --node-labels=node.kubernetes.io/node='' \
  --container-runtime-endpoint=unix:///var/run/containerd/containerd.sock


# 添加集群apiserver信息
kubectl config set-cluster kubernetes \
--certificate-authority=/etc/kubernetes/TLS/k8s/ca.pem \
--embed-certs=true \
--server="https://172.19.82.157:6443" \
--kubeconfig=/etc/kubernetes/config/kubelet-bootstrap.kubeconfig
# 添加证书文件信息，下面这个token是之前生成的，也就是/etc/kubernetes/config/token.csv
kubectl config set-credentials kubelet-bootstrap \
--token=8d435b925863119020c4da4d16e064c8 \
--kubeconfig=/etc/kubernetes/config/kubelet-bootstrap.kubeconfig
# 添加用户
kubectl config set-context default \
--cluster=kubernetes \
--user=kubelet-bootstrap \
--kubeconfig=/etc/kubernetes/config/kubelet-bootstrap.kubeconfig
# 指定默认的集群
kubectl config use-context default --kubeconfig=/etc/kubernetes/config/kubelet-bootstrap.kubeconfig


chmod +x /usr/local/kubernetes/server/bin/kubelet-startup.sh
mkdir -pv /data/logs/kubernetes/kubelet/ /etc/kubernetes/manifests/

vim /etc/supervisor/conf.d/kubelet.conf
[program:kubelet-157]
command=/usr/local/kubernetes/server/bin/kubelet-startup.sh
                  ; the program (relative uses PATH, can take args)
numprocs=1                                                               ; number of processes copies to start (def 1)
directory=/usr/local/kubernetes/server/bin                                  ; directory to cwd to before exec (def no cwd)
autostart=true                                                           ; start at supervisord start (default: true)
autorestart=true                                                         ; retstart at unexpected quit (default: true)
startsecs=0                                                             ; number of secs prog must stay running (def. 1)
startretries=3                                                           ; max # of serial start failures (default 3)
exitcodes=0,2                                                            ; 'expected' exit codes for process (default 0,2)
stopsignal=QUIT                                                          ; signal used to kill process (default TERM)
stopwaitsecs=10                                                          ; max num secs to wait b4 SIGKILL (default 10)
user=root                                                                ; setuid to this UNIX account to run the program
redirect_stderr=true                                                     ; redirect proc stderr to stdout (default false)
stdout_logfile=/data/logs/kubernetes/kubelet/kubelet.stdout.log ; stderr log path, NONE for none; default AUTO
stdout_logfile_maxbytes=64MB                                             ; max # logfile bytes b4 rotation (default 50MB)
stdout_logfile_backups=4                                                 ; # of stdout logfile backups (default 10)
stdout_capture_maxbytes=1MB                                              ; number of bytes in 'capturemode' (default 0)
stdout_events_enabled=false                                              ; emit events on stdout writes (default false)

supervisorctl update
```
![image.png](https://cdn.agou-ops.cn/others/20230824111121.png)
#### 4.6.3 将master节点作为node加入到集群内部
**⚠ 注意：这个步骤如果做了bootstrap kubelet，则不需要手动授权，可直接忽略改步骤。**

>  以下来源于网络：
> 当kubelet组件启动成功后，就会想apiserver发送一个请求加入集群的信息，只有当master节点授权同意后，才可以正常加入，虽然是master节点部署的node组件，> 但是也会发生一个加入集群的信息，需要master同意。
> 
> 当kubelet启动之后，首先会在证书目录生成一个kubelet-client.key.tmp这个文件，当使用kubectl certificate approve命令授权成功node的请求之后，kubele> t-client.key.tmp小时，随之会生成一个kubelet-client-current.pem的证书文件，用于与apiserver建立连接，此时再使用kubectl get > node就会看到节点信息了。
> 
> 扩展：如果后期想要修改node的名称，那么就把生成的kubelet证书文件全部删除，然后使用kubectl delete > node删除该节点，在修改kubelet配置文件中该节点的名称，然后使用kubectl delete > csr删除授权信息，再重启kubelet生成新的授权信息，然后授权通过即可看到新的名字的node节点。
> 
> 只有当授权通过后，kubelet生成了证书文件，kubelet的端口才会被启动
> 
> 注意：当kubelet的授权被master请求通后，kube-proxy启动成功后，节点才会正真的加入集群，即使kubectl get > node看到的节点是Ready，该节点也是不可用的，必须当kube-proxy启动完毕后，这个节点才算正真的启动完毕.

```bash
# master节点上，获取请求列表
> kubectl get csr
# output
NAME                                                   AGE     SIGNERNAME                                    REQUESTOR           REQUESTEDDURATION   CONDITION
node-csr-VVgl1LpQ91JlbJLifEJIy_0KlbQ1mih6GPaGfaykQ-I   2m46s   kubernetes.io/kube-apiserver-client-kubelet   kubelet-bootstrap   <none>              Pending


# 准许该节点加入集群
> kubectl certificate approve node-csr-VVgl1LpQ91JlbJLifEJIy_0KlbQ1mih6GPaGfaykQ-I
# output
certificatesigningrequest.certificates.k8s.io/node-csr-VVgl1LpQ91JlbJLifEJIy_0KlbQ1mih6GPaGfaykQ-I approved
```
节点加入结果`kubectl get nodes`：
![image.png](https://cdn.agou-ops.cn/others/20230824113851.png)
#### 4.6.3 部署kube-proxy
```bash
cat > kube-proxy.yml << EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-proxy
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:kube-proxy
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:node-proxier
subjects:
- kind: ServiceAccount
  name: kube-proxy
  namespace: kube-system
---
apiVersion: v1
kind: Secret
metadata:
  name: kube-proxy
  namespace: kube-system
  annotations:
    kubernetes.io/service-account.name: "kube-proxy"
type: kubernetes.io/service-account-token
EOF

kubectl apply -f kube-proxy.yml
# 获取token
JWT_TOKEN=$(kubectl -n kube-system get secret/kube-proxy \
--output=jsonpath='{.data.token}' | base64 -d)

# 添加集群apiserver信息
kubectl config set-cluster kubernetes   \
  --certificate-authority=/etc/kubernetes/TLS/k8s/ca.pem \
  --embed-certs=true    \
  --server="https://172.19.82.157:6443" \
  --kubeconfig=/etc/kubernetes/config/kube-proxy.kubeconfig
# 添加token
kubectl config set-credentials system:kube-proxy    \
  --token=${JWT_TOKEN}   \
  --kubeconfig=/etc/kubernetes/config/kube-proxy.kubeconfig
# 添加用户
kubectl config set-context default    \
  --cluster=kubernetes   \
  --user=system:kube-proxy   \
  --kubeconfig=/etc/kubernetes/config/kube-proxy.kubeconfig
# 指定默认的集群
kubectl config use-context default   \
  --kubeconfig=/etc/kubernetes/config/kube-proxy.kubeconfig


# 参考：https://kubernetes.io/zh-cn/docs/reference/config-api/kube-proxy-config.v1alpha1/
vim /etc/kubernetes/config/kube-proxy-conf.yml
apiVersion: kubeproxy.config.k8s.io/v1alpha1
bindAddress: 172.19.82.157
clientConnection:
  acceptContentTypes: ""
  burst: 10
  contentType: application/vnd.kubernetes.protobuf
  kubeconfig: /etc/kubernetes/config/kube-proxy.kubeconfig
  qps: 5
clusterCIDR: 10.244.0.0/16
configSyncPeriod: 15m0s
conntrack:
  max: null
  maxPerCore: 32768
  min: 131072
  tcpCloseWaitTimeout: 1h0m0s
  tcpEstablishedTimeout: 24h0m0s
enableProfiling: false
healthzBindAddress: 0.0.0.0:10256
hostnameOverride: "$a"
iptables:
  masqueradeAll: false
  masqueradeBit: 14
  minSyncPeriod: 0s
  syncPeriod: 30s
ipvs:
  masqueradeAll: true
  minSyncPeriod: 5s
  scheduler: "rr"
  syncPeriod: 30s
kind: KubeProxyConfiguration
metricsBindAddress: 127.0.0.1:10249
mode: "ipvs"
nodePortAddresses: null
oomScoreAdj: -999
portRange: ""
udpIdleTimeout: 250ms


vim /usr/local/kubernetes/server/bin/kube-proxy-startup.sh
#!/usr/bin/env sh
./kube-proxy \
  --config=/etc/kubernetes/config/kube-proxy-conf.yml \
  --v=2

chmod +x /usr/local/kubernetes/server/bin/kube-proxy-startup.sh
mkdir -pv /data/logs/kubernetes/kube-proxy/

vim /etc/supervisor/conf.d/kube-proxy.conf
[program:kube-proxy-157]
command=/usr/local/kubernetes/server/bin/kube-proxy-startup.sh     ; the program (relative uses PATH, can take args)
numprocs=1                                                               ; number of processes copies to start (def 1)
directory=/usr/local/kubernetes/server/bin                                  ; directory to cwd to before exec (def no cwd)
autostart=true                                                           ; start at supervisord start (default: true)
autorestart=true                                                         ; retstart at unexpected quit (default: true)
startsecs=0                                                             ; number of secs prog must stay running (def. 1)
startretries=3                                                           ; max # of serial start failures (default 3)
exitcodes=0,2                                                            ; 'expected' exit codes for process (default 0,2)
stopsignal=QUIT                                                          ; signal used to kill process (default TERM)
stopwaitsecs=10                                                          ; max num secs to wait b4 SIGKILL (default 10)
user=root                                                                ; setuid to this UNIX account to run the program
redirect_stderr=true                                                     ; redirect proc stderr to stdout (default false)
stdout_logfile=/data/logs/kubernetes/kube-proxy/kube-proxy.stdout.log ; stderr log path, NONE for none; default AUTO
stdout_logfile_maxbytes=64MB                                             ; max # logfile bytes b4 rotation (default 50MB)
stdout_logfile_backups=4                                                 ; # of stdout logfile backups (default 10)
stdout_capture_maxbytes=1MB                                              ; number of bytes in 'capturemode' (default 0)
stdout_events_enabled=false                                              ; emit events on stdout writes (default false)

supervisorctl update
```
![image.png](https://cdn.agou-ops.cn/others/20230824115519.png)
#### 4.6.4 授权apiserver访问kubelet
如果不做该授权的话，会导致kubectl无法获取到集群的一些信息，比如logs.
创建一个RBAC资源使得apiserver能够访问kubelet：
```bash
cd /etc/kubernetes/config
vim apiserver2kubelet-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "true"
  labels:
    kubernetes.io/bootstrapping: rbac-defaults
  name: system:kube-apiserver-to-kubelet
rules:
  - apiGroups:
      - ""
    resources:
      - nodes/proxy
      - nodes/stats
      - nodes/log
      - nodes/spec
      - nodes/metrics
      - pods/log
    verbs:
      - "*"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:kube-apiserver
  namespace: ""
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-apiserver-to-kubelet
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: kubernetes


kubectl apply -f apiserver2kubelet-rbac.yaml
# output
clusterrole.rbac.authorization.k8s.io/system:apiserver2kubelet created
clusterrolebinding.rbac.authorization.k8s.io/system:kube-apiserver created
```
#### 4.6.5 部署flannel网络组件
部署完以上组件之后，使用`kubectl get nodes`发现新加进来的master节点处于`NotReady`状态，原因是没有网络组件，一旦安装好网络组件会立即变为`Ready`状态。

配置containerd使用代理和私有仓（不然镜像拉不下来喔）：
```bash
# 配置代理
vim /lib/systemd/system/containerd.service
# 在Services配置段添加
[Service]
...
Environment="HTTP_PROXY=172.19.82.100:7891"
Environment="HTTPS_PROXY=172.19.82.100:7891"
...

systemctl daemon-reload

# 配置私有仓
vim /etc/containerd/config.toml
# 大概第149行开始
...
      [plugins."io.containerd.grpc.v1.cri".registry.configs]
        [plugins."io.containerd.grpc.v1.cri".registry.configs."harbor.xxx.local".auth]
        username = "al-admin"
        password = "52PXZ2IDNWzk"
        [plugins."io.containerd.grpc.v1.cri".registry.configs."harbor.xxx.local".tls]
        insecure_skip_verify = true
      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."harbor.xxx.local"]
         endpoint = ["https://harbor.xxx.local"]

...

systemctl restart containerd
```
![image.png](https://cdn.agou-ops.cn/others/20230824134826.png)
```bash
cd /etc/kubernetes/config
wget https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
# 如果你用的不是10.244.0.0/16这个网段，则需要手动修改kube-flannel.yml资源配置文件。
# 如
vim kube-flannel.yml
...
  net-conf.json: |
    {
      "Network": "10.96.0.0/16",   # 改这里
      "Backend": {
        "Type": "vxlan"
      }
    }
...

kubectl apply -f kube-flannel.yml
```
检查flannel运行状态`kubectl get po -n kube-flannel`
![image.png](https://cdn.agou-ops.cn/others/20230825141026.png)
### 4.7 检查master节点部署结果
#### 4.7.1 检查服务运行状态
- 服务运行状态（`supervisorctl status`）：
![image.png](https://cdn.agou-ops.cn/others/20230825141505.png)
- 组件状态（`kubectl get cs`）：
![image.png](https://cdn.agou-ops.cn/others/20230825141536.png)
- master节点状态(`kubectl get node -owide`)
![image.png](https://cdn.agou-ops.cn/others/20230825141605.png)
如果以上有报错，就回头检查或者重新部署一下有问题的服务即可。
#### 4.7.2 附：文件列表及简介
- 证书及配置文件一览：
```bash
 tree /etc/kubernetes/
/etc/kubernetes/             # 该目录为k8s集群的所有证书和配置文件存放目录
├── TLS                      # 证书存放目录
│   ├── etcd                 # etcd证书存放目录，单独的一个CA
│   │   ├── ca-config.json   # ca配置文件
│   │   ├── ca-csr.json      # ca请求配置文件
│   │   ├── ca-key.pem       # ca私钥
│   │   ├── ca.csr
│   │   ├── ca.pem
│   │   ├── etcd-server-csr.json
│   │   ├── etcd-server-key.pem
│   │   ├── etcd-server.csr
│   │   └── etcd-server.pem
│   └── k8s                  # k8s集群组件证书目录
│       ├── ca-config.json
│       ├── ca-csr.json
│       ├── ca-key.pem
│       ├── ca.csr
│       ├── ca.pem
│       ├── kube-apiserver-csr.json
│       ├── kube-apiserver-key.pem
│       ├── kube-apiserver.csr
│       ├── kube-apiserver.pem
│       ├── kube-controller-manager-csr.json
│       ├── kube-controller-manager-key.pem
│       ├── kube-controller-manager.csr
│       ├── kube-controller-manager.pem
│       ├── kube-scheduler-csr.json
│       ├── kube-scheduler-key.pem
│       ├── kube-scheduler.csr
│       ├── kube-scheduler.pem
│       ├── kubectl-csr.json
│       ├── kubectl-key.pem
│       ├── kubectl.csr
│       ├── kubectl.pem
│       ├── proxy-client
│       │   ├── front-proxy-ca-csr.json
│       │   ├── front-proxy-ca-key.pem
│       │   ├── front-proxy-ca.csr
│       │   ├── front-proxy-ca.pem
│       │   ├── front-proxy-client-csr.json
│       │   ├── front-proxy-client-key.pem
│       │   ├── front-proxy-client.csr
│       │   └── front-proxy-client.pem
│       ├── sa.key
│       └── sa.pub
├── config               # 所有配置，包括认证和各种kubeconfig
│   ├── apiserver2kubelet-rbac.yaml
│   ├── bootstrap.secret.yaml
│   ├── kube-controller-manager.kubeconfig
│   ├── kube-flannel.yml
│   ├── kube-proxy-config.yml
│   ├── kube-proxy-scret.yml
│   ├── kube-proxy.kubeconfig
│   ├── kube-scheduler.kubeconfig
│   ├── kubelet-bootstrap.kubeconfig
│   ├── kubelet-conf.yml
│   └── kubelet.kubeconfig
└── manifests

7 directories, 51 files

```
- k8s二进制程序以及启动脚本一览：
```bash
# 以.sh结尾的就是对应服务的启动脚本
 tree /usr/local/kubernetes/server/bin/
/usr/local/kubernetes/server/bin/
├── apiextensions-apiserver
├── kube-aggregator
├── kube-apiserver
├── kube-apiserver-startup.sh
├── kube-controller-manager
├── kube-controller-manager-startup.sh
├── kube-log-runner
├── kube-proxy
├── kube-proxy-startup.sh
├── kube-scheduler
├── kube-scheduler-startup.sh
├── kubeadm
├── kubectl
├── kubectl-convert
├── kubelet
├── kubelet-startup.sh
└── mounter

1 directory, 17 files
```
- supervisor配置文件一览：
```bash
# k8s各组件的supervisor配置
 tree /etc/supervisor/conf.d/
/etc/supervisor/conf.d/
├── apiserver.conf
├── controller-manager.conf
├── etcd-server.conf
├── kube-proxy.conf
├── kubelet.conf
└── scheduler.conf

1 directory, 6 files
```
## 五、部署node节点
**其实完全可以合并成一个，但是为了条理清晰，所以拆开单独弄。**
在master上将kubelet和kube-proxy二进制文件分发下去：
```bash
for i in node01 node02; do
  # 创建程序目录
  ssh $i "mkdir -pv /usr/local/kubernetes/server/bin"
  # 分发bootstrap认证文件
 scp -r /usr/local/kubernetes/server/bin/kubelet* /usr/local/kubernetes/server/bin/kube-proxy* $i:/usr/local/kubernetes/server/bin
  # 增加可执行权限
  ssh $i "chmod +x /usr/local/kubernetes/server/bin/*"
done
```
### 5.1 部署kubelet
在master节点上分发认证文件及kubelet配置文件：
```bash
for i in node01 node02; do
  # 配置证书及配置文件目录
  ssh $i "mkdir -pv /etc/kubernetes/{TLS,config,manifests}"
  # 分发bootstrap认证文件
  scp /etc/kubernetes/config/kubelet-bootstrap.kubeconfig $i:/etc/kubernetes/config/kubelet-bootstrap.kubeconfig
  # 复制配置文件
  scp /etc/kubernetes/config/kubelet-conf.yml $i:/etc/kubernetes/config/kubelet-conf.yml
  scp /etc/kubernetes/TLS/k8s/ca.pem $i:/etc/kubernetes/TLS/k8s/ca.pem
done
```
配置supervisor（和master节点类似，所以直接复制过去好了）：
```bash
for i in node01 node02; do
  # 创建日志目录
  ssh $i "mkdir -pv /data/logs/kubernetes/kubelet"
  # 复制kubelet的supervisor配置文件
  scp /etc/supervisor/conf.d/kubelet.conf $i:/etc/supervisor/conf.d/kubelet.conf
  # 修改id，方便区分，这里不知为何下面命令不能用。。（手动改一下吧
  # ssh $i "id=`ip a show dev eth0 | grep -w inet | awk '{print $2}' | sed -e 's/.*\.\([0-9]\+\)\/.*/\1/'` ; sed -i "s/157/$id/" /etc/supervisor/conf.d/kubelet.conf"
done
```
![image.png](https://cdn.agou-ops.cn/others/20230825150503.png)
改完之后在node01和node02分别执行：
```bash
# node01
IP=`ip a show dev eth0 | grep -w inet | awk '{print $2}' | cut -d '/' -f 1`
sed -i "s/172.19.82.157/$IP/" /etc/kubernetes/config/kubelet-conf.yml
sed -i "s/master0/node01/" /usr/local/kubernetes/server/bin/kubelet-startup.sh
supervisor update

# node02
IP=`ip a show dev eth0 | grep -w inet | awk '{print $2}' | cut -d '/' -f 1`
sed -i "s/172.19.82.157/$IP" /etc/kubernetes/config/kubelet-conf.yml
sed -i "s/master0/node02/" /usr/local/kubernetes/server/bin/kubelet-startup.sh
supervisor update
```
启动完成之后在master节点上可以看到：
```bash
kubectl get nodes
# output
NAME      STATUS     ROLES    AGE     VERSION
master0   Ready      <none>   125m    v1.25.12
node01    NotReady   <none>   12s     v1.25.12
node02    NotReady   <none>   3m27s   v1.25.12
```
### 5.2 部署kube-proxy
```bash
# 在master节点上执行
for i in node01 node02; do
  ssh $i "mkdir -pv /data/logs/kubernetes/kube-proxy/"
  # 拷贝kube-proxy配置到node节点
  scp /etc/kubernetes/config/kube-proxy.kubeconfig $i:/etc/kubernetes/config/kube-proxy.kubeconfig
  scp /etc/kubernetes/config/kube-proxy-conf.yml $i:/etc/kubernetes/config/kube-proxy-conf.yml
  scp /etc/supervisor/conf.d/kube-proxy.conf $i:/etc/supervisor/conf.d/kube-proxy.conf
done

# 在node01节点上执行
IP=`ip a show dev eth0 | grep -w inet | awk '{print $2}' | cut -d '/' -f 1`
sed -i "s/172.19.82.157/$IP/" /etc/kubernetes/config/kube-proxy-conf.yml
supervisor update

# 在node02节点上执行
IP=`ip a show dev eth0 | grep -w inet | awk '{print $2}' | cut -d '/' -f 1`
sed -i "s/172.19.82.157/$IP/" /etc/kubernetes/config/kube-proxy-conf.yml
supervisor update

```
### 5.3 检查node节点部署结果
#### 5.3.1 检查服务运行状态
- supervisor服务运行状态（`sueprvisorctl status`）：
![image.png](https://cdn.agou-ops.cn/others/20230825154847.png)
- 网络组件以及节点状态：(`kubectl get node -owide/kubectl get po -A -owide`)：
![image.png](https://cdn.agou-ops.cn/others/20230825155014.png)
#### 5.3.2 附：文件列表及简介
以node01节点为例，其他node节点都一样。
- 证书及配置文件一览：
```bash
 tree /etc/kubernetes/
/etc/kubernetes/
├── TLS
│   ├── etcd
│   │   ├── ca-key.pem
│   │   ├── ca.pem
│   │   ├── etcd-server-key.pem
│   │   └── etcd-server.pem
│   └── k8s
│       └── ca.pem
├── config
│   ├── kube-proxy-conf.yml
│   ├── kube-proxy-config.yml
│   ├── kube-proxy.kubeconfig
│   ├── kubelet-bootstrap.kubeconfig
│   ├── kubelet-conf.yml
│   └── kubelet.kubeconfig
└── manifests

6 directories, 11 files
```
- supervisor配置文件一览：
```bash
tree /etc/supervisor/conf.d/
/etc/supervisor/conf.d/
├── etcd-server.conf
├── kube-proxy.conf
└── kubelet.conf

1 directory, 3 files
```
- k8s组件二进制程序及对应启动脚本一览：
```bash
tree /usr/local/kubernetes/server/bin/
/usr/local/kubernetes/server/bin/
├── kube-proxy
├── kube-proxy-startup.sh
├── kubelet
└── kubelet-startup.sh

1 directory, 4 files
```
## 六、其他可选组件安装
### 6.1 coredns
#### 6.1.1 部署coredns
```bash
# 在master节点上执行
cd /etc/kubernetes/config
wget https://raw.githubusercontent.com/coredns/deployment/master/kubernetes/coredns.yaml.sed -O coredns.yaml

# 修改资源清单里面的Corefile和clusterIP
vim coredns.yaml
# 第一处
...
  Corefile: |
    .:53 {
        errors
        health {
          lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {  # 修改反向解析
          fallthrough in-addr.arpa ip6.arpa
        }
        prometheus :9153
        forward . 8.8.8.8 {          # 修改为外部dns解析地址，当coredns解析不到时会传给该dns
          max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }                           # 这后面有个STUBDOMAINS去掉
...

# 第二处，大概191行
...
  clusterIP: 10.100.0.2
...

# 修改完成之后
kubectl apply -f coredns.yaml
```
检查coredns运行状态：
![image.png](https://cdn.agou-ops.cn/others/20230825162329.png)
#### 测试coredns
```bash
vim helloworld.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helloworld
spec:
  selector:
    matchLabels:
      app: helloworld
  replicas: 1
  template:
    metadata:
      labels:
        app: helloworld
    spec:
      containers:
      - name: helloworld
        image: karthequian/helloworld:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: helloworld-service
spec:
  selector:
    app: helloworld
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP

kubectl apply -f helloworld.yaml

# 运行网络测试容器
kubectl run tmp-shell --rm -i --tty --image nicolaka/netshoot
tmp-shell  ~  dig kubernetes.default.svc.cluster.local +short
10.96.0.1
tmp-shell2  ~  dig helloworld-service.default.svc.cluster.local +short
10.105.77.246
```
### 6.2 nginx ingress
参考链接：[https://kubernetes.github.io/ingress-nginx/](https://kubernetes.github.io/ingress-nginx/)
```bash
wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/baremetal/deploy.yaml -O nginx-ingress.yaml

kubectl apply -f nginx-ingress.yaml
```
### 6.3 面板
#### 6.3.1 dashboard
```bash
wget https://raw.githubusercontent.com/kubernetes/dashboard/v3.0.0-alpha0/charts/kubernetes-dashboard.yaml

kubectl apply -f kubernetes-dashboard.yaml

# 修改dashboard的Services类型为nodeport，方便访问
kubectl --namespace kubernetes-dashboard patch svc kubernetes-dashboard -p '{"spec": {"type": "NodePort"}}'

```
![image.png](https://cdn.agou-ops.cn/others/20230825180332.png)
安装完成之后，使用一下命令获取自动分配的nodeport：
```bash
kubectl get svc/kubernetes-dashboard -n kubernetes-dashboard -owide
# output
NAME                   TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)         AGE     SELECTOR
kubernetes-dashboard   NodePort   10.99.165.217   <none>        443:36046/TCP   3m54s   k8s-app=kubernetes-dashboard
```
访问任一节点的IP加上面的nodeport即可，比如：[https://172.19.82.157:36046/#/login](https://172.19.82.157:36046/#/login)
![image.png](https://cdn.agou-ops.cn/others/20230827094647.png)
创建sa使用token登录dashboard：
```bash
vim dashboard-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard-admin
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dashboard-admin-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: dashboard-admin
  namespace: kubernetes-dashboard
---
# 注意较新版本的k8s不会自动创建secret
apiVersion: v1
kind: Secret
metadata:
  name: dashboard-admin-secret
  namespace: kubernetes-dashboard
  annotations:
    kubernetes.io/service-account.name: dashboard-admin
type: kubernetes.io/service-account-token

kubectl apply -f dashboard-sa.yaml

# 获取token
 kubectl describe secret dashboard-admin-secret -n kubernetes-dashboard
# output

Name:         dashboard-admin-secret
Namespace:    kubernetes-dashboard
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: dashboard-admin
              kubernetes.io/service-account.uid: 80bf284e-06e7-4ea4-b747-0a2e77f0ed1f

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1314 bytes
namespace:  20 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6IlhYRkQ2bmRNc0s2WktiWHYxT044M1ZfWTQ2UWRxZk81U3Q4TFJnRFo2QncifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlcm5ldGVzLWRhc2hib2FyZCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJkYXNoYm9hcmQtYWRtaW4tc2VjcmV0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6ImRhc2hib2FyZC1hZG1pbiIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6IjgwYmYyODRlLTA2ZTctNGVhNC1iNzQ3LTBhMmU3N2YwZWQxZiIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDprdWJlcm5ldGVzLWRhc2hib2FyZDpkYXNoYm9hcmQtYWRtaW4ifQ.RN82A652pjg5PSoIfVCrzj6b6irTQAaHP4Sr-ROf2LCA3A-GttYaH3Tq0pNQx3x2lfhEK2wqWjmKUtcP7yCfoemkXNdAHV_XOnM1qJ86crv-DHkbaqc8JikwyPOucwex8pZ-EeblDpNUyD-QKbImWRmE3XF09g3tBgRrqANFBKbJd82ABKg_BZyQV1iLEz0wN1Int3uk4f8nm19_YoPfjJPE1UcmKcI0m44aqqANSYNU4e6gej4d-YkBHvaIUZ0-9j9r7t_dKS1qVQiqcAwxdFlt0Tjxbi2KurOIAtazQriHaSbe7VhDJa_v-WYfzcZuHgoWpAELyAR9rbcyScgMbw
```
使用上面输出的token即可登录dashboard.
![image.png](https://cdn.agou-ops.cn/others/20230827100314.png)
#### 6.3.2 rancher
略，参考：[使用helm快速安装rancher](https://ranchermanager.docs.rancher.com/pages-for-subheaders/install-upgrade-on-a-kubernetes-cluster#install-the-rancher-helm-chart)
## 七、未完待续
To Be Continued...