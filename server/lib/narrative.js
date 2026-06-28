import { requestText } from './openaiClient.js';

export async function draftNarrative(lead, observations = [], interactions = []) {
  const evidenceSummary = interactions
    .map((interaction) => {
      const reporter = interaction.reporter_type || 'reporter';
      return `${interaction.channel} (${reporter}): "${interaction.transcript_text}"`;
    })
    .join('\n');

  const prompt = `You are a pharmacovigilance safety associate drafting a case narrative.
Write a 3-4 sentence factual narrative for the following safety lead.
Do NOT make medical conclusions. Do NOT assess causality definitively. Do NOT omit missing fields.

Patient: ${lead.patient_ref || 'unknown'}, age group ${lead.patient_age_group || 'unknown'}, ${lead.patient_sex || 'unknown'}, ${lead.patient_country || 'unknown'}
Product: ${lead.suspected_product || 'unknown'} ${lead.dose || ''}
Event: ${lead.event_description || lead.suggested_meddra_pt || 'unknown'}
Seriousness: ${lead.is_serious ? `Serious - ${(lead.seriousness_criteria || []).join(', ')}` : 'Non-serious'}
Missing fields: ${(lead.missing_fields || []).join(', ') || 'None'}

Source evidence:
${evidenceSummary}

Write the narrative in third person. End with: "Human PV review required."
Return ONLY the narrative text, no formatting.`;

  const ai = await requestText(prompt, 300);
  if (ai) return ai;

  const product = lead.suspected_product || 'the suspected product';
  const event = lead.event_description || lead.suggested_meddra_pt || 'a safety concern';
  const missing = (lead.missing_fields || []).length
    ? ` Missing fields include ${(lead.missing_fields || []).join(', ')}.`
    : '';
  const evidenceCount = observations.length || interactions.length;

  return `${lead.patient_ref || 'The patient'} reported ${event} during treatment with ${product}. ${evidenceCount} source evidence item(s) are linked to this lead. The seriousness status is ${lead.is_serious ? 'serious' : 'currently non-serious'}.${missing} Human PV review required.`;
}
