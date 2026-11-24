/**
 * Netlify Function: /.netlify/functions/ai
 *
 * Thin HTTP wrapper around netlify/lib/aiHandler.js. API keys are read here
 * from server-side environment variables and never sent to the browser.
 */
import { handleAiRequest } from '../lib/aiHandler.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export default async (request) => {
  let body = null;
  if (request.method === 'POST') {
    try {
      body = await request.json();
    } catch {
      return json(400, { ok: false, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
    }
  }

  const result = await handleAiRequest({
    method: request.method,
    body,
    env: process.env,
  });
  return json(result.status, result.body);
};
