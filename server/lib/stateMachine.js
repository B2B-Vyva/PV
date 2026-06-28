export const VALID_TRANSITIONS = {
  new: ['ai_structured', 'urgent_review', 'closed_non_pv', 'closed_insufficient'],
  ai_structured: [
    'needs_followup',
    'urgent_review',
    'in_medical_review',
    'ready_handoff',
    'closed_non_pv',
    'closed_duplicate',
    'closed_insufficient',
  ],
  needs_followup: [
    'ai_structured',
    'urgent_review',
    'in_medical_review',
    'closed_non_pv',
    'closed_insufficient',
  ],
  caregiver_requested: ['needs_followup', 'urgent_review', 'closed_non_pv'],
  urgent_review: ['in_medical_review', 'ready_handoff', 'closed_non_pv', 'closed_duplicate'],
  in_medical_review: [
    'ready_handoff',
    'urgent_review',
    'needs_followup',
    'closed_non_pv',
    'closed_insufficient',
  ],
  ready_handoff: ['exported'],
  exported: [],
  closed_non_pv: [],
  closed_duplicate: [],
  closed_insufficient: [],
};

export function validateTransition(currentStatus, newStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    const error = new Error(`Invalid transition: ${currentStatus} -> ${newStatus}`);
    error.status = 422;
    throw error;
  }
}
