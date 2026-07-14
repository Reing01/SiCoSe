# SiCoSe Kubernetes

This set of manifests is designed for a professional Kubernetes environment:

- 3 replicas for frontend and backend by default
- readiness, liveness and startup probes
- rolling updates with zero-downtime rollout settings
- PodDisruptionBudgets
- HorizontalPodAutoscalers
- stateful PostgreSQL and Redis with persistent volumes
- Ingress routing for `/` and `/api`
- a dedicated migration Job for controlled schema rollout

## Build images

```bash
docker build -f backend/Dockerfile.prod -t sicose-backend:1.0.0 backend
docker build -f frontend/Dockerfile.prod -t sicose-frontend:1.0.0 frontend
```

Push those images to your registry, then update the `image:` values in `k8s/base/backend.yaml` and `k8s/base/frontend.yaml`.

## Apply

```bash
kubectl apply -k k8s/overlays/prod
kubectl wait --for=condition=complete job/sicose-migrate -n sicose-prod --timeout=10m
```

## Notes

- Replace the placeholder values in `k8s/base/secret.yaml` before applying to a real cluster.
- `kubernetes.io/ingress.class: nginx` assumes the NGINX Ingress Controller.
- The `sicose-migrate` Job is included in the prod overlay and should complete during the release.
- Backend readiness stays false until the base schema exists, so traffic only reaches healthy, migrated pods.
