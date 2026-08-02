# SiCoSe Helm Chart

This chart is the recommended production path for SiCoSe.

## What it gives you

- replicas calculated from `cluster.physicalNodes * cluster.replicasPerNode` by default
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

## Practice profile for 4 physical nodes

Use this profile when you want the workload distributed across a 4-machine cluster:

- `backend` and `frontend` scale to 12 replicas total
- the chart keeps the pods spread across nodes through `topologySpreadConstraints`
- autoscaling is disabled to keep the practice deterministic
- PodDisruptionBudget is raised to keep the cluster stable during maintenance
- the practice profile pulls the latest images from GHCR
- the practice profile uses strict scheduling so one node does not absorb extra replicas
- replica count is controlled by `cluster.physicalNodes: 4` and `cluster.replicasPerNode: 3`

One-command deploy from the repo root:

```bash
npm run deploy:cluster:4nodos
```

The profile file lives at `helm/sicose/values-practica-4-nodos.yaml`.

## Local and template verification

From the repo root, this validates both supported deployment paths:

```bash
docker compose up -d && helm template sicose ./helm/sicose -f ./helm/sicose/values-practica-4-nodos.yaml
```

Compose has safe local defaults that mirror `.env.example`; create an untracked `.env` only when you need overrides. Put real production secrets in an untracked values file, CI/CD secret store, or an external secrets controller.

## Example production flow

1. Build and push `sicose-backend` and `sicose-frontend` images.
2. Override the image repositories and host in a values file.
3. Apply the release.
4. Wait for the migration job to complete.

## Notes

- The chart names resources using the Helm release name, so you can safely run multiple environments.
- Secrets in `values.yaml` are placeholders only. Replace them in your own values file or external secret system.
- The frontend health endpoint is `/health`, and the backend exposes `/health/live` and `/health/ready`.
