export function makeObservation(overrides) {
  return {
    observation_type: 'adverse_event',
    verbatim_extract: '',
    normalized_term: null,
    suggested_meddra_pt: null,
    suggested_meddra_code: null,
    ai_confidence: 72,
    severity_indicator: 'unknown',
    is_serious: false,
    seriousness_criteria: [],
    ...overrides,
  };
}

export function includesAny(text, terms) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

export function extractPhrase(text, terms) {
  const lower = text.toLowerCase();
  const index = terms
    .map((term) => lower.indexOf(term))
    .filter((termIndex) => termIndex >= 0)
    .sort((a, b) => a - b)[0];

  if (index === undefined) return text.slice(0, 160);
  const start = Math.max(0, index - 32);
  const end = Math.min(text.length, index + 96);
  return text.slice(start, end).trim();
}
