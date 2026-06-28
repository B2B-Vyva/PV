import { requestJsonArray } from '../openaiClient.js';
import { extractPhrase, includesAny, makeObservation } from './heuristics.js';

export async function detectSafetyMentions(interaction) {
  const prompt = `You are a pharmacovigilance safety signal detector.
Analyse the patient report below for any possible adverse events, side effects, or safety concerns.

Patient report: "${interaction.transcript_text}"
Language: ${interaction.language}

For each safety mention found, return a JSON array. If none found, return [].
Each item:
{
  "observation_type": "adverse_event",
  "verbatim_extract": "exact phrase from text",
  "normalized_term": "cleaned medical term",
  "suggested_meddra_pt": "MedDRA preferred term",
  "suggested_meddra_code": "8-digit code or null",
  "ai_confidence": 0-100,
  "severity_indicator": "mild|moderate|serious|critical|unknown",
  "is_serious": true|false,
  "seriousness_criteria": ["death","life_threatening","hospitalization","disability","medically_important"]
}
Return ONLY the JSON array, no explanation, no markdown.`;

  const ai = await requestJsonArray(prompt, 800);
  if (ai) return ai;

  const text = interaction.transcript_text || '';
  const observations = [];

  if (includesAny(text, ['swelling', 'swollen', 'hard to swallow', 'throat', 'face'])) {
    observations.push(
      makeObservation({
        verbatim_extract: extractPhrase(text, ['swelling', 'swollen', 'swallow']),
        normalized_term: 'facial swelling with possible dysphagia',
        suggested_meddra_pt: 'Angioedema',
        suggested_meddra_code: '10002424',
        ai_confidence: 88,
        severity_indicator: 'serious',
        is_serious: true,
        seriousness_criteria: ['life_threatening', 'medically_important'],
      }),
    );
  }

  if (includesAny(text, ['breathing', 'short of breath', 'dyspnoea', 'dyspnea'])) {
    observations.push(
      makeObservation({
        verbatim_extract: extractPhrase(text, ['breathing', 'short of breath', 'dyspnoea', 'dyspnea']),
        normalized_term: 'breathing difficulty',
        suggested_meddra_pt: 'Dyspnoea',
        suggested_meddra_code: '10013968',
        ai_confidence: 82,
        severity_indicator: 'serious',
        is_serious: true,
        seriousness_criteria: ['medically_important'],
      }),
    );
  }

  if (includesAny(text, ['cough'])) {
    observations.push(
      makeObservation({
        verbatim_extract: extractPhrase(text, ['cough']),
        normalized_term: 'persistent cough',
        suggested_meddra_pt: 'Cough',
        suggested_meddra_code: '10011224',
        ai_confidence: 84,
        severity_indicator: 'mild',
      }),
    );
  }

  if (includesAny(text, ['ache', 'pain', 'myalgia', 'arms', 'legs'])) {
    observations.push(
      makeObservation({
        verbatim_extract: extractPhrase(text, ['ache', 'pain', 'myalgia']),
        normalized_term: 'muscle pain',
        suggested_meddra_pt: 'Myalgia',
        suggested_meddra_code: '10028411',
        ai_confidence: 78,
        severity_indicator: 'moderate',
      }),
    );
  }

  return observations;
}
