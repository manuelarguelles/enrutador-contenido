#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { loadRecords } from './lib/records.mjs';
import { buildIndex, searchIndex } from './router.mjs';

function parseArguments(argumentsList) {
  const [command = 'help', ...rest] = argumentsList;
  const options = {};
  for (const argument of rest) {
    if (!argument.startsWith('--')) continue;
    const separator = argument.indexOf('=');
    const key = separator === -1 ? argument.slice(2) : argument.slice(2, separator);
    options[key] = separator === -1 ? true : argument.slice(separator + 1);
  }
  return { command, options };
}

function usage() {
  return `content-router commands:
  check [--records=examples/records]
  index --records=examples/records --index=.data/index.json --semantic=mock|e5
  search --index=.data/index.json --query="..." [--top-k=5]
  demo

The mock semantic mode is deterministic and intended only for tests.
Use --semantic=e5 for Xenova/multilingual-e5-small.`;
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (['help', '--help', '-h'].includes(command)) {
    console.log(usage());
    return;
  }

  if (command === 'check') {
    const records = options.records ?? 'examples/records';
    const loaded = loadRecords(records);
    console.log(JSON.stringify({ ok: true, records: loaded.length, directory: records }));
    return;
  }

  if (command === 'index') {
    const result = await buildIndex({
      records: options.records ?? 'examples/records',
      index: options.index ?? '.data/index.json',
      semantic: options.semantic ?? process.env.CONTENT_ROUTER_SEMANTIC_MODE ?? 'e5',
      cacheDir: options['cache-dir'],
    });
    console.log(JSON.stringify({ action: 'index', ...result }, null, 2));
    return;
  }

  if (command === 'search') {
    if (!options.query) throw new Error('search requires --query="..."');
    const topK = Number(options['top-k'] ?? 5);
    if (!Number.isSafeInteger(topK) || topK < 1 || topK > 100) {
      throw new Error('--top-k must be an integer between 1 and 100');
    }
    const result = await searchIndex({
      index: options.index ?? '.data/index.json',
      query: options.query,
      topK,
      cacheDir: options['cache-dir'],
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'demo') {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'content-router-'));
    const indexPath = path.join(directory, 'index.json');
    try {
      await buildIndex({
        records: 'examples/records',
        index: indexPath,
        semantic: 'mock',
      });
      const result = await searchIndex({
        index: indexPath,
        query: 'arquitectura de cache distribuida',
        topK: 3,
      });
      console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
