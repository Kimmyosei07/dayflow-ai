/**
 * A typed error so every failure becomes the same JSON shape for the
 * frontend: { ok: false, error: { code, message } }.
 */
export class AiError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Maps a provider's HTTP status to a friendly AiError. */
export function errorFromProviderStatus(providerLabel, status, detail = '') {
  if (status === 429) {
    return new AiError('RATE_LIMITED', `${providerLabel} rate limit reached. Please wait a moment and try again.`, 429);
  }
  if (status === 401 || status === 403) {
    return new AiError('PROVIDER_AUTH', `${providerLabel} rejected the API key. Check the key in your environment variables.`, 502);
  }
  if (status === 400 || status === 404) {
    return new AiError('PROVIDER_BAD_REQUEST', `${providerLabel} could not process the request${detail ? `: ${detail}` : '.'}`, 502);
  }
  if (status >= 500) {
    return new AiError('PROVIDER_UNAVAILABLE', `${providerLabel} is temporarily unavailable. Please try again shortly.`, 502);
  }
  return new AiError('PROVIDER_ERROR', `${providerLabel} returned an unexpected error (${status}).`, 502);
}

/** Reads a short, safe error message from a provider's JSON error body. */
export async function readProviderErrorDetail(response) {
  try {
    const body = await response.json();
    const message = body?.error?.message ?? body?.message ?? '';
    return String(message).slice(0, 200);
  } catch {
    return '';
  }
}
