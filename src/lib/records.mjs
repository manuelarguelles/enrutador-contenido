import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import { recordText } from './text.mjs';

const schemaPath = fileURLToPath(
  new URL('../../schemas/content-record.schema.json', import.meta.url),
);
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

export function validateRecord(record, source = '<memory>') {
  if (!validateSchema(record)) {
    const details = validateSchema.errors
      .map((error) => `${error.instancePath || '/'} ${error.message}`)
      .join('; ');
    throw new Error(`${source}: schema validation failed: ${details}`);
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
