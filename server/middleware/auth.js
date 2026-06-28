import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { query } from '../db.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await query(
      `
        SELECT
          u.id, u.organization_id, u.email, u.full_name, u.role, u.is_active,
          o.name AS organization_name, o.slug AS organization_slug,
          o.data_residency, o.mfa_required
        FROM ss_users u
        JOIN organizations o ON o.id = u.organization_id
        WHERE u.id = $1 AND u.organization_id = $2 AND u.is_active = TRUE
      `,
      [payload.sub, payload.orgId],
    );

    if (!rows[0]) {
      return res.status(401).json({ error: 'Session is no longer valid.' });
    }

    req.user = rows[0];
    req.orgId = rows[0].organization_id;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}
