{{- define "sicose.name" -}}
{{- default .Chart.Name .Values.global.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "sicose.fullname" -}}
{{- if .Values.global.fullnameOverride -}}
{{- .Values.global.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "sicose.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "sicose.namespace" -}}
{{- .Values.global.namespace -}}
{{- end -}}

{{- define "sicose.labels" -}}
app.kubernetes.io/name: {{ include "sicose.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: Helm
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/part-of: sicose
{{- end -}}

{{- define "sicose.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sicose.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "sicose.targetReplicas" -}}
{{- mul (int .Values.cluster.physicalNodes) (int .Values.cluster.replicasPerNode) -}}
{{- end -}}

{{- define "sicose.backendReplicas" -}}
{{- default (include "sicose.targetReplicas" .) .Values.backend.replicaCount -}}
{{- end -}}

{{- define "sicose.frontendReplicas" -}}
{{- default (include "sicose.targetReplicas" .) .Values.frontend.replicaCount -}}
{{- end -}}
