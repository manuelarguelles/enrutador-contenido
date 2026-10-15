#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const configPath = new URL('./content-router.config.json', import.meta.url);
if (!fs.existsSync(configPath)) {
  throw new Error('Missing content-router.config.json; reinstall the adapter');
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const cli = path.join(config.repository, 'src', 'cli.mjs');
if (!path.isAbsolute(config.repository) || !fs.existsSync(cli)) {
  throw new Error('Configured content-router repository is unavailable; reinstall the adapter');
}
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: config.repository,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
