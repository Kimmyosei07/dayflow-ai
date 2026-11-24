/**
 * Frontend description of the Gemini provider.
 *
 * Important: the browser never calls Gemini directly. The real adapter lives
 * in netlify/lib/providers/gemini.js and runs on the server with the secret
 * key. This file only holds display information used by Settings.
 */
export const geminiProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  description: 'Fast, generous free tier — a good default for students.',
  envKey: 'GEMINI_API_KEY',
  keyUrl: 'https://aistudio.google.com/apikey',
};
