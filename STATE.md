# State — 2026-10-22

## Current phase

Release `v0.2.0` lista para publicación: añade Jev como juez opcional de
categoría y mantiene la decisión final en una política local, determinista y
auditable.

## Decisions

- Un núcleo compartido; OpenClaw y Claude Code son adaptadores.
- Repo público nuevo generado desde una lista permitida.
- Datos reales, identidad, memoria, sesiones y credenciales quedan fuera.
- Jev recibe solo `title + summary`; nunca análisis, media o contexto privado.
- `auto` exige confianza ≥ 0.90 y categoría distinta de `uncategorized`.
- Duda, contenido insuficiente, umbral nulo o corrección humana fuerzan `ask`.

## Next action

Publicar `v0.2.0` y comprobar GitHub Actions.

## Release evidence — v0.2.0

- Suite local: 25/25 pruebas.
- Validación remota de contrato: `jev-latest` propuso `RAG` con confianza 1.0
  y la política devolvió `auto`; la credencial no se imprimió ni versionó.
- `npm run verify`: contratos, demo y política de seguridad aprobados.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades.
- `npm pack --dry-run`: 45 archivos, 237118 bytes sin desempaquetar.
- Clon limpio local: `npm ci` y `npm run verify` aprobados (25/25 pruebas).
- `git diff --check`: sin errores.

## Release evidence — v0.1.0

- `code-review`: READY tras corregir defaults, validación de esquema,
  launchers y manejo de symlinks.
- `code-security`: sin secretos ni vulnerabilidades reportables; Gitleaks
  validó archivos e historial y `npm audit` reportó 0 vulnerabilidades.
- Suite local: 13/13 pruebas.
- Clon limpio: instalación, verificación, adaptadores y E5 real aprobados.
