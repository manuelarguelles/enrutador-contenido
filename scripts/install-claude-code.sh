#!/usr/bin/env bash
set -euo pipefail

dry_run=false
if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=true
  shift
fi
project="${1:-}"
if [[ -z "$project" ]]; then
  echo "Usage: $0 [--dry-run] /path/to/target-project" >&2
  exit 2
fi

source_dir="$(cd "$(dirname "$0")/.." && pwd)/integrations/claude-code/skills/content-router"
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
echo "Installed project skill. No user-level Claude Code files were changed."
