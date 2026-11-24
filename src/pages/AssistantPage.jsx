import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Plus, Trash2, Sparkles, MessageSquare, Square, RotateCcw, History, ShieldCheck, User } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Markdown from '../components/ui/Markdown.jsx';
import Toggle from '../components/ui/Toggle.jsx';
import { AiSetupNotice } from '../components/ui/AiNotice.jsx';
import Logo from '../components/layout/Logo.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { useAiStatus } from '../context/AiStatusContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { askAssistant } from '../services/ai/aiService.js';
import { buildUserContext } from '../services/ai/prompts/assistantPrompts.js';
import { providerLabel } from '../services/ai/providers/index.js';
import { getFocusStats } from '../utils/analyticsUtils.js';
import { formatTimestamp } from '../utils/dateUtils.js';
import { createId } from '../utils/id.js';

const SUGGESTIONS = [
  'Help me organise my week.',
  'I have three assignments due this week. Which should I start with?',
  'Break my software engineering assignment into manageable tasks.',
  'I have two hours free. What can I realistically accomplish?',
  'Help me prepare a study schedule for my examinations.',
  'I feel overwhelmed by my workload. Where do I start?',
];

const MAX_HISTORY_SENT = 20;

export default function AssistantPage() {
  const { conversations, createConversation, updateConversation, deleteConversation, clearConversations, settings, updateSettings, tasks, courses, focusSessions } = useAppData();
  const { ready, provider } = useAiStatus();
  const { confirm, toast } = useUi();

  const [activeId, setActiveId] = useState(() => conversations[0]?.id ?? null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef(null);
  const threadRef = useRef(null);
  const inputRef = useRef(null);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const sorted = useMemo(() => [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [conversations]);

  // Keep the newest message in view.
  useEffect(() => {
    if (!active?.messages.length && !loading) return;
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [active?.messages.length, loading]);

  // Cancel an in-flight request when leaving the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (text, { retry = false } = {}) => {
    const content = text.trim();
    if (!content || loading || !ready) return;

    let convo = active;
    if (!convo) {
      convo = createConversation();
      setActiveId(convo.id);
    }
    const convoId = convo.id;
    const userMessage = { id: createId('msg'), role: 'user', content, createdAt: new Date().toISOString() };

    // The messages we send = existing successful messages + the new one.
    const baseMessages = (retry ? convo.messages.filter((m) => !m.isError) : [...convo.messages.filter((m) => !m.isError), userMessage]).slice(-MAX_HISTORY_SENT);

    if (!retry) {
      updateConversation(convoId, (c) => ({
        ...c,
        title: c.messages.length === 0 ? content.slice(0, 48) + (content.length > 48 ? '…' : '') : c.title,
        messages: [...c.messages, userMessage],
      }));
      setInput('');
    } else {
      updateConversation(convoId, (c) => ({ ...c, messages: c.messages.filter((m) => !m.isError) }));
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const now = new Date();
      const context = settings.shareContextWithAssistant
        ? buildUserContext({ tasks, courses, focusStats: getFocusStats(focusSessions, now), now })
        : null;
      const result = await askAssistant({ messages: baseMessages, context, displayName: settings.displayName, now, provider, signal: controller.signal });
      updateConversation(convoId, (c) => ({
        ...c,
        messages: [...c.messages, { id: createId('msg'), role: 'assistant', content: result.text, createdAt: new Date().toISOString(), provider: result.provider }],
      }));
    } catch (err) {
      if (err.code !== 'CANCELLED') {
        updateConversation(convoId, (c) => ({
          ...c,
          messages: [...c.messages, { id: createId('msg'), role: 'assistant', content: err.message, createdAt: new Date().toISOString(), isError: true }],
        }));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  };

  const newConversation = () => {
    if (active && active.messages.length === 0) return inputRef.current?.focus();
    const c = createConversation();
    setActiveId(c.id);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const removeConversation = async (c) => {
    const ok = await confirm({ title: 'Delete conversation?', message: `"${c.title}" will be permanently deleted.`, confirmLabel: 'Delete' });
    if (!ok) return;
    deleteConversation(c.id);
    if (c.id === activeId) setActiveId(null);
    toast('Conversation deleted');
  };

  const clearAll = async () => {
    const ok = await confirm({ title: 'Clear all conversations?', message: 'Your entire assistant history will be deleted from this browser.', confirmLabel: 'Clear history' });
    if (!ok) return;
    clearConversations();
    setActiveId(null);
    toast('Conversation history cleared');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const messages = active?.messages ?? [];
  const lastIsError = messages.length > 0 && messages[messages.length - 1].isError;

  return (
    <div className="page">
      <PageHeader
        title="AI Assistant"
        subtitle="Plan, prioritise and break down work with an assistant that knows your tasks (only if you allow it)."
        actions={
          <>
            <button type="button" className="btn btn--secondary mobile-only" onClick={() => setShowHistory((s) => !s)} aria-expanded={showHistory}>
              <History size={16} /> History
            </button>
            <button type="button" className="btn btn--primary" onClick={newConversation}>
              <Plus size={16} /> New conversation
            </button>
          </>
        }
      />

      <AiSetupNotice />

      <div className="chat-layout">
        <aside className={`card chat-sidebar ${showHistory ? 'is-open' : ''}`} aria-label="Conversation history">
          <div className="row row--between">
            <span className="section-title">Conversations</span>
            {conversations.length > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
          {sorted.length === 0 ? (
            <p className="text-xs muted">Your conversations will be saved here.</p>
          ) : (
            <ul className="chat-list">
              {sorted.map((c) => (
                <li key={c.id} className={`chat-list__item ${c.id === activeId ? 'is-active' : ''}`}>
                  <button
                    type="button"
                    className="chat-list__open"
                    onClick={() => {
                      setActiveId(c.id);
                      setShowHistory(false);
                    }}
                  >
                    <MessageSquare size={15} />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => removeConversation(c)} aria-label={`Delete ${c.title}`}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <hr className="divider" />
          <Toggle
            id="share-context"
            label="Share my data"
            description="Send my tasks, courses and focus time with each question so answers are personalised."
            checked={settings.shareContextWithAssistant}
            onChange={(v) => updateSettings({ shareContextWithAssistant: v })}
          />
        </aside>

        <section className="card chat-main card--flush">
          <div className="chat-thread" ref={threadRef} aria-live="polite">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <div className="sidebar__logo" style={{ width: 52, height: 52, borderRadius: 16 }}>
                  <Logo size={26} />
                </div>
                <h2>How can I help you plan today?</h2>
                <p className="text-sm muted">
                  {settings.shareContextWithAssistant ? (
                    <>
                      <ShieldCheck size={14} style={{ verticalAlign: -2 }} /> I can see your {tasks.filter((t) => t.status !== 'completed').length} pending tasks and {courses.length} courses.
                    </>
                  ) : (
                    "Data sharing is off — I won't see your tasks unless you describe them."
                  )}
                </p>
                <div className="suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="suggestion" onClick={() => send(s)} disabled={!ready || loading}>
                      <Sparkles size={14} /> {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`message message--${m.role} ${m.isError ? 'message--error' : ''}`}>
                  <div className="message__avatar" aria-hidden="true">
                    {m.role === 'user' ? <User size={15} /> : <Logo size={15} />}
                  </div>
                  <div className="message__content">
                    <div className="message__bubble">{m.role === 'assistant' && !m.isError ? <Markdown text={m.content} /> : m.content}</div>
                    <div className="message__meta">
                      {formatTimestamp(m.createdAt)}
                      {m.provider && ` · ${providerLabel(m.provider)}`}
                      {m.isError && ' · Not sent'}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="message message--assistant">
                <div className="message__avatar" aria-hidden="true">
                  <Logo size={15} />
                </div>
                <div className="message__bubble typing" aria-label="Assistant is typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          {lastIsError && !loading && (
            <div className="chat-retry">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => send(messages.filter((m) => m.role === 'user').at(-1)?.content ?? '', { retry: true })} disabled={!ready}>
                <RotateCcw size={14} /> Retry
              </button>
            </div>
          )}

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label htmlFor="chat-input" className="sr-only">
              Message the assistant
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              className="textarea"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={ready ? 'Ask anything about your day, tasks or studies…' : 'AI is not configured — see the notice above.'}
              disabled={!ready}
              maxLength={4000}
            />
            {loading ? (
              <button type="button" className="btn btn--secondary" onClick={() => abortRef.current?.abort()} aria-label="Stop generating">
                <Square size={15} /> Stop
              </button>
            ) : (
              <button type="submit" className="btn btn--primary" disabled={!ready || !input.trim()} aria-label="Send message">
                <Send size={16} />
              </button>
            )}
          </form>
          <p className="chat-hint text-xs muted">
            Enter to send · Shift + Enter for a new line · AI can make mistakes — check important dates.
          </p>
        </section>
      </div>
    </div>
  );
}
