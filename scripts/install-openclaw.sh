#!/usr/bin/env bash
set -euo pipefail

dry_run=false
if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=true
  shift
fi
workspace="${1:-}"
if [[ -z "$workspace" ]]; then
  echo "Usage: $0 [--dry-run] /path/to/openclaw-workspace" >&2
  exit 2
fi

source_dir="$(cd "$(dirname "$0")/.." && pwd)/integrations/openclaw/skills/content-router"
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
echo "Installed content-router skill. No identity, memory, session, channel, or secret files were changed."
