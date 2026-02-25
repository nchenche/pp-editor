import { API_URL } from '../config';

/**
 * Submit a contact form message.
 *
 * @param {{ category: 'suggestion'|'bug'|'other', message: string, email: string, session_id?: string }} payload
 * @returns {Promise<{ ok: boolean, message: string, errors?: string[] }>}
 */
export async function submitContactMessage(payload) {
  const body = {
    ...payload,
    user_agent: navigator.userAgent,
  };

  const res = await fetch(`${API_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (res.status === 429) {
    return { ok: false, message: data?.message || 'Too many messages. Please try again later.' };
  }
  if (res.status === 422) {
    return { ok: false, message: data?.message || 'Validation error.', errors: data?.errors };
  }
  if (!res.ok) {
    return { ok: false, message: data?.message || 'Failed to send message. Please try again later.' };
  }

  return { ok: true, message: data?.message || 'Your message has been sent. Thank you!' };
}
