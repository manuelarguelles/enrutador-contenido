import path from 'node:path';
import process from 'node:process';

import { tokens } from './text.mjs';

export const E5_MODEL = 'Xenova/multilingual-e5-small';
export const E5_REVISION = '761b726dd34fb83930e26aab4e9ac3899aa1fa78';

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function l2Normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm ? vector.map((value) => value / norm) : vector;
}

export function mockEmbedding(text, dimensions = 64) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const words = tokens(text);
  const features = [...words, ...words.slice(1).map((word, index) => `${words[index]}_${word}`)];
  for (const feature of features) {
    const hash = fnv1a(feature);
    vector[hash % dimensions] += (hash & 1) === 0 ? 1 : -1;
  }
  return l2Normalize(vector);
}

export async function createEmbedder(mode, options = {}) {
  if (mode === 'mock') {
    return {
      metadata: { mode: 'mock', dimensions: 64, purpose: 'deterministic-tests-only' },
      embed: async (text) => mockEmbedding(text),
    };
  }
  if (mode !== 'e5') throw new Error(`Unsupported semantic mode: ${mode}`);

  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = path.resolve(
    options.cacheDir
      ?? process.env.CONTENT_ROUTER_MODEL_CACHE
      ?? '.model-cache',
  );
  env.allowLocalModels = true;

  const extractor = await pipeline('feature-extraction', E5_MODEL, {
    revision: E5_REVISION,
    dtype: 'int8',
    device: 'cpu',
  });

  return {
    metadata: {
      mode: 'e5',
      model: E5_MODEL,
      revision: E5_REVISION,
      dimensions: 384,
      pooling: 'mean',
      normalization: 'l2',
    },
    embed: async (text, kind = 'document') => {
      const prefix = kind === 'query' ? 'query: ' : 'passage: ';
      const output = await extractor(prefix + text, {
        pooling: 'mean',
        normalize: true,
        tokenizer_options: { truncation: true },
      });
      const vector = Array.from(output.data);
      if (vector.length !== 384 || vector.some((value) => !Number.isFinite(value))) {
        throw new Error(`Invalid E5 vector: ${vector.length} dimensions`);
      }
      return vector;
    },
  };
}

export function cosineRanking(documents, queryVector) {
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    score: document.vector.reduce(
      (sum, value, index) => sum + value * queryVector[index],
      0,
    ),
  })).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
