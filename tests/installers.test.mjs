import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

function run(script, argumentsList) {
  return spawnSync(path.join(root, script), argumentsList, {
    cwd: root,
    encoding: 'utf8',
  });
}

for (const adapter of [
  {
    name: 'OpenClaw',
    script: 'scripts/install-openclaw.sh',
    installed: 'skills/content-router/SKILL.md',
  },
  {
    name: 'Claude Code',
    script: 'scripts/install-claude-code.sh',
    installed: '.claude/skills/content-router/SKILL.md',
  },
]) {
  test(`${adapter.name} installer supports dry run, installation and no-overwrite`, () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'content-router-adapter-'));
    try {
      const dryRun = run(adapter.script, ['--dry-run', temporary]);
      assert.equal(dryRun.status, 0, dryRun.stderr);
      assert.equal(fs.existsSync(path.join(temporary, adapter.installed)), false);

      const install = run(adapter.script, [temporary]);
      assert.equal(install.status, 0, install.stderr);
      assert.equal(fs.existsSync(path.join(temporary, adapter.installed)), true);

      const secondInstall = run(adapter.script, [temporary]);
      assert.equal(secondInstall.status, 1);
      assert.match(secondInstall.stderr, /Refusing to overwrite/);
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });
}
