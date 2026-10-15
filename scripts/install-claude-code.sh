#!/usr/bin/env bash
set -euo pipefail

dry_run=false
if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=true
  shift
fi
project_input="${1:-}"
if [[ -z "$project_input" ]]; then
  echo "Usage: $0 [--dry-run] /path/to/target-project" >&2
  exit 2
fi

if [[ ! -d "$project_input" ]]; then
  echo "Target project must be an existing directory: $project_input" >&2
  exit 2
fi
project="$(cd "$project_input" && pwd -P)"
for parent in "$project/.claude" "$project/.claude/skills"; do
  if [[ -L "$parent" ]]; then
    echo "Refusing symlinked destination parent: $parent" >&2
    exit 1
  fi
done

repo_root="$(cd "$(dirname "$0")/.." && pwd -P)"
source_dir="$repo_root/integrations/claude-code/skills/content-router"
destination="$project/.claude/skills/content-router"
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
echo "Installed project skill. No user-level Claude Code files were changed."
