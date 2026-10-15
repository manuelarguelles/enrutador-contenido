---
name: content-router
description: Capture, validate, index, and search content through the portable Enrutador de Contenido CLI.
---

# Content Router for OpenClaw

This skill is an adapter. The repository CLI remains the source of truth.

## Prerequisites

- An existing, working OpenClaw installation and workspace.
- Node.js 22 or newer.
- The repository cloned locally and dependencies installed with `npm ci`.

## Rules

- Never copy or modify the user's identity, memory, sessions, channels, or secrets.
- Use the deterministic `mock` semantic mode only for tests.
- Use `e5` for real hybrid retrieval.
- Ask before external, public, destructive, irreversible, or paid actions.

## Commands

Run from the repository root:

```bash
npm run check
node src/cli.mjs index --records=examples/records --index=.data/index.json --semantic=e5
node src/cli.mjs search --index=.data/index.json --query="<query>" --top-k=5
```

Return the JSON result without inventing records or scores.
