import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  classifyWithJev,
  contentText,
  demoteAfterHumanCorrection,
  decideCategory,
  rankAlternatives,
  validateDecisionConfig,
} from '../src/decision-engine.mjs';

const config = {
  provider: 'jev',
  model: 'jev-latest',
  base_url: 'https://api.typesafe.ai',
  threshold: 0.9,
  minimum_content_characters: 40,
  timeout_ms: 1000,
  max_attempts: 1,
  alternative_count: 2,
  criteria: {
    RAG: 'Retrieval-Augmented Generation',
    system_design: 'Distributed systems',
    uncategorized: 'No clear category',
  },
};

test('decision config rejects insecure endpoints and missing fallback category', () => {
  assert.throws(() => validateDecisionConfig({ ...config, base_url: 'http://example.com' }), /https/);
  assert.throws(() => validateDecisionConfig({ ...config, max_attempts: 0 }), /max_attempts/);
  assert.throws(() => validateDecisionConfig({ ...config, timeout_ms: 0 }), /timeout_ms/);
  const { uncategorized, ...criteria } = config.criteria;
  assert.throws(() => validateDecisionConfig({ ...config, criteria }), /uncategorized/);
});

test('content text contains only the title and summary', () => {
  assert.equal(contentText({
    title: 'Hybrid retrieval',
    summary: 'BM25 and embeddings',
    analysis: 'Do not leak this field',
  }), 'Hybrid retrieval\n\nBM25 and embeddings');
  assert.throws(() => contentText('raw media transcript'), /object/);
});

test('high confidence is automatic and alternatives preserve probability order', () => {
  const result = decideCategory(config, 'RAG', 0.96, {
    RAG: 0.96,
    system_design: 0.03,
    uncategorized: 0.01,
  });
  assert.equal(result.decision, 'auto');
  assert.deepEqual(result.alternatives, [
    { category: 'system_design', confidence: 0.03 },
    { category: 'uncategorized', confidence: 0.01 },
  ]);
});

test('low confidence, uncategorized and uncalibrated thresholds require a human', () => {
  assert.equal(decideCategory(config, 'RAG', 0.71).decision, 'ask');
  assert.equal(decideCategory(config, 'uncategorized', 0.99).decision, 'ask');
  assert.equal(decideCategory({ ...config, threshold: null }, 'RAG', 0.99).decision, 'ask');
});

test('a human correction disables autonomous routing until recalibration', () => {
  const demoted = demoteAfterHumanCorrection(
    config,
    'RAG was corrected to system_design',
    new Date('2026-10-22T05:00:00Z'),
  );
  assert.equal(demoted.threshold, null);
  assert.match(demoted.threshold_note, /human correction/);
  assert.equal(decideCategory(demoted, 'RAG', 1).decision, 'ask');
});

test('alternative ranking excludes the selected category and invalid scores', () => {
  assert.deepEqual(rankAlternatives({ A: 0.8, B: 0.1, C: Number.NaN }, 'A', 2), [
    { category: 'B', confidence: 0.1 },
  ]);
});

test('insufficient content never calls Jev', async () => {
  let called = false;
  const result = await classifyWithJev({ summary: 'too short' }, {
    config,
    apiKey: 'fixture',
    fetchImpl: async () => { called = true; },
  });
  assert.equal(called, false);
  assert.equal(result.decision, 'ask');
  assert.equal(result.category, 'uncategorized');
});

test('Jev response is normalized into an auditable routing decision', async () => {
  const result = await classifyWithJev({
    title: 'Hybrid retrieval for RAG',
    summary: 'Combines lexical and semantic search with reciprocal rank fusion.',
  }, {
    config,
    apiKey: 'fixture',
    fetchImpl: async (url, request) => {
      assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
      assert.equal(request.headers.Authorization, 'Bearer fixture');
      return {
        ok: true,
        json: async () => ({
          answers: {
            category: {
              choice: 'RAG',
              confidence: 0.94,
              probabilities: { RAG: 0.94, system_design: 0.05, uncategorized: 0.01 },
            },
          },
          usage: { input_tokens: 24, output_tokens: 4 },
        }),
      };
    },
  });
  assert.equal(result.category, 'RAG');
  assert.equal(result.decision, 'auto');
  assert.equal(result.alternatives[0].category, 'system_design');
  assert.deepEqual(result.usage, { input_tokens: 24, output_tokens: 4 });
});

test('invalid Jev categories fail closed', async () => {
  await assert.rejects(() => classifyWithJev({
    title: 'Long enough title for classification',
    summary: 'Long enough summary to cross the configured minimum content size.',
  }, {
    config,
    apiKey: 'fixture',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ answers: { category: { choice: 'unknown', confidence: 0.99 } } }),
    }),
  }), /invalid category response/);
});

test('out-of-range Jev confidence and probability values fail closed', async () => {
  const content = {
    title: 'Long enough title for classification',
    summary: 'Long enough summary to cross the configured minimum content size.',
  };
  await assert.rejects(() => classifyWithJev(content, {
    config,
    apiKey: 'fixture',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        answers: { category: { choice: 'RAG', confidence: 1.2, probabilities: { RAG: 1.2 } } },
      }),
    }),
  }), /invalid category response/);
});

test('non-retryable Jev errors fail after one request', async () => {
  let calls = 0;
  await assert.rejects(() => classifyWithJev({
    title: 'Long enough title for classification',
    summary: 'Long enough summary to cross the configured minimum content size.',
  }, {
    config: { ...config, max_attempts: 3 },
    apiKey: 'fixture',
    fetchImpl: async () => {
      calls += 1;
      return { ok: false, status: 401 };
    },
  }), /HTTP 401/);
  assert.equal(calls, 1);
});

test('CLI demote persists a fail-closed threshold', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'content-router-demote-'));
  const configPath = path.join(temporary, 'decision-engine.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config));
    const result = spawnSync(process.execPath, [
      'src/cli.mjs',
      'demote',
      `--config=${configPath}`,
      '--reason=human corrected the category',
    ], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(fs.readFileSync(configPath, 'utf8')).threshold, null);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
