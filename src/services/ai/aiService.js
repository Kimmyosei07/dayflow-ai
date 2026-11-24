/**
 * Frontend AI service — the ONLY place React code talks to AI.
 *
 * Components call high-level functions (generatePlanOrder, askAssistant,
 * getDailyRecommendation). This file sends a provider-neutral request to
 * the Netlify Function, which picks Gemini or Claude on the server.
 * Switching provider is therefore just a setting, not a code change.
 */
import { buildPlannerPrompt } from './prompts/plannerPrompts.js';
import { buildAssistantSystemPrompt, buildRecommendationPrompt } from './prompts/assistantPrompts.js';

export const AI_ENDPOINT = '/.netlify/functions/ai';

/** Error with a machine-readable code so the UI can show the right message. */
export class AiServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Asks the backend which providers are configured.
 * `reachable: false` means the function isn't running — typically because the
 * app was started with `npm run dev` instead of `netlify dev`.
 */
export async function getAiStatus() {
  try {
    const res = await fetch(AI_ENDPOINT, { method: 'GET', headers: { Accept: 'application/json' } });
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json')) return { reachable: false, configured: false, providers: [], defaultProvider: null };
    const data = await res.json();
    return { reachable: true, configured: Boolean(data.configured), providers: data.providers ?? [], defaultProvider: data.defaultProvider ?? null };
  } catch {
    return { reachable: false, configured: false, providers: [], defaultProvider: null };
  }
}

/** Low-level call. Returns { text, provider, model } or throws AiServiceError. */
export async function generateText({ system, messages, provider = 'auto', maxTokens, responseFormat = 'text', signal }) {
  let res;
  try {
    res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages, provider, maxTokens, responseFormat }),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new AiServiceError('CANCELLED', 'Request cancelled.');
    throw new AiServiceError('NETWORK_ERROR', 'Could not reach the AI service. Check your internet connection.');
  }

  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    throw new AiServiceError(
      'FUNCTION_UNAVAILABLE',
      'The AI function is not running. Start the app with "netlify dev" locally, or deploy to Netlify.',
    );
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new AiServiceError('INVALID_RESPONSE', 'The AI service returned an unreadable response.');
  }
  if (!res.ok || !data.ok) {
    throw new AiServiceError(data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? 'The AI request failed.');
  }
  return { text: data.text, provider: data.provider, model: data.model };
}

/** Planner: asks the AI to order the selected tasks and explain why. */
export async function generatePlanOrder(params, provider) {
  const { system, user } = buildPlannerPrompt(params);
  return generateText({
    system,
    messages: [{ role: 'user', content: user }],
    provider,
    maxTokens: 2048,
    responseFormat: 'json',
  });
}

/** Assistant chat: sends the conversation (and optional user context). */
export async function askAssistant({ messages, context, displayName, now, provider, signal }) {
  return generateText({
    system: buildAssistantSystemPrompt({ context, displayName, now }),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    provider,
    maxTokens: 2048,
    signal,
  });
}

/** Dashboard: one short, actionable recommendation for today. */
export async function getDailyRecommendation({ context, displayName, now, provider }) {
  const { system, user } = buildRecommendationPrompt({ context, displayName, now });
  return generateText({ system, messages: [{ role: 'user', content: user }], provider, maxTokens: 600 });
}
