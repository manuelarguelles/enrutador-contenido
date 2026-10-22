---
name: content-router
description: Operate the portable Enrutador de Contenido CLI from Claude Code.
---

# Content Router for Claude Code

The installer creates a project-scoped launcher connected to the repository.
Run these commands from the target project root:

```bash
node .claude/skills/content-router/run.mjs check
node .claude/skills/content-router/run.mjs index --records=examples/records --index=.data/index.json --semantic=e5
node .claude/skills/content-router/run.mjs search --index=.data/index.json --query="<query>" --top-k=5
node .claude/skills/content-router/run.mjs classify --title="<title>" --summary="<summary>"
node .claude/skills/content-router/run.mjs demote --reason="<human correction>"
```

Treat JSON output as authoritative. Do not fabricate scores, IDs, or sources.
`classify` requires `JEV_API_KEY`. If `decision=ask`, present the selected
category and alternatives instead of confirming the classification yourself.
Do not inspect or copy user-level Claude Code credentials, settings, or history.
