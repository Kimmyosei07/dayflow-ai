/**
 * AI Assistant conversation history.
 */
import { readJSON, writeJSON } from './storageService.js';
import { normalizeConversation, normalizeList } from './schema.js';

export const CONVERSATIONS_KEY = 'conversations';

export function loadConversations() {
  return normalizeList(readJSON(CONVERSATIONS_KEY, []), normalizeConversation);
}

export function saveConversations(list) {
  return writeJSON(CONVERSATIONS_KEY, list);
}
