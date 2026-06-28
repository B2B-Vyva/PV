import { checkForDuplicate } from './duplicates.js';
import { detectSafetyMentions } from './detectors/aeDetector.js';
import { detectMedicationErrors } from './detectors/medErrorDetector.js';
import { detectTherapeuticFail } from './detectors/tfDetector.js';
import { detectFallRisk } from './detectors/fallDetector.js';

export async function processInteraction(interaction, project, runner) {
  const observations = [];

  if (project.detect_adverse_events) {
    observations.push(...(await detectSafetyMentions(interaction)));
  }
  if (project.detect_medication_errors) {
    observations.push(...(await detectMedicationErrors(interaction)));
  }
  if (project.detect_therapeutic_failure) {
    observations.push(...(await detectTherapeuticFail(interaction)));
  }
  if (project.detect_fall_risk) {
    observations.push(...(await detectFallRisk(interaction)));
  }

  if (observations.length === 0) {
    await runner.query(
      `
        UPDATE interactions
        SET ai_processed = TRUE,
            ai_processed_at = NOW(),
            safety_mention_detected = FALSE
        WHERE id = $1
      `,
      [interaction.id],
    );
    return { observations: [] };
  }

  const saved = [];
  for (const obs of observations) {
    const duplicate = await checkForDuplicate(
      interaction.organization_id,
      interaction.patient_id,
      obs.suggested_meddra_code,
      runner,
    );

    const { rows } = await runner.query(
      `
        INSERT INTO safety_observations
          (organization_id, interaction_id, patient_id, product_id,
           observation_type, verbatim_extract, normalized_term,
           suggested_meddra_pt, suggested_meddra_code,
           ai_confidence, severity_indicator, is_serious, seriousness_criteria,
           is_duplicate_candidate)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *
      `,
      [
        interaction.organization_id,
        interaction.id,
        interaction.patient_id,
        project.product_id,
        obs.observation_type,
        obs.verbatim_extract,
        obs.normalized_term,
        obs.suggested_meddra_pt,
        obs.suggested_meddra_code,
        obs.ai_confidence,
        obs.severity_indicator,
        Boolean(obs.is_serious),
        obs.seriousness_criteria || [],
        Boolean(duplicate),
      ],
    );
    saved.push(rows[0]);
  }

  await runner.query(
    `
      UPDATE interactions
      SET ai_processed = TRUE,
          ai_processed_at = NOW(),
          safety_mention_detected = TRUE,
          observations_count = $1
      WHERE id = $2
    `,
    [saved.length, interaction.id],
  );

  return { observations: saved };
}
