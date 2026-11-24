import { geminiProvider } from './geminiProvider.js';
import { claudeProvider } from './claudeProvider.js';

/** Providers shown in Settings. Add new provider descriptors here. */
export const AI_PROVIDERS = [geminiProvider, claudeProvider];

export const providerLabel = (id) => AI_PROVIDERS.find((p) => p.id === id)?.label ?? id;
