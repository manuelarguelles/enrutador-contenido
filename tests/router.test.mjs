import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { mockEmbedding } from '../src/lib/semantic.mjs';
import { loadRecords, validateRecord } from '../src/lib/records.mjs';
import { reciprocalRankFusion } from '../src/lib/rrf.mjs';
import { lexicalRanking, normalize, tokens } from '../src/lib/text.mjs';
import { buildIndex, searchIndex } from '../src/router.mjs';

test('normalization is accent-insensitive and tokenization is Unicode-aware', () => {
  assert.equal(normalize('Búsqueda HÍBRIDA'), 'busqueda hibrida');
  assert.deepEqual(tokens('RAG + caché'), ['rag', 'cache']);
});

test('lexical ranking places the cache record first', () => {
  const documents = loadRecords('examples/records');
  const ranking = lexicalRanking(documents, 'cache distribuida invalidacion');
  assert.equal(ranking[0].id, 'CAC_001');
});

test('mock embeddings are deterministic and normalized', () => {
  const first = mockEmbedding('arquitectura de cache');
  const second = mockEmbedding('arquitectura de cache');
  assert.deepEqual(first, second);
  const norm = Math.sqrt(first.reduce((sum, value) => sum + value * value, 0));
  assert.ok(Math.abs(norm - 1) < 1e-9);
});

test('RRF preserves channel reasons and ranks', () => {
  const fused = reciprocalRankFusion({
    lexical: [{ id: 'A', title: 'A', score: 2 }, { id: 'B', title: 'B', score: 1 }],
    semantic: [{ id: 'B', title: 'B', score: 0.9 }, { id: 'A', title: 'A', score: 0.8 }],
  }, { k: 60, limit: 2 });
  assert.equal(fused.length, 2);
  assert.deepEqual(new Set(fused[0].reasons), new Set(['lexical', 'semantic']));
  assert.ok(fused.every((result) => result.lexical_rank && result.semantic_rank));
});

test('build and search work end to end without credentials', async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'content-router-test-'));
  const indexPath = path.join(temporary, 'index.json');
  try {
    const built = await buildIndex({
      records: 'examples/records',
      index: indexPath,
      semantic: 'mock',
    });
    assert.equal(built.documents, 6);
    const result = await searchIndex({
      index: indexPath,
      query: 'arquitectura de cache distribuida',
      topK: 3,
    });
    assert.equal(result.results[0].id, 'CAC_001');
    assert.ok(result.results[0].reasons.includes('lexical'));
    assert.ok(result.results[0].reasons.includes('semantic'));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test('records reject unsafe source protocols', () => {
  assert.throws(() => validateRecord({
    id: 'SEC_999',
    title: 'Unsafe',
    summary: 'Unsafe source',
    source: { url: 'file:///etc/passwd', platform: 'demo' },
    classification: { categories: ['ai_security'], facets: [], tags: [] },
  }), /http or https/);
});
