/**
 * Google Gemini adapter (REST generateContent endpoint).
 * Docs: https://ai.google.dev/api/generate-content
 *
 * Every adapter exposes the same interface:
 *   id, label, envKey, defaultModel, generate({ apiKey, model, system, messages, maxTokens, json, fetchImpl, signal })
 * and returns plain text. That is what keeps the rest of the app provider-agnostic.
 */
import { AiError, errorFromProviderStatus, readProviderErrorDetail } from '../errors.js';

export const geminiProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  envKey: 'GEMINI_API_KEY',
  modelEnvKey: 'GEMINI_MODEL',
  defaultModel: 'gemini-3.8-flash',

  async generate({ apiKey, model, system, messages, maxTokens, json, fetchImpl, signal }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const body = {
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        maxOutputTokens: maxTokens,
        ...(json ? { responseMimeType: 'application/json' } : {}),
        // Gemini 3+ models "think" at a medium level by default, which can take
        // longer than Netlify's ~30 s function limit. Planning and chat don't need
        // deep reasoning, so ask for low thinking. (2.5-and-older models use a
        // different setting, so they are left untouched.)
        ...(/^gemini-([3-9]|\d{2,})/.test(model) ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
      },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };

    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw errorFromProviderStatus(this.label, response.status, await readProviderErrorDetail(response));
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .filter((p) => typeof p.text === 'string' && !p.thought)
      .map((p) => p.text)
      .join('')
      .trim();

    if (!text) {
      const reason = candidate?.finishReason ?? data?.promptFeedback?.blockReason;
      throw new AiError(
        'INVALID_RESPONSE',
        reason ? `Gemini returned no text (reason: ${reason}). Try rephrasing your request.` : 'Gemini returned an empty response.',
        502,
      );
    }
    return text;
  },
};
