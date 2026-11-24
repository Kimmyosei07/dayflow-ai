/**
 * Anthropic Claude adapter (Messages API).
 * Docs: https://docs.claude.com/en/api/messages
 */
import { AiError, errorFromProviderStatus, readProviderErrorDetail } from '../errors.js';

export const claudeProvider = {
  id: 'claude',
  label: 'Anthropic Claude',
  envKey: 'ANTHROPIC_API_KEY',
  modelEnvKey: 'ANTHROPIC_MODEL',
  defaultModel: 'claude-sonnet-5-5',

  async generate({ apiKey, model, system, messages, maxTokens, json, fetchImpl, signal }) {
    const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        // Claude has no JSON-mode flag; the prompt itself asks for JSON.
        system: json ? `${system ?? ''}\n\nRespond with a single valid JSON object only.`.trim() : system || undefined,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal,
    });

    if (!response.ok) {
      throw errorFromProviderStatus(this.label, response.status, await readProviderErrorDetail(response));
    }

    const data = await response.json();
    const text = (data?.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    if (!text) throw new AiError('INVALID_RESPONSE', 'Claude returned an empty response.', 502);
    return text;
  },
};
