import 'dotenv/config';
import crypto from 'node:crypto';

export const PORT = Number(process.env.PORT || 3001);
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const JWT_SECRET =
  process.env.JWT_SECRET ||
  'development-only-vigil-secret-change-before-production';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production.');
}

export function hashPrompt(prompt) {
  return crypto.createHash('sha256').update(prompt).digest('hex');
}
