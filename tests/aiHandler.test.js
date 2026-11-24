import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAiRequest, validateRequest, resolveProvider } from '../netlify/lib/aiHandler.js';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const geminiOk = (text) => async () => json(200, { candidates: [{ content: { parts: [{ text }] } }] });
const claudeOk = (text) => async () => json(200, { content: [{ type: 'text', text }] });
const ask = (extra = {}) => ({ method: 'POST', body: { messages: [{ role: 'user', content: 'Hi' }], ...extra } });

test('GET reports configuration without exposing keys', async () => {
  const r = await handleAiRequest({ method: 'GET', env: { GEMINI_API_KEY: 'secret-123' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.configured, true);
  assert.equal(r.body.defaultProvider, 'gemini');
  assert.ok(!JSON.stringify(r.body).includes('secret-123'));
});

test('missing keys -> AI_NOT_CONFIGURED', async () => {
  const r = await handleAiRequest({ ...ask(), env: {} });
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, 'AI_NOT_CONFIGURED');
});

test('explicit provider without key -> PROVIDER_NOT_CONFIGURED', async () => {
  const r = await handleAiRequest({ ...ask({ provider: 'claude' }), env: { GEMINI_API_KEY: 'k' } });
  assert.equal(r.body.error.code, 'PROVIDER_NOT_CONFIGURED');
});

test('auto uses AI_PROVIDER when configured, otherwise any configured provider', () => {
  assert.equal(resolveProvider('auto', { GEMINI_API_KEY: 'a', ANTHROPIC_API_KEY: 'b', AI_PROVIDER: 'claude' }).id, 'claude');
  assert.equal(resolveProvider('auto', { ANTHROPIC_API_KEY: 'b', AI_PROVIDER: 'gemini' }).id, 'claude');
});

test('Gemini adapter: request shape and normalised response', async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init, body: JSON.parse(init.body) };
    return geminiOk('Hello from Gemini')();
  };
  const r = await handleAiRequest({
    method: 'POST',
    body: { system: 'Be nice', responseFormat: 'json', messages: [{ role: 'user', content: 'Q1' }, { role: 'assistant', content: 'A1' }, { role: 'user', content: 'Q2' }] },
    env: { GEMINI_API_KEY: 'gk', GEMINI_MODEL: 'gemini-test' },
    fetchImpl,
  });
  assert.deepEqual(r.body, { ok: true, provider: 'gemini', model: 'gemini-test', text: 'Hello from Gemini' });
  assert.match(captured.url, /models\/gemini-test:generateContent$/);
  assert.equal(captured.init.headers['x-goog-api-key'], 'gk');
  assert.deepEqual(captured.body.contents.map((c) => c.role), ['user', 'model', 'user']);
  assert.equal(captured.body.systemInstruction.parts[0].text, 'Be nice');
  assert.equal(captured.body.generationConfig.responseMimeType, 'application/json');
});

test('Claude adapter: request shape and normalised response', async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init, body: JSON.parse(init.body) };
    return claudeOk('Hello from Claude')();
  };
  const r = await handleAiRequest({ ...ask({ provider: 'claude', system: 'S' }), env: { ANTHROPIC_API_KEY: 'ak' }, fetchImpl });
  assert.equal(r.body.text, 'Hello from Claude');
  assert.equal(r.body.provider, 'claude');
  assert.equal(captured.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(captured.init.headers['x-api-key'], 'ak');
  assert.equal(captured.init.headers['anthropic-version'], '2023-06-01');
  assert.equal(captured.body.system, 'S');
  assert.deepEqual(captured.body.messages, [{ role: 'user', content: 'Hi' }]);
});

test('rate limits, auth errors and outages map to friendly errors', async () => {
  const cases = [
    [429, 'RATE_LIMITED', 429],
    [401, 'PROVIDER_AUTH', 502],
    [503, 'PROVIDER_UNAVAILABLE', 502],
  ];
  for (const [status, code, httpStatus] of cases) {
    const r = await handleAiRequest({ ...ask(), env: { GEMINI_API_KEY: 'k' }, fetchImpl: async () => json(status, { error: { message: 'x' } }) });
    assert.equal(r.body.error.code, code);
    assert.equal(r.status, httpStatus);
  }
});

test('network failures and empty responses are handled', async () => {
  const net = await handleAiRequest({ ...ask(), env: { GEMINI_API_KEY: 'k' }, fetchImpl: async () => { throw new TypeError('fetch failed'); } });
  assert.equal(net.body.error.code, 'NETWORK_ERROR');
  const empty = await handleAiRequest({ ...ask(), env: { GEMINI_API_KEY: 'k' }, fetchImpl: async () => json(200, { candidates: [{ finishReason: 'SAFETY' }] }) });
  assert.equal(empty.body.error.code, 'INVALID_RESPONSE');
  assert.match(empty.body.error.message, /SAFETY/);
});

test('request validation', async () => {
  assert.throws(() => validateRequest(null), /JSON object/);
  assert.throws(() => validateRequest({ messages: [] }), /At least one message/);
  assert.throws(() => validateRequest({ messages: [{ role: 'system', content: 'x' }] }), /role/);
  assert.throws(() => validateRequest({ messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }), /last message/);
  const v = validateRequest({ messages: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'a' }, { role: 'user', content: 'b' }], maxTokens: 99999 });
  assert.deepEqual(v.messages, [{ role: 'user', content: 'a\n\nb' }]);
  assert.equal(v.maxTokens, 8192);
  const r = await handleAiRequest({ method: 'DELETE', env: {} });
  assert.equal(r.status, 405);
});
