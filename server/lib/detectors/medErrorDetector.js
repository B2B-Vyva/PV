import { requestJsonArray } from '../openaiClient.js';
import { extractPhrase, includesAny, makeObservation } from './heuristics.js';

export async function detectMedicationErrors(interaction) {
  const prompt = `You are a pharmacovigilance specialist.
Detect any medication errors or adherence issues in the patient report below.

Patient report: "${interaction.transcript_text}"

Errors to detect: missed dose, double dose, wrong time, wrong route, stopped medication, confused dosing, caregiver-administered error.

Return JSON array (or [] if none):
{
  "observation_type": "medication_error",
  "verbatim_extract": "exact phrase",
  "normalized_term": "e.g. missed doses",
  "suggested_meddra_pt": "Medication error",
  "suggested_meddra_code": "10026749",
  "ai_confidence": 0-100,
  "severity_indicator": "mild|moderate|serious|critical|unknown",
  "is_serious": false,
  "seriousness_criteria": []
}
Return ONLY the JSON array.`;

  const ai = await requestJsonArray(prompt, 600);
  if (ai) return ai;

  const text = interaction.transcript_text || '';
  if (!includesAny(text, ['missed', 'skipped', 'forgot', 'double dose', 'wrong time', 'stopped'])) {
    return [];
  }

  return [
    makeObservation({
      observation_type: 'medication_error',
      verbatim_extract: extractPhrase(text, ['missed', 'skipped', 'forgot', 'double dose']),
      normalized_term: 'medication adherence error',
      suggested_meddra_pt: 'Medication error',
      suggested_meddra_code: '10026749',
      ai_confidence: 86,
      severity_indicator: 'mild',
      is_serious: false,
      seriousness_criteria: [],
    }),
  ];
}
