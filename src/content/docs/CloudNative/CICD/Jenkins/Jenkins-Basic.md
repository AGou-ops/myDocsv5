---
title: Jenkins Basic
description: This is a document about Jenkins Basic.
---

# Jenkins Basic

`Jenkins`是一个独立的、开源的自动化服务器可以用来自动执行各种各样的任务相关的建筑、测试和交付或部署软件。 `Jenkins`可以通过`本机系统安装包`, `Docker`, 甚至是任何机器运行独立的`Java运行时环境(JRE)`安装。

## 安装与使用

新版本`Jenkins`依赖于`jdk8`或者`jdk11`, 需要提前安装, 安装过程不再赘述.

下载并使用`war`包进行安装:

```bash
wget http://mirrors.jenkins.io/war-stable/latest/jenkins.war
java -jar jenkins.war
```

添加Jenkins成服务项：

```bash
$ cat /usr/lib/systemd/system/jenkins.service
[Unit]
Description=Jenkins Continuous Integration Server
Requires=network.target
After=network.target

[Service]
Type=notify
NotifyAccess=main
ExecStart=/usr/local/jdk-17.0.6/bin/java -jar /usr/local/jenkins/jenkins.jar --httpPort=8080
Restart=on-failure
SuccessExitStatus=143

# /etc/systemd/system/jenkins.service.d/override.conf
[Service]
Environment="JAVA_OPTS=-Djava.awt.headless=true"
```

>如果启动过程中报以下错误：
>
>```bash
>java.lang.NullPointerException: Cannot load from short array because "sun.awt.FontConfiguration.head" is null
>	at java.desktop/sun.awt.FontConfiguration.getVersion(FontConfiguration.java:1262)
>	at java.desktop/sun.awt.FontConfiguration.readFontConfigFile(FontConfiguration.java:224)
>	at java.desktop/sun.awt.FontConfiguration.init(FontConfiguration.java:106)
>	at java.desktop/sun.awt.X11FontManager.createFontConfiguration(X11FontManager.java:706)
>	at java.desktop/sun.font.SunFontManager$2.run(SunFontManager.java:358)
>	at java.desktop/sun.font.SunFontManager$2.run(SunFontManager.java:315)
>	at java.base/java.security.AccessController.doPrivileged(AccessController.java:318)
>	at java.desktop/sun.font.SunFontManager.<init>(SunFontManager.java:315)
>	at java.desktop/sun.awt.FcFontManager.<init>(FcFontManager.java:35)
>	at java.desktop/sun.awt.X11FontManager.<init>(X11FontManager.java:56)
>	...
>```
>
>解决方法：尝试安装`fontconfig`包。
>
>```bash
>dnf install fontconfig
>```

通过`yum`仓库或者直接下载`rpm`包安装:

```bash
# 通过仓库安装
sudo wget -O /etc/yum.repos.d/jenkins.repo \
    https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key
sudo yum upgrade
sudo yum install jenkins java-1.8.0-openjdk-devel

# 直接下载rpm包安装
wget https://pkg.jenkins.io/redhat-stable/jenkins-2.235.2-1.1.noarch.rpm
yum localinstall -y jenkins-2.235.2-1.1.noarch.rpm
# yum install -y https://pkg.jenkins.io/redhat-stable/jenkins-2.235.2-1.1.noarch.rpm
```

启动`Jenkins`服务:

```bash
sudo systemctl start jenkins
# 查看启动状态
sudo systemctl status jenkins

# 如若使用的是war包, 启动命令如下所示
java -jar jenkins.war --httpPort=9090
```

最后, 打开浏览器访问 : http://127.0.0.1:8080 , 等待解锁`Jenkins`即可.([UNLOCK JENKINS](https://www.jenkins.io/doc/book/installing/#unlocking-jenkins))

