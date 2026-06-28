import { requestJsonArray } from '../openaiClient.js';
import { extractPhrase, includesAny, makeObservation } from './heuristics.js';

export async function detectTherapeuticFail(interaction) {
  const prompt = `Detect therapeutic failure in this patient report.
Therapeutic failure = medication not achieving intended effect.
Report: "${interaction.transcript_text}"
Return JSON array of findings (or []) with observation_type="therapeutic_failure".
Use the same schema as adverse event detection. Return ONLY the JSON array.`;

  const ai = await requestJsonArray(prompt, 600);
  if (ai) return ai;

  const text = interaction.transcript_text || '';
  if (!includesAny(text, ['not working', 'same symptoms', 'worse', 'still high', 'still in pain'])) {
    return [];
  }

  return [
    makeObservation({
      observation_type: 'therapeutic_failure',
      verbatim_extract: extractPhrase(text, ['not working', 'worse', 'still high', 'still in pain']),
      normalized_term: 'possible therapeutic failure',
      suggested_meddra_pt: 'Therapeutic product effect incomplete',
      suggested_meddra_code: null,
      ai_confidence: 72,
      severity_indicator: 'unknown',
    }),
  ];
}
