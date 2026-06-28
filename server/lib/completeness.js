export function scoreCompleteness(lead, observations = []) {
  let score = 0;
  const missing = [];

  if (lead.patient_id) {
    score += 25;
  } else {
    missing.push('identifiable_patient');
  }

  if (
    observations.some((observation) => observation.reporter_type) ||
    lead.has_identifiable_reporter
  ) {
    score += 25;
  } else {
    missing.push('identifiable_reporter');
  }

  if (lead.suspected_product) {
    score += 25;
  } else {
    missing.push('suspected_product');
  }

  if (lead.event_description || lead.suggested_meddra_pt) {
    score += 25;
  } else {
    missing.push('suspected_adverse_event');
  }

  if (!lead.onset_date) missing.push('onset_date');
  if (!lead.outcome) missing.push('outcome');
  if (!lead.dose) missing.push('dose');
  if (!lead.concomitant_meds) missing.push('concomitant_medications');

  return {
    score,
    missing,
    flags: {
      has_identifiable_patient: Boolean(lead.patient_id),
      has_identifiable_reporter: observations.some((observation) =>
        Boolean(observation.reporter_type),
      ),
      has_suspected_product: Boolean(lead.suspected_product),
      has_suspected_event: Boolean(lead.event_description || lead.suggested_meddra_pt),
    },
  };
}

export function checkMinimumICRSFields(lead, observations = []) {
  const { score, missing } = scoreCompleteness(lead, observations);
  return {
    complete: score === 100,
    score,
    missing,
  };
}
