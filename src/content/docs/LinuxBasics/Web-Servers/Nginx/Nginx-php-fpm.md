---
title: Nginx php-fpm
description: This is a document about Nginx php-fpm.
---

# nginx php-fpm 快速手册

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

