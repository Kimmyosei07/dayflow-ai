/**
 * Frontend description of the Anthropic Claude provider.
 *
 * The real adapter lives in netlify/lib/providers/claude.js (server-side).
 * This file only holds display information used by Settings.
 */
export const claudeProvider = {
  id: 'claude',
  label: 'Anthropic Claude',
  description: 'Strong reasoning and careful, well-structured planning.',
  envKey: 'ANTHROPIC_API_KEY',
  keyUrl: 'https://console.anthropic.com/',
};
