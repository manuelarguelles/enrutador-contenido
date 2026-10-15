# OpenClaw integration

This adapter assumes that OpenClaw and the user's workspace already exist.
It does **not** install or replace identity, personality, memory, sessions,
channels, providers, credentials, or global agent instructions.

The installer adds only the `content-router` skill. Review the dry run first:

```bash
./scripts/install-openclaw.sh --dry-run /path/to/openclaw-workspace
./scripts/install-openclaw.sh /path/to/openclaw-workspace
```

The optional configuration fragment is documentation, not a complete
`openclaw.json`. Merge settings manually and keep secrets in OpenClaw's Secret
Store or the host environment.
