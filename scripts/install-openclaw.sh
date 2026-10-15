#!/usr/bin/env bash
set -euo pipefail

dry_run=false
if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=true
  shift
fi
workspace_input="${1:-}"
if [[ -z "$workspace_input" ]]; then
  echo "Usage: $0 [--dry-run] /path/to/openclaw-workspace" >&2
  exit 2
fi

if [[ ! -d "$workspace_input" ]]; then
  echo "OpenClaw workspace must be an existing directory: $workspace_input" >&2
  exit 2
fi
workspace="$(cd "$workspace_input" && pwd -P)"
if [[ -L "$workspace/skills" ]]; then
  echo "Refusing symlinked destination parent: $workspace/skills" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd -P)"
source_dir="$repo_root/integrations/openclaw/skills/content-router"
destination="$workspace/skills/content-router"
if [[ -e "$destination" ]]; then
  echo "Refusing to overwrite existing path: $destination" >&2
  exit 1
fi

echo "Would install: $source_dir -> $destination"
if [[ "$dry_run" == true ]]; then
  exit 0
fi
mkdir -p "$(dirname "$destination")"
cp -R "$source_dir" "$destination"
node -e 'const fs=require("node:fs"); fs.writeFileSync(process.argv[1], JSON.stringify({repository:process.argv[2]}, null, 2)+"\n", {mode:0o600})' "$destination/content-router.config.json" "$repo_root"
echo "Installed content-router skill. No identity, memory, session, channel, or secret files were changed."
