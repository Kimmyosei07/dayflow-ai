import { useMemo, useState } from 'react';
import { Lightbulb, Sparkles, RefreshCw } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext.jsx';
import { useAiStatus } from '../../context/AiStatusContext.jsx';
import { getDailyRecommendation } from '../../services/ai/aiService.js';
import { buildUserContext } from '../../services/ai/prompts/assistantPrompts.js';
import { readJSON, writeJSON } from '../../services/storage/storageService.js';
import { getRuleBasedRecommendation } from '../../utils/recommendationUtils.js';
import { getFocusStats } from '../../utils/analyticsUtils.js';
import { toDateKey } from '../../utils/dateUtils.js';
import { AiSourceBadge } from '../ui/AiNotice.jsx';
import Markdown from '../ui/Markdown.jsx';

const CACHE_KEY = 'dailyRecommendation';

/**
 * Daily recommendation. Shows a clearly labelled rule-based tip by default;
 * when AI is configured the user can request a personalised AI version,
 * which is cached for the rest of the day.
 */
export default function RecommendationCard() {
  const { tasks, courses, focusSessions, settings, now } = useAppData();
  const { ready, provider } = useAiStatus();
  const [cached, setCached] = useState(() => {
    const saved = readJSON(CACHE_KEY, null);
    return saved?.date === toDateKey(new Date()) ? saved : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const focusStats = useMemo(() => getFocusStats(focusSessions, now), [focusSessions, now]);
  const ruleTip = useMemo(() => getRuleBasedRecommendation({ tasks, now, focusStats, settings }), [tasks, now, focusStats, settings]);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const context = buildUserContext({ tasks, courses, focusStats, now: new Date() });
      const result = await getDailyRecommendation({ context, displayName: settings.displayName, now: new Date(), provider });
      const entry = { date: toDateKey(new Date()), text: result.text, provider: result.provider };
      writeJSON(CACHE_KEY, entry);
      setCached(entry);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card recommendation">
      <div className="card__header">
        <div className="card__title">
          <Lightbulb size={18} /> Today's recommendation
        </div>
        <AiSourceBadge source={cached ? 'ai' : 'rules'} provider={cached?.provider} />
      </div>
      <div className="recommendation__text">{cached ? <Markdown text={cached.text} /> : <p>{ruleTip}</p>}</div>
      {error && <p className="field__error" style={{ marginTop: 8 }}>{error}</p>}
      <div className="row" style={{ marginTop: 'var(--space-4)' }}>
        {ready ? (
          <button type="button" className="btn btn--soft btn--sm" onClick={generate} disabled={loading}>
            {loading ? <span className="spinner" /> : cached ? <RefreshCw size={14} /> : <Sparkles size={14} />}
            {loading ? 'Thinking…' : cached ? 'Refresh AI tip' : 'Get AI recommendation'}
          </button>
        ) : (
          <span className="text-xs muted">Configure an AI provider in Settings to get personalised AI recommendations.</span>
        )}
        {cached && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              writeJSON(CACHE_KEY, null);
              setCached(null);
            }}
          >
            Show rule-based tip
          </button>
        )}
      </div>
      {ready && !cached && <p className="text-xs muted" style={{ marginTop: 8 }}>The AI tip uses your current tasks and focus time.</p>}
    </div>
  );
}
