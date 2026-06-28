export async function logAudit({
  client,
  pool,
  userId,
  orgId,
  projectId,
  action,
  entityType,
  entityId,
  prev,
  next,
  ip,
}) {
  const runner = client || pool;
  await runner.query(
    `
      INSERT INTO audit_log
        (organization_id, project_id, user_id, action, entity_type, entity_id,
         previous_state, new_state, ip_address)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `,
    [
      orgId,
      projectId || null,
      userId || null,
      action,
      entityType,
      entityId || null,
      prev ? JSON.stringify(prev) : null,
      next ? JSON.stringify(next) : null,
      ip || null,
    ],
  );
}
