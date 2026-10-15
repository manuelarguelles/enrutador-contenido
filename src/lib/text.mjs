export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function tokens(value) {
  return normalize(value).match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function recordText(record) {
  return [
    record.title,
    record.summary,
    record.analysis,
    record.classification?.categories,
    record.classification?.facets,
    record.classification?.tags,
  ].flat().filter(Boolean).join('\n');
}

export function lexicalRanking(documents, query) {
  const queryTerms = [...new Set(tokens(query))];
  if (!queryTerms.length) return [];

  const tokenized = documents.map((document) => tokens(document.text));
  const averageLength = tokenized.reduce((sum, row) => sum + row.length, 0)
    / Math.max(tokenized.length, 1);
  const k1 = 1.2;
  const b = 0.75;

  return documents.map((document, index) => {
    const terms = tokenized[index];
    let score = 0;
    for (const term of queryTerms) {
      const frequency = terms.filter((candidate) => candidate === term).length;
      if (!frequency) continue;
      const documentFrequency = tokenized.filter((row) => row.includes(term)).length;
      const inverseDocumentFrequency = Math.log(
        1 + (tokenized.length - documentFrequency + 0.5) / (documentFrequency + 0.5),
      );
      const denominator = frequency + k1 * (
        1 - b + b * terms.length / Math.max(averageLength, 1)
      );
      score += inverseDocumentFrequency * ((frequency * (k1 + 1)) / denominator);
    }
    return { id: document.id, title: document.title, score };
  }).filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
