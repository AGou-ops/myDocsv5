---
title: 自建dns
description: This is a document about 自建dns.
---

## 使用bind

配置有点繁琐，不用了.

参考：https://www.google.com/search?q=%E8%87%AA%E5%BB%BAdns%E6%9C%8D%E5%8A%A1%E5%99%A8

## 使用dnsmasq

Linux中DNS的处理流程：

`test.com -> /etc/hosts -> /etc/resolv.conf -> dnsmasq`

dnsmasq中的DNS 处理流程：

`dnsmasq -> hosts.dnsmasq -> /etc/dnsmasq.conf / dnsmasq.conf -> resolv.dnsmasq.conf`

## 服务安装与启动

```bash
apt install dnsmasq -y

systemctl start dnsmasq

# 命令行工具
# 检查配置文件语法是否正确
dnsmasq -test
```

配置文件`/etc/dnsmasq.conf`(或者`/etc/dnsmasq.d`文件夹).

### 快速配置自定义域名dns解析

```bash
# 复制原来的hosts文件并重新命名，用于后续配置dnsmasq的静态解析
cp /etc/hosts /etc/hosts.dnsmasq
# 复制dns解析用于dnsmasq解析
cp /etc/resolv.conf /etc/resolv.dnsmasq.conf

# 修改`/etc/dnsmasq.conf`文件内容如下：
$ cat /etc/dnsmasq.conf
resolv-file=/etc/resolv.dnsmasq.conf
strict-order
addn-hosts=/etc/hosts.dnsmasq

# 指定上游的dns解析服务器
$ cat /etc/resolv.dnsmasq.conf
nameserver 10.211.55.7
nameserver 114.114.114.114
nameserver 8.8.8.8
# 自定义hosts，指定静态的dns解析
echo "192.168.3.51 git.localmac.com" >> /etc/hosts.dnsmasq

# 最后重启dnsmasq服务即可。
systemctl restart dnsmasq
```

:information_source:修改hosts相关文件之后，`dnsmasq`不会自动重载配置，需要重新启动才能生效，在这里我使用`inotify`结合bash命令来自动重启`dnsmasq`：

```bash
apt install -y inotify-tools

# 创建监听脚本，restart_dnsmasq.sh
#!/usr/bin/env bash
inotifywait -m -e CLOSE_WRITE /etc/hosts* |
while read events;
do
    echo $events;
    systemctl restart dnsmasq
done
```



### 客户端测试

```bash
# 测试自定义域名的dns解析
❯ dig git.localmac.com @10.211.55.7

; <<>> DiG 9.10.6 <<>> git.localmac.com @10.211.55.7
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 42806
;; flags: qr aa rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;git.localmac.com.              IN      A

;; ANSWER SECTION:
git.localmac.com.       0       IN      A       192.168.3.51

;; Query time: 7 msec
;; SERVER: 10.211.55.7#53(10.211.55.7)
;; WHEN: Tue Apr 18 14:19:00 CST 2023
;; MSG SIZE  rcvd: 61

# 测试dns上游
❯ dig taobao.com @10.211.55.7

; <<>> DiG 9.10.6 <<>> taobao.com @10.211.55.7
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 45049
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 512
;; QUESTION SECTION:
;taobao.com.                    IN      A

;; ANSWER SECTION:
taobao.com.             219     IN      A       59.82.122.115
taobao.com.             219     IN      A       106.11.226.158

;; Query time: 40 msec
;; SERVER: 10.211.55.7#53(10.211.55.7)
;; WHEN: Tue Apr 18 14:19:33 CST 2023
;; MSG SIZE  rcvd: 71
```

### DNSMASQ GUI

项目地址：https://github.com/nzgamer41/dnsmasqgui

```bash
apt update -y

apt install nginx php-fpm -y

# 添加用户和用户组
sudo groupadd php_user
sudo useradd -g php_user php_user

$ cat /etc/php/8.2/fpm/pool.d/dnsmasq.conf
[dnsmasq_gui]
user = php_user
group = php_user
; listen = 9000
listen = /var/run/php-fpm-dnsmasq.sock
listen.owner = root
listen.group = root
php_admin_value[disable_functions] = exec,passthru,shell_exec,system
php_admin_flag[allow_url_fopen] = off
; Choose how the process manager will control the number of child processes. 
pm = dynamic 
pm.max_children = 75 
pm.start_servers = 10 
pm.min_spare_servers = 5 
pm.max_spare_servers = 20 
pm.process_idle_timeout = 10s

# 注意上面的listen.owner和group是nginx运行的用户名和用户组

nginx config:

server {
         listen       80;
         server_name  _;
         root         /var/www/html/dnsmasq;

         access_log /var/log/nginx/dnsmasq-access.log;
         error_log  /var/log/nginx/dnsmasq-error.log error;
         index index.html index.htm index.php;

         location / {
                      try_files $uri $uri/ /index.php$is_args$args;
         }

         location ~ \.php$ {
            fastcgi_split_path_info ^(.+\.php)(/.+)$;
            fastcgi_pass unix:/var/run/php-fpm-dnsmasq.sock;
            fastcgi_index index.php;
            include fastcgi.conf;
    }
}
```

如果遇到没有写入权限，使用`chmod g+w /etc/hosts`为用户组添加写入权限，并且将用户`php_user`加入对应的用户组`usermod -aG root php_user`

### 常用配置选项

```bash
# 监听地址：
# 如果只写 127.0.0.1 则只处理本机的 DNS 解析，不写这句默认监听所有网口
listen-address=127.0.0.1,192.168.8.132

# 指定自定义 hosts 文件：
addn-hosts=/etc/hosts.dnsmasq

# 指定上游 DNS 服务列表的配置文件
resolv-file=/etc/resolv.dnsmasq.conf

# 按照 DNS 列表一个个查询，否则将请求发送到所有 DNS 服务器
strict-order

# 表示对下面设置的所有 server 发起查询请求，选择响应最快的服务器的结果
all-servers

# 指定默认查询的上游服务器
server=8.8.8.8
server=114.114.114.114

# 指定 .cn 的域名全部通过 114.114.114.114 这台国内DNS服务器来解析
server=/cn/114.114.114.114

# 给 *.apple.com 和 taobao.com 使用专用的 DNS
server=/taobao.com/223.5.5.5
server=/.apple.com/223.6.6.6

# 增加一个域名，强制解析到所指定的地址上，dns 欺骗
address=/360.com/127.0.0.1

# 加载外部配置文件，如：特定目录下的扩展名为 conf 的文件
conf-dir=/etc/config/dnsmasq, *.conf

# 设置DNS缓存大小(单位：DNS解析条数)
cache-size=500

# 存储域名解析的 IP 地址结果存储到 saveresult 的 ipset 结果中，可以交给iptables识别和转发
ipset=/test.com/saveresult
```

### dnsmasq in Docker

docker 镜像地址：https://hub.docker.com/r/4km3/dnsmasq

```bash
docker run -p 53:53/tcp -p 53:53/udp --cap-add=NET_ADMIN 4km3/dnsmasq:2.85-r2 -S /consul/10.17.0.2
```

该命令运行一个`dnsmasq`容器，并将`consul`映射到`10.17.0.2`。



## 参考链接

- https://blog.niekun.net/archives/1869.html
- [./dnsmasq](./dnsmasq.md)

