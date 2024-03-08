---
title: ES Docker三节点部署
description: This is a document about ES Docker三节点部署.
---

# Docker中直接部署三节点es

以下仅记录关键步骤：

#### 拉取镜像

```bash
docker pull elasticsearch:7.7.1
```

#### 修改配置文件

`elasticsearch.yml`配置文件内容如下：

```bash
# bin/elasticsearch-certutil ca -out certs/elastic-certificates.p12 -pass ""
#添加如下配置
cluster.name: es-cluster
node.name: es01
node.master: true
node.data: true
network.host: 0.0.0.0
network.publish_host: 172.26.127.100
http.port: 9200
transport.tcp.port: 9300
discovery.seed_hosts: ["172.26.127.100","172.26.127.96","172.26.127.99"]
cluster.initial_master_nodes: ["172.26.127.100","172.26.127.96","172.26.127.99"]
http.cors.enabled: true
http.cors.allow-origin: "*"

xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate 
xpack.security.transport.ssl.keystore.path: elastic-certificates.p12 
xpack.security.transport.ssl.truststore.path: elastic-certificates.p12 
```

各节点之间配置文件基本相同，不同之处就是`node.name`需要在集群内是唯一的。

#### 启动容器

使用证书来保证各节点之间的安全交流：

```bash
# 建一个测试的容器，进入到里面，生成证书文件
bin/elasticsearch-certutil ca -out certs/elastic-certificates.p12 -pass ""
```

在各节点中启动es（并挂载上面写好的配置文件的和用于主机之间的安全证书文件）：

```bash
docker run --name elasticsearch -p 9200:9200 -p 9300:9300    \
--privileged=true   \
--hostname elasticsearch  \
--restart=on-failure:3   \
-e ES_JAVA_OPTS="-Xms2g -Xmx2g"    \
-v /root/elasticsearch/config/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml   \
-v /root/elasticsearch/config/elastic-certificates.p12:/usr/share/elasticsearch/config/elastic-certificates.p12   \
-v /root/elasticsearch/data:/usr/share/elasticsearch/data   \
-v /root/elasticsearch/plugins:/usr/share/elasticsearch/plugins   \
-d elasticsearch:7.7.1
```

进入任一节点中，生成相关的密码：

```bash
# 手动设置密码
bin/elasticsearch-setup-passwords interactive
# 自动生成密码
bin/elasticsearch-setup-passwords auto 
```

#### 检查es集群/节点状态

```bash
curl -XGET http://172.26.127.100:9200/_cat/health?v

curl -XGET http://172.26.127.100:9200/_cluster/health?pretty
curl -XGET http://172.26.127.100:9200/_cat/nodes?v
```

## 使用docker-compose快速部署

```dockerfile
version: '2.2'
services:
  es01:
    image: elasticsearch:7.10.1
    container_name: es01
    environment:
      - node.name=es01
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es02,es03
      - cluster.initial_master_nodes=es01,es02,es03
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - /usr/es01/node1/data/:/usr/share/elasticsearch/data
      - /usr/es02/node1/plugins:/usr/share/elasticsearch/plugins
    ports:
      - 9200:9200
    networks:
      - elastic
  es02:
    image: elasticsearch:7.10.1
    container_name: es02
    environment:
      - node.name=es02
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es01,es03
      - cluster.initial_master_nodes=es01,es02,es03
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - /usr/es02/node2/data/:/usr/share/elasticsearch/data
      - /usr/es02/node2/plugins:/usr/share/elasticsearch/plugins
    networks:
      - elastic
  es03:
    image: elasticsearch:7.10.1
    container_name: es03
    environment:
      - node.name=es03
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es01,es02
      - cluster.initial_master_nodes=es01,es02,es03
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - /usr/es03/node3/data/:/usr/share/elasticsearch/data
      - /usr/es03ß/node3/plugins:/usr/share/elasticsearch/plugins
    networks:
      - elastic
  kibana:
    image: kibana:7.10.1
    container_name: kibana
    environment:
      SERVER_NAME: kibana
      ELASTICSEARCH_HOSTS: http://es01:9200
      ELASTICSEARCH_URL: http://es01:9200
    ports:
      - 5601:5601
    # volumes:
    #  - g:/kibana/config:/usr/share/kibana/config
    networks:
      - elastic

  cerebro:
    image: lmenezes/cerebro:latest
    container_name: cerebro
    ports:
      - 9000:9000
    networks:
      - elastic

networks:
  elastic:
    driver: bridge
```

