import fs from 'node:fs';
import path from 'node:path';

import { recordText } from './text.mjs';

const REQUIRED_KEYS = ['id', 'title', 'summary', 'source', 'classification'];

export function validateRecord(record, source = '<memory>') {
  for (const key of REQUIRED_KEYS) {
    if (!(key in record)) throw new Error(`${source}: missing required field ${key}`);
  }
  if (!/^[A-Z][A-Z0-9_]*_[0-9]{3}$/.test(record.id)) {
    throw new Error(`${source}: invalid id ${record.id}`);
  }
  const url = new URL(record.source.url);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${source}: source URL must use http or https`);
  }
  if (!Array.isArray(record.classification.categories)
      || record.classification.categories.length === 0) {
    throw new Error(`${source}: at least one category is required`);
  }
  for (const key of ['facets', 'tags']) {
    if (!Array.isArray(record.classification[key])) {
      throw new Error(`${source}: classification.${key} must be an array`);
    }
  }
  return record;
}

export function loadRecords(directory) {
  const absoluteDirectory = path.resolve(directory);
  if (!fs.existsSync(absoluteDirectory)) {
    throw new Error(`Records directory not found: ${absoluteDirectory}`);
  }
  const seen = new Set();
  return fs.readdirSync(absoluteDirectory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const source = path.join(absoluteDirectory, file);
      const record = validateRecord(JSON.parse(fs.readFileSync(source, 'utf8')), source);
      if (seen.has(record.id)) throw new Error(`Duplicate record id: ${record.id}`);
      seen.add(record.id);
      return {
        id: record.id,
        title: record.title,
        text: recordText(record),
        sourceFile: file,
      };
    });
}
