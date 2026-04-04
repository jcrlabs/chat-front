

## CI/CD Pipeline

### Flujo estándar de la organización

- **Rama `develop`** → despliega automáticamente en entorno **test**
- **Tag `v*`** → despliega en **producción**

```bash
# Release a producción
git tag v1.0.0 && git push --tags
```

**GitHub Actions secrets requeridos:**
- `KUBECONFIG` — kubeconfig en base64 (`base64 -w0 ~/.kube/config`)

### Helm chart (`deploy/helm/`)
```
deploy/helm/
├── Chart.yaml
├── values.yaml          # valores por defecto
├── values-prod.yaml     # tag imagen prod + host ingress
├── values-test.yaml     # tag imagen test + host ingress test
└── templates/
```