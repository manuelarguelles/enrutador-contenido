# Enrutador de Contenido

Use the repository CLI as the source of truth. Do not duplicate routing,
retrieval, or persistence logic in Claude Code instructions.

- Run `npm run verify` before proposing changes.
- Use `mock` semantic mode only for deterministic tests.
- Use `e5` for real hybrid retrieval.
- Never read or publish user-level Claude settings, history, or credentials.
