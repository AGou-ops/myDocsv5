---
title: Docker 示例及多架构构建
description: This is a document about Docker 示例及多架构构建.
---

```bash
cat > sources.list << 'EOF'
deb http://mirrors.163.com/debian/ bullseye main non-free contrib
deb http://mirrors.163.com/debian/ bullseye-updates main non-free contrib
deb http://mirrors.163.com/debian/ bullseye-backports main non-free contrib
deb-src http://mirrors.163.com/debian/ bullseye main non-free contrib
deb-src http://mirrors.163.com/debian/ bullseye-updates main non-free contrib
deb-src http://mirrors.163.com/debian/ bullseye-backports main non-free contrib
deb http://mirrors.ustc.edu.cn/debian-security/ stable-security main non-free contrib
deb-src http://mirrors.ustc.edu.cn/debian-security/ stable-security main non-free contrib
EOF

cat > Dockerfile << 'EOF'
FROM nginx AS build
ADD  sources.list /etc/apt/sources.list
RUN apt-get update \
        && apt-get install --no-install-recommends -y git gcc make libpcre3-dev libssl-dev libxml2-dev libxslt-dev libgd-dev libgeoip-dev wget apache2-utils ca-certificates \
        && update-ca-certificates \
        && git clone https://ghproxy.com/https://github.com/atomx/nginx-http-auth-digest \
        && wget `nginx -v 2>&1|awk -F\/ '{print "https://nginx.org/download/nginx-"$2".tar.gz"}'` \
        && tar zxvf nginx-*.tar.gz \
        && ( cd nginx-* && nginx -V 2>&1|awk '/configure/{ print "./configure " substr($0,22) " --add-module=../nginx-http-auth-digest/ --sbin-path=/usr/sbin/"}' | sh && make -j4 && make install ) \
        && apt-get remove -y git gcc make libpcre3-dev libssl-dev libxml2-dev libxslt-dev libgd-dev libgeoip-dev wget apache2-utils \
        && apt-get autoremove -y \
        && apt-get clean all \
        && rm -rf /var/lib/apt/lists/* \
        && nginx -V 

FROM nginx
COPY --from=build /usr/sbin/nginx /usr/sbin/nginx
```
使用buildkit生成多CPU架构的镜像并推送：
```bash
docker buildx build --platform arm64,amd64 -t YOURNAME/IMAGE_NAME . --push
```


