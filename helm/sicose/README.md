# SiCoSe Helm Chart

This chart is the recommended production path for SiCoSe.

## What it gives you

- 3 replicas for frontend and backend by default
- readiness, liveness, and startup probes
- rolling updates with zero-downtime rollout settings
- PodDisruptionBudgets
- HorizontalPodAutoscalers
- dedicated migration Job
- Stateful PostgreSQL and Redis with persistent volumes
- Ingress routing for `/` and `/api`

## Install

```bash
helm upgrade --install sicose ./helm/sicose \
  --namespace sicose-prod \
  --create-namespace
```

## Example production flow

1. Build and push `sicose-backend` and `sicose-frontend` images.
2. Override the image repositories and host in a values file.
3. Apply the release.
4. Wait for the migration job to complete.

## Notes

- The chart names resources using the Helm release name, so you can safely run multiple environments.
- Secrets in `values.yaml` are placeholders only. Replace them in your own values file or external secret system.
- The frontend health endpoint is `/health`, and the backend exposes `/health/live` and `/health/ready`.
