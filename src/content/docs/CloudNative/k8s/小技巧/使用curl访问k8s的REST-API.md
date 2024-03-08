---
title: 使用curl访问k8s的REST API
description: This is a document about 使用curl访问k8s的REST API.
---

```bash
# 使用kubectl proxy代理
kubectl proxy --port=8080 &
curl http://localhost:8080/api/

# 使用token
# Check all possible clusters, as your .KUBECONFIG may have multiple contexts:
kubectl config view -o jsonpath='{"Cluster name\tServer\n"}{range .clusters[*]}{.name}{"\t"}{.cluster.server}{"\n"}{end}'

# Select name of cluster you want to interact with from above output:
export CLUSTER_NAME="some_server_name"

# Point to the API server referring the cluster name
APISERVER=$(kubectl config view -o jsonpath="{.clusters[?(@.name==\"$CLUSTER_NAME\")].cluster.server}")

# Create a secret to hold a token for the default service account
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: default-token
  annotations:
    kubernetes.io/service-account.name: default
type: kubernetes.io/service-account-token
EOF

# Wait for the token controller to populate the secret with a token:
while ! kubectl describe secret default-token | grep -E '^token' >/dev/null; do
  echo "waiting for token..." >&2
  sleep 1
done

# Get the token value
TOKEN=$(kubectl get secret default-token -o jsonpath='{.data.token}' | base64 --decode)

# Explore the API with TOKEN
curl -X GET $APISERVER/api --header "Authorization: Bearer $TOKEN" --insecure
```

## 参考链接
- [Access Clusters Using the Kubernetes API | Kubernetes](https://kubernetes.io/docs/tasks/administer-cluster/access-cluster-api/)
- [Kubernetes API Concepts | Kubernetes](https://kubernetes.io/docs/reference/using-api/api-concepts/)
