import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function publicUser(row) {
  return {
    id: row.id,
    organization_id: row.organization_id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    organization: {
      name: row.organization_name,
      slug: row.organization_slug,
      data_residency: row.data_residency,
      mfa_required: row.mfa_required,
    },
  };
}

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { rows } = await query(
      `
        SELECT
          u.*,
          o.name AS organization_name,
          o.slug AS organization_slug,
          o.data_residency,
          o.mfa_required
        FROM ss_users u
        JOIN organizations o ON o.id = u.organization_id
        WHERE lower(u.email) = lower($1) AND u.is_active = TRUE
      `,
      [email],
    );

    const user = rows[0];
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await query('UPDATE ss_users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { sub: user.id, orgId: user.organization_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' },
    );

    res.json({ token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
