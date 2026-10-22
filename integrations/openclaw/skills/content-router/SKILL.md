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
- Treat Jev as a category proposal; obey the CLI's deterministic `auto|ask` decision.
- Never send raw media, analysis, memory, sessions, or secrets to Jev. The core sends only title and summary.
- A human correction demotes autonomous classification until the threshold is recalibrated.
- Ask before external, public, destructive, irreversible, or paid actions.

## Commands

The installer creates a workspace-scoped launcher connected to the repository.
Run these commands from the OpenClaw workspace root:

```bash
node skills/content-router/run.mjs check
node skills/content-router/run.mjs index --records=examples/records --index=.data/index.json --semantic=e5
node skills/content-router/run.mjs search --index=.data/index.json --query="<query>" --top-k=5
node skills/content-router/run.mjs classify --title="<title>" --summary="<summary>"
node skills/content-router/run.mjs demote --reason="<human correction>"
```

`classify` requires `JEV_API_KEY`. Return the JSON result without inventing
records or scores. If `decision=ask`, show the proposed category plus its two
alternatives and wait for human confirmation.
