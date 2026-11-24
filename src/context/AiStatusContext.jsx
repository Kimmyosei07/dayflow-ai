/**
 * AiStatusContext — knows whether the AI backend is running and which
 * providers have API keys configured (the keys themselves stay on the server).
 *
 *   const { ready, status, provider, refresh } = useAiStatus();
 *   `ready` is true when an AI request can be made with the chosen provider.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAiStatus } from '../services/ai/aiService.js';
import { useAppData } from './AppDataContext.jsx';

const AiStatusContext = createContext(null);

export function AiStatusProvider({ children }) {
  const { settings } = useAppData();
  const [status, setStatus] = useState({ loading: true, reachable: false, configured: false, providers: [], defaultProvider: null });

  const refresh = useCallback(async () => {
    setStatus((s) => ({ ...s, loading: true }));
    const result = await getAiStatus();
    setStatus({ ...result, loading: false });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => {
    const chosen = settings.aiProvider;
    const providerInfo = chosen === 'auto' ? status.providers.find((p) => p.id === status.defaultProvider) : status.providers.find((p) => p.id === chosen);
    const ready = status.reachable && Boolean(providerInfo?.configured);

    let reason = '';
    if (status.loading) reason = 'Checking AI configuration…';
    else if (!status.reachable) reason = 'The AI service is not running. Start the app with "netlify dev" or deploy it to Netlify.';
    else if (!status.configured) reason = 'No AI provider is configured. Add GEMINI_API_KEY or ANTHROPIC_API_KEY to your environment variables.';
    else if (!ready) reason = `The selected provider has no API key. Choose another provider in Settings or add its key.`;

    return { status, refresh, provider: chosen, activeProvider: providerInfo ?? null, ready, reason };
  }, [status, refresh, settings.aiProvider]);

  return <AiStatusContext.Provider value={value}>{children}</AiStatusContext.Provider>;
}

export function useAiStatus() {
  const ctx = useContext(AiStatusContext);
  if (!ctx) throw new Error('useAiStatus must be used inside <AiStatusProvider>');
  return ctx;
}
