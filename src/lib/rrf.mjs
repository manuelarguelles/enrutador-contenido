export function reciprocalRankFusion(rankings, options = {}) {
  const k = options.k ?? 60;
  const limit = options.limit ?? 10;
  const merged = new Map();

  for (const [channel, hits] of Object.entries(rankings)) {
    hits.forEach((hit, index) => {
      const current = merged.get(hit.id) ?? {
        id: hit.id,
        title: hit.title,
        score: 0,
        reasons: [],
      };
      current.score += 1 / (k + index + 1);
      current.reasons = [...new Set([...current.reasons, channel])];
      current[`${channel}_rank`] = index + 1;
      current[`${channel}_score`] = hit.score;
      merged.set(hit.id, current);
    });
  }

  return [...merged.values()]
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit);
}
