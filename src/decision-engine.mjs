import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CONFIG = 'config/decision-engine.json';

export function loadDecisionConfig(configPath = DEFAULT_CONFIG) {
  const absolutePath = path.resolve(configPath);
  const config = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  validateDecisionConfig(config);
  return config;
}

export function demoteAfterHumanCorrection(config, reason, now = new Date()) {
  validateDecisionConfig(config);
  if (typeof reason !== 'string' || !reason.trim()) {
    throw new Error('A human correction reason is required');
  }
  return {
    ...config,
    threshold: null,
    threshold_note: `Autonomy disabled after human correction at ${now.toISOString()}: ${reason.trim()}. Recalibrate before restoring a numeric threshold.`,
  };
}

export function writeDecisionConfig(configPath, config) {
  validateDecisionConfig(config);
  const absolutePath = path.resolve(configPath);
  fs.writeFileSync(absolutePath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return absolutePath;
}

export function validateDecisionConfig(config) {
  if (!config || typeof config !== 'object') throw new Error('Decision config must be an object');
  if (config.provider !== 'jev') throw new Error('Decision config provider must be jev');
  if (typeof config.model !== 'string' || !config.model) throw new Error('Decision config model is required');
  if (typeof config.base_url !== 'string' || !config.base_url.startsWith('https://')) {
    throw new Error('Decision config base_url must use https');
  }
  if (config.threshold !== null && (
    typeof config.threshold !== 'number' || config.threshold < 0 || config.threshold > 1
  )) throw new Error('Decision config threshold must be null or a number between 0 and 1');
  if (!Number.isSafeInteger(config.minimum_content_characters) || config.minimum_content_characters < 1) {
    throw new Error('minimum_content_characters must be a positive integer');
  }
  if (!Number.isSafeInteger(config.timeout_ms) || config.timeout_ms < 1) {
    throw new Error('timeout_ms must be a positive integer');
  }
  if (!Number.isSafeInteger(config.max_attempts) || config.max_attempts < 1) {
    throw new Error('max_attempts must be a positive integer');
  }
  if (!Number.isSafeInteger(config.alternative_count) || config.alternative_count < 0) {
    throw new Error('alternative_count must be a non-negative integer');
  }
  if (!config.criteria || typeof config.criteria !== 'object' || Object.keys(config.criteria).length < 2) {
    throw new Error('Decision config requires at least two category criteria');
  }
  if (!Object.hasOwn(config.criteria, 'uncategorized')) {
    throw new Error('Decision config criteria must include uncategorized');
  }
  return config;
}

export function contentText(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new Error('Content must be an object with title and/or summary');
  }
  return [content?.title, content?.summary].filter(Boolean).join('\n\n').trim();
}

export function rankAlternatives(probabilities = {}, selected, count = 2) {
  return Object.entries(probabilities)
    .filter(([category, confidence]) => category !== selected && Number.isFinite(confidence))
    .sort((left, right) => right[1] - left[1])
    .slice(0, count)
    .map(([category, confidence]) => ({ category, confidence }));
}

export function decideCategory(config, category, confidence, probabilities = {}) {
  const alternatives = rankAlternatives(
    probabilities,
    category,
    config.alternative_count ?? 2,
  );
  if (config.threshold === null) {
    return { decision: 'ask', reason: 'threshold is not calibrated', alternatives };
  }
  if (category === 'uncategorized') {
    return { decision: 'ask', reason: 'Jev did not find a clear category', alternatives };
  }
  if (!Number.isFinite(confidence) || confidence < config.threshold) {
    const observed = Number.isFinite(confidence) ? confidence.toFixed(2) : 'invalid';
    return {
      decision: 'ask',
      reason: `confidence ${observed} is below threshold ${config.threshold}`,
      alternatives,
    };
  }
  return {
    decision: 'auto',
    reason: `confidence ${confidence.toFixed(2)} meets threshold ${config.threshold}`,
    alternatives,
  };
}

function retryableStatus(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

async function requestJev(config, apiKey, body, fetchImpl) {
  const attempts = config.max_attempts ?? 3;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(`${config.base_url}/v1/systemone`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(config.timeout_ms ?? 90_000),
      });
      if (!response.ok) {
        const error = new Error(`Jev request failed with HTTP ${response.status}`);
        error.retryable = retryableStatus(response.status);
        if (!error.retryable || attempt === attempts) throw error;
        lastError = error;
      } else {
        return response.json();
      }
    } catch (error) {
      lastError = error;
      if (error.retryable === false || attempt === attempts) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  }
  throw lastError;
}

export async function classifyWithJev(content, options = {}) {
  const config = options.config ?? loadDecisionConfig(options.configPath);
  validateDecisionConfig(config);
  const text = contentText(content);
  if (text.length < config.minimum_content_characters) {
    return {
      provider: config.provider,
      model: config.model,
      category: 'uncategorized',
      confidence: 0,
      probabilities: {},
      decision: 'ask',
      reason: 'content is insufficient for an autonomous decision',
      alternatives: [],
    };
  }

  const apiKey = options.apiKey ?? process.env.JEV_API_KEY;
  if (!apiKey) throw new Error('JEV_API_KEY is required for Jev classification');
  const answer = await requestJev(config, apiKey, {
    model: config.model,
    state: text,
    questions: {
      category: {
        type: 'choice',
        instructions: 'Choose the primary topic. Decide what the content is really about, not its platform or format.',
        criteria: config.criteria,
      },
    },
  }, options.fetchImpl ?? fetch);

  const categoryAnswer = answer?.answers?.category;
  const category = categoryAnswer?.choice;
  const confidence = categoryAnswer?.confidence;
  const probabilities = categoryAnswer?.probabilities ?? {};
  const validConfidence = Number.isFinite(confidence) && confidence >= 0 && confidence <= 1;
  const validProbabilities = probabilities && typeof probabilities === 'object'
    && !Array.isArray(probabilities)
    && Object.entries(probabilities).every(([name, probability]) => (
      Object.hasOwn(config.criteria, name)
      && Number.isFinite(probability)
      && probability >= 0
      && probability <= 1
    ));
  if (!Object.hasOwn(config.criteria, category) || !validConfidence || !validProbabilities) {
    throw new Error('Jev returned an invalid category response');
  }
  return {
    provider: config.provider,
    model: config.model,
    category,
    confidence,
    probabilities,
    ...decideCategory(config, category, confidence, probabilities),
    usage: answer.usage,
  };
}
