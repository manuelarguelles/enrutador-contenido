---
name: content-router
description: Operate the portable Enrutador de Contenido CLI from Claude Code.
---

# Content Router for Claude Code

Run all commands from the repository root:

```bash
npm run check
npm run demo
node src/cli.mjs index --records=examples/records --index=.data/index.json --semantic=e5
node src/cli.mjs search --index=.data/index.json --query="<query>" --top-k=5
```

Treat JSON output as authoritative. Do not fabricate scores, IDs, or sources.
Do not inspect or copy user-level Claude Code credentials, settings, or history.
