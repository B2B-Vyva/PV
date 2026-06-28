export async function checkForDuplicate(orgId, patientId, meddraCode, runner) {
  if (!patientId || !meddraCode) return null;

  const { rows } = await runner.query(
    `
      SELECT id, lead_number
      FROM safety_leads
      WHERE organization_id = $1
        AND patient_id = $2
        AND suggested_meddra_code = $3
        AND status NOT IN ('closed_non_pv','closed_duplicate','closed_insufficient','exported')
      LIMIT 1
    `,
    [orgId, patientId, meddraCode],
  );

  return rows[0] || null;
}