![](https://cdn.agou-ops.cn/others/jenkins-1.png)

等待安装插件:

![等待安装插件](https://cdn.agou-ops.cn/others/jenkins-2.png)

:information_source:国内`Jenkins`插件镜像源: https://mirrors.tuna.tsinghua.edu.cn/jenkins/updates/update-center.json

> **Jenkins初始化过程中出现的问题:** 
>
> Jenkins 问题` An error occurred during installation: No such plugin: cloudbees-folder`
>
> **解决方案一:**
>
> 1. 上面的错误显示是，安装插件 cloudbees-folder 失败，是因为下载的 Jenkins.war 里没有 cloudbees-folder 插件,需要去 https://updates.jenkins-ci.org/download/plugins/cloudbees-folder/ 下载一个插件
> 2. 访问 IP:PORT/manage，越过配置插件的页面，直接访问
> 3. 点击【系统管理】–【管理插件】–【高级】–【上传插件】，手动安装下载好的插件，即可
>
> **解决方案二:** 
>
> 需要修改的是`jenkins.war`包，从服务器上下载好`jenkins.war`包进行修改, 只需将从https://updates.jenkins-ci.org/download/plugins/cloudbees-folder/ 下载好的插件添加进去, 然后回传到服务器, 最后重启`jenkins`即可.

成功部署结果:

![](https://cdn.agou-ops.cn/others/jenkins-3.png)

## 通过 Docker 安装

官方`Docker`仓库: https://hub.docker.com/_/jenkins

```bash
docker pull jenkins

docker run --name myjenkins -p 8080:8080 -p 50000:50000 -v /var/jenkins_home jenkins
```

规范安装步骤：

```bash
# 创建名为docker的用户组
$ sudo groupadd docker
# 把当前用户加入到这个用户组中
$ sudo usermod -aG docker $USER

# 创建jenkins用户并添加同名组、创建用户目录,默认shell为bash
$ sudo useradd -mU jenkins -s /bin/bash 
$ sudo passwd jenkins #重置密码
$ su jenkins #使用jenkins用户登录
$ cd ~ #进入/home/jenkins目录

# docker-compose.yml 文件内容如下：
version: '3'

services:
  jenkins-compose:
    # 注意镜像名称，lts表示长期支持版
    image: jenkins/jenkins:lts
    privileged: true # 解决权限问题
    restart: always 
    ports:
     - "8088:8080"
     - "50000:50000"
    environment:
     - JAVA_OPTS=-Duser.timezone=Asia/Shanghai
    volumes:
     - /var/run/docker.sock:/var/run/docker.sock
     - /usr/bin/docker:/usr/bin/docker
     - /home/ubuntu/jenkins-compose:/var/jenkins_home

$ docker-compose up -d jenkins-compose
```

## 其他

### 切换语言为简体中文

安装`Locale plugin`插件, 选择`configuration`然后设置语言为`zh-CN`并勾选` Ignore browser preference and force this language to all users`即可.

:warning:如果安装完插件显示有部分中文异常的情况, 需要再安装`Localization: Chinese (Simplified)`插件试试, 倘若还是不行, 重启`jenkins`, 再重新安装插件试试.

![](https://cdn.agou-ops.cn/others/jenkins-4.png)

![](https://cdn.agou-ops.cn/others/jenkins-5.png)

最后重启`jenkins`即可, 打开浏览器访问:

```bash
http://xx.xx.xx.xx:8080/restart 	# xx.xx.xx.xx 为服务器IP
```

### 修改默认目录

在`Linux`和`Mac`系统下, `jenkins`的默认文件目录为`/var/lib/jenkins`, `windows`系统为`C:\Users\%USERNAME%\.jenkins`.

- 在`linux`或者`Mac`系统下修改:  只需在用户配置文件(`/etc/profile`)中添加`JENKINS_HOME`变量即可.
- `Windows`下修改, 添加一个用户变量`JENKINS_HOME`即可.

然后将原来`jenkins`目录中的文件复制到新文件夹中即可.

最后重启`jenkins`服务. http://127.0.0.1:8080/restart 

> Windows 下重启`jenkins`遇到的问题: `Jenkins cannot restart itself as currently configured.`
>
> **解决方法:**
>
> 进入` Manage Jenkins`, 找到`Install as Windows service`, 然后安装成为服务即可.

### 修改默认时区

在【系统管理】-【脚本命令行】里运行

```bash
System.setProperty('org.apache.commons.jelly.tags.fmt.timeZone', 'Asia/Shanghai')
```

## nginx反向代理

```nginx	
server {
    listen      80;
    listen      [::]:80;
    server_name jenkins.localmac.com;

    # security
    # include     nginxconfig.io/security.conf;

    # logging
    access_log  /var/log/nginx/access.log combined buffer=512k flush=1m;
    error_log   /var/log/nginx/error.log warn;
      # pass through headers from Jenkins that Nginx considers invalid
  ignore_invalid_headers off;

    # reverse proxy
    location / {
			proxy_http_version 1.1;
			proxy_pass            http://192.168.3.51:8080;
			proxy_set_header Host      $host;
			proxy_set_header X-Real-IP $remote_addr;
			proxy_intercept_errors on;
			add_header X-uri "$uri";
			add_header X_host "$host";
			add_header X_port "$proxy_port";
			add_header X_remote_addr "$remote_addr";
			add_header X_proxy_forwaded_for "$proxy_add_x_forwarded_for";
			proxy_set_header X_scheme $scheme;
			proxy_set_header X-Forwarded-Host    $host:$server_port;

			proxy_max_temp_file_size 0;

			proxy_connect_timeout      90;
			proxy_send_timeout         90;
			proxy_read_timeout         90;

			proxy_buffer_size          4k;
			proxy_buffers              4 32k;
			proxy_busy_buffers_size    64k;
			proxy_temp_file_write_size 64k;

# Set maximum upload size
			client_max_body_size       10m;
			client_body_buffer_size    128k;

			sendfile off;

    }

    # additional config
    include nginxconfig.io/general.conf;
}

# subdomains redirect
server {
    listen      80;
    listen      [::]:80;
    server_name *.jenkins.localrokcy.com;
    return      301 http://jenkins.localrocky.com$request_uri;
}
```

## 参考链接

- Jenkins User Docs: https://www.jenkins.io/doc/
- Jenkins installing: https://www.jenkins.io/doc/book/installing/
- "An error occurred during installation: No such plugin: cloudbees-folder": https://github.com/jenkinsci/docker/issues/424
- "Jenkins 安装插件 No such plugin: cloudbees-folder": https://blog.csdn.net/dhq779626019/article/details/105756115
- Jenkins Plugins: https://plugins.jenkins.io/
- Jenkins  Mirrors  status: http://mirrors.jenkins-ci.org/status.html