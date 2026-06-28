import OpenAI from 'openai';
import { AI_MODEL, OPENAI_API_KEY } from '../config.js';

export const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

export async function requestJsonArray(prompt, maxTokens = 800) {
  if (!openai) return null;

  try {
    const res = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: maxTokens,
    });

    const content = res.choices[0]?.message?.content?.trim() || '[]';
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function requestText(prompt, maxTokens = 300) {
  if (!openai) return null;

  try {
    const res = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: maxTokens,
    });
    return res.choices[0]?.message?.content?.trim() || '';
  } catch {
    return '';
  }
}
