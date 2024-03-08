---
title: 强制删除namespace
description: This is a document about 强制删除namespace.
---

```bash
kubectl get ns ingress-nginx -o json > test.json      

找到finalizers字段，删除其值。

 kubectl proxy --port=8081

curl -k -H "Content-Type: application/json" -X PUT --data-binary @test.json http://127.0.0.1:8081/api/v1/namespaces/ingress-nginx/finalize

```