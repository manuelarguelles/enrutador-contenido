import fs from 'node:fs';
import path from 'node:path';

import { createEmbedder, cosineRanking } from './lib/semantic.mjs';
import { loadRecords } from './lib/records.mjs';
import { reciprocalRankFusion } from './lib/rrf.mjs';
import { lexicalRanking } from './lib/text.mjs';

export async function buildIndex(options) {
  const mode = options.semantic ?? 'mock';
  const documents = loadRecords(options.records);
  const embedder = await createEmbedder(mode, { cacheDir: options.cacheDir });
  const indexed = [];
  for (const document of documents) {
    indexed.push({
      ...document,
      vector: await embedder.embed(document.text, 'document'),
    });
  }
  const output = {
    version: 1,
    builtAt: new Date().toISOString(),
    lexical: { algorithm: 'bm25', k1: 1.2, b: 0.75 },
    semantic: embedder.metadata,
    fusion: { algorithm: 'rrf', k: 60 },
    documents: indexed,
  };
  const indexPath = path.resolve(options.index);
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, `${JSON.stringify(output, null, 2)}\n`);
  return { indexPath, documents: indexed.length, semantic: embedder.metadata };
}

export async function searchIndex(options) {
  const indexPath = path.resolve(options.index);
  if (!fs.existsSync(indexPath)) throw new Error(`Index not found: ${indexPath}`);
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const mode = index.semantic?.mode;
  if (!['mock', 'e5'].includes(mode)) throw new Error(`Unsupported index mode: ${mode}`);

  const embedder = await createEmbedder(mode, { cacheDir: options.cacheDir });
  const queryVector = await embedder.embed(options.query, 'query');
  const lexical = lexicalRanking(index.documents, options.query);
  const semantic = cosineRanking(index.documents, queryVector);
  return {
    query: options.query,
    semantic: index.semantic,
    fusion: index.fusion,
    results: reciprocalRankFusion(
      { lexical, semantic },
      { k: index.fusion.k, limit: options.topK ?? 5 },
    ),
  };
}
