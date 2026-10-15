#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(process.argv[2] ?? defaultRoot);
const ignoredDirectories = new Set(['.git', 'node_modules', '.data', '.model-cache']);
const forbiddenBasenames = new Set([
  'IDENTITY.md',
  'USER.md',
  'SOUL.md',
  'MEMORY.md',
  'openclaw.json',
]);
const forbiddenDirectoryNames = new Set(['memory', 'sessions']);
const findings = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute);
    if (entry.isSymbolicLink()) {
      findings.push(`${relative}: symbolic links are not allowed in the public release`);
      continue;
    }
    if (entry.isDirectory()) {
      if (forbiddenDirectoryNames.has(entry.name)) {
        findings.push(`${relative}: forbidden personal-state directory`);
      } else {
        walk(absolute);
      }
      continue;
    }
    if (forbiddenBasenames.has(entry.name)) {
      findings.push(`${relative}: forbidden host-owned file`);
    }
    if (relative === 'scripts/security-check.mjs' || relative === 'SECURITY_AUDIT.md') continue;
    if (fs.statSync(absolute).size > 1_000_000) {
      findings.push(`${relative}: file exceeds the 1 MB review limit`);
      continue;
    }
    const content = fs.readFileSync(absolute, 'utf8');
    const checks = [
      [/\/Users\/[A-Za-z0-9._-]+\//, 'absolute macOS home path'],
      [/[A-Za-z]:\\Users\\[^\\]+\\/, 'absolute Windows home path'],
      [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
      [/[a-z0-9._%+-]+@(?!example\.com\b)[a-z0-9.-]+\.[a-z]{2,}/i, 'non-example email'],
      [/(?:password|api[_-]?key|token)\s*[:=]\s*["'][^"'\n]{8,}["']/i, 'possible hardcoded credential'],
    ];
    for (const [pattern, label] of checks) {
      if (pattern.test(content)) findings.push(`${relative}: ${label}`);
    }
  }
}

walk(root);
if (findings.length) {
  console.error('Security policy violations:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log('Security policy check passed: no personal state or obvious secrets detected.');
}
