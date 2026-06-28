import { requestJsonArray } from '../openaiClient.js';
import { extractPhrase, includesAny, makeObservation } from './heuristics.js';

export async function detectFallRisk(interaction) {
  const prompt = `Detect fall risk or fall events in this patient report.
Report: "${interaction.transcript_text}"
Return JSON array of findings (or []) with observation_type="fall_risk".
Return ONLY the JSON array.`;

  const ai = await requestJsonArray(prompt, 600);
  if (ai) return ai;

  const text = interaction.transcript_text || '';
  if (!includesAny(text, ['fell', 'fall', 'dizzy', 'afraid to walk', 'almost fell'])) {
    return [];
  }

  return [
    makeObservation({
      observation_type: 'fall_risk',
      verbatim_extract: extractPhrase(text, ['fell', 'fall', 'dizzy', 'almost fell']),
      normalized_term: 'fall risk or near fall',
      suggested_meddra_pt: 'Fall',
      suggested_meddra_code: '10016173',
      ai_confidence: 82,
      severity_indicator: 'serious',
      is_serious: true,
      seriousness_criteria: ['medically_important'],
    }),
  ];
}
