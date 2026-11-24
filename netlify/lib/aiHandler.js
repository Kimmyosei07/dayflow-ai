/**
 * Provider-independent AI request handler.
 *
 * This is pure logic (no Netlify-specific code) so it can be unit-tested
 * with a fake `fetch` and fake environment variables — see tests/aiHandler.test.js.
 *
 * Request  (POST JSON): { provider, system, messages: [{ role, content }], maxTokens, responseFormat }
 * Response (success)  : { ok: true, provider, model, text }
 * Response (failure)  : { ok: false, error: { code, message } }
 * GET returns which providers are configured (never the keys themselves).
 */
import { PROVIDERS } from './providers/index.js';
import { AiError } from './errors.js';

const LIMITS = {
  maxMessages: 40,
  maxMessageChars: 20000,
  maxTotalChars: 80000,
  maxSystemChars: 20000,
  defaultTokens: 2048,
  maxTokens: 8192,
  timeoutMs: 45000,
};

const isConfigured = (provider, env) => Boolean(env[provider.envKey] && String(env[provider.envKey]).trim());
const modelFor = (provider, env) => env[provider.modelEnvKey] || provider.defaultModel;

/** Public status: which providers can be used. Safe to send to the browser. */
export function getStatus(env) {
  const providers = Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    label: p.label,
    configured: isConfigured(p, env),
    model: modelFor(p, env),
  }));
  let defaultProvider = null;
  try {
    defaultProvider = resolveProvider('auto', env).id;
  } catch {
    /* none configured */
  }
  return { ok: true, configured: providers.some((p) => p.configured), defaultProvider, providers };
}

/** Picks the provider to use for a request, or throws a helpful error. */
export function resolveProvider(requested, env) {
  const all = Object.values(PROVIDERS);
  if (requested && requested !== 'auto') {
    const provider = PROVIDERS[requested];
    if (!provider) throw new AiError('UNKNOWN_PROVIDER', `Unknown AI provider "${requested}".`, 400);
    if (!isConfigured(provider, env)) {
      throw new AiError(
        'PROVIDER_NOT_CONFIGURED',
        `${provider.label} is not configured. Add ${provider.envKey} to your environment variables, or choose another provider in Settings.`,
        503,
      );
    }
    return provider;
  }
  const preferred = PROVIDERS[String(env.AI_PROVIDER || '').toLowerCase()];
  if (preferred && isConfigured(preferred, env)) return preferred;
  const fallback = all.find((p) => isConfigured(p, env));
  if (!fallback) {
    throw new AiError(
      'AI_NOT_CONFIGURED',
      'AI is not configured yet. Add GEMINI_API_KEY or ANTHROPIC_API_KEY to your Netlify environment variables.',
      503,
    );
  }
  return fallback;
}

/**
 * Validates the request body and returns a clean copy.
 * Consecutive messages with the same role are merged and leading assistant
 * messages are dropped, because both providers require the conversation to
 * start with a user turn.
 */
export function validateRequest(body) {
  if (!body || typeof body !== 'object') throw new AiError('INVALID_REQUEST', 'Request body must be a JSON object.', 400);
  const { messages, system = '', maxTokens, responseFormat = 'text', provider = 'auto' } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new AiError('INVALID_REQUEST', 'At least one message is required.', 400);
  }
  if (messages.length > LIMITS.maxMessages) {
    throw new AiError('INVALID_REQUEST', `Too many messages (max ${LIMITS.maxMessages}).`, 400);
  }
  if (typeof system !== 'string' || system.length > LIMITS.maxSystemChars) {
    throw new AiError('INVALID_REQUEST', 'System prompt is invalid or too long.', 400);
  }

  const cleaned = [];
  let total = 0;
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      throw new AiError('INVALID_REQUEST', 'Each message needs a role ("user" or "assistant") and text content.', 400);
    }
    const content = m.content.trim();
    if (!content) continue;
    if (content.length > LIMITS.maxMessageChars) throw new AiError('INVALID_REQUEST', 'A message is too long.', 400);
    total += content.length;
    const last = cleaned[cleaned.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${content}`;
    else cleaned.push({ role: m.role, content });
  }
  while (cleaned.length && cleaned[0].role === 'assistant') cleaned.shift();

  if (total > LIMITS.maxTotalChars) throw new AiError('INVALID_REQUEST', 'The conversation is too long. Start a new conversation.', 400);
  if (!cleaned.length || cleaned[cleaned.length - 1].role !== 'user') {
    throw new AiError('INVALID_REQUEST', 'The last message must be from the user.', 400);
  }

  const tokens = Number(maxTokens);
  return {
    provider: typeof provider === 'string' ? provider : 'auto',
    system,
    messages: cleaned,
    maxTokens: Number.isFinite(tokens) && tokens > 0 ? Math.min(Math.round(tokens), LIMITS.maxTokens) : LIMITS.defaultTokens,
    json: responseFormat === 'json',
  };
}

/**
 * Main entry point used by the Netlify Function.
 * Always resolves (never throws) to { status, body }.
 */
export async function handleAiRequest({ method, body, env, fetchImpl = globalThis.fetch }) {
  try {
    if (method === 'GET') return { status: 200, body: getStatus(env) };
    if (method !== 'POST') throw new AiError('METHOD_NOT_ALLOWED', 'Use GET or POST.', 405);

    const request = validateRequest(body);
    const provider = resolveProvider(request.provider, env);
    const model = modelFor(provider, env);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LIMITS.timeoutMs);
    let text;
    try {
      text = await provider.generate({
        apiKey: String(env[provider.envKey]).trim(),
        model,
        system: request.system,
        messages: request.messages,
        maxTokens: request.maxTokens,
        json: request.json,
        fetchImpl,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof AiError) throw error;
      if (error?.name === 'AbortError') throw new AiError('TIMEOUT', `${provider.label} took too long to respond. Please try again.`, 504);
      throw new AiError('NETWORK_ERROR', `Could not reach ${provider.label}. Check your connection and try again.`, 502);
    } finally {
      clearTimeout(timer);
    }

    return { status: 200, body: { ok: true, provider: provider.id, model, text } };
  } catch (error) {
    if (error instanceof AiError) {
      return { status: error.status, body: { ok: false, error: { code: error.code, message: error.message } } };
    }
    // Unknown failure: log server-side, return a generic message (no internals leaked).
    console.error('[ai] unexpected error', error);
    return { status: 500, body: { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server.' } } };
  }
}
