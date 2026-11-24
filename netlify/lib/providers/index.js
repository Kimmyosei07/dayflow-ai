/**
 * Provider registry. To add a new provider (e.g. OpenAI), create an adapter
 * with the same interface as gemini.js / claude.js and add it here.
 * Nothing else in the backend or frontend needs to change except adding a
 * label in src/services/ai/providers.
 */
import { geminiProvider } from './gemini.js';
import { claudeProvider } from './claude.js';

export const PROVIDERS = {
  [geminiProvider.id]: geminiProvider,
  [claudeProvider.id]: claudeProvider,
};
