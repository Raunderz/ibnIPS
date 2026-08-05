# AGENTS.md

## Branching rules (IMPORTANT)

- NEVER push directly to the `main` branch.
- NEVER work directly on the `main` branch.
- ALWAYS create a feature branch for any work, and push to that branch.
- Before starting work, and before pushing, ALWAYS keep in sync with `main`:

```sh
git fetch
git pull origin main
```

- Do not force-push, and do not rewrite pushed history.
