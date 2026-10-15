# Claude Code integration

This adapter is project-scoped. It does not copy `~/.claude`, credentials,
history, plugins, or personal settings.

Review the dry run, then install the skill into another checkout:

```bash
./scripts/install-claude-code.sh --dry-run /path/to/target-project
./scripts/install-claude-code.sh /path/to/target-project
```
