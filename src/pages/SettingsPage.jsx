import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Palette, Target, Timer, Bell, Sparkles, Database, Download, Upload, RotateCcw, CheckCircle2, XCircle, RefreshCw, FlaskConical, Sun, Moon } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import FormField from '../components/ui/FormField.jsx';
import Toggle from '../components/ui/Toggle.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { useAiStatus } from '../context/AiStatusContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { AI_PROVIDERS } from '../services/ai/providers/index.js';
import { buildExport, parseImport } from '../services/storage/appDataStorage.js';
import { getStorageUsage } from '../services/storage/storageService.js';
import { toDateKey } from '../utils/dateUtils.js';

const formatBytes = (b) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`);

function Section({ id, icon: Icon, title, description, children }) {
  return (
    <section id={id} className="card settings-section">
      <div className="settings-section__head">
        <div className="card__title">
          <Icon size={18} /> {title}
        </div>
        {description && <p className="text-xs muted">{description}</p>}
      </div>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

/** Validates numeric preference input, returns an error message or ''. */
const rangeError = (value, min, max, label) => {
  const n = Number(value);
  if (value === '' || !Number.isFinite(n) || !Number.isInteger(n)) return `${label} must be a whole number.`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return '';
};

export default function SettingsPage() {
  const data = useAppData();
  const { settings, updateSettings, replaceAllData, resetAllData, loadSampleData, removeSampleData, hasSampleData, tasks, courses, focusSessions, plans, conversations } = data;
  const ai = useAiStatus();
  const { toast, confirm } = useUi();
  const location = useLocation();
  const fileRef = useRef(null);

  const [draft, setDraft] = useState(() => ({
    displayName: settings.displayName,
    dailyTaskGoal: String(settings.dailyTaskGoal),
    dailyFocusGoalMinutes: String(settings.dailyFocusGoalMinutes),
    focusMinutes: String(settings.focus.focusMinutes),
    shortBreakMinutes: String(settings.focus.shortBreakMinutes),
    longBreakMinutes: String(settings.focus.longBreakMinutes),
    sessionsBeforeLongBreak: String(settings.focus.sessionsBeforeLongBreak),
  }));
  const [errors, setErrors] = useState({});
  const [notificationPermission, setNotificationPermission] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));

  // Support links such as /settings#ai
  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  // Recalculated whenever any data changes.
  const usage = useMemo(() => getStorageUsage(), [tasks, courses, focusSessions, plans, conversations, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => {
    setDraft((d) => ({ ...d, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  const savePreferences = (e) => {
    e.preventDefault();
    const v = {
      displayName: draft.displayName.trim().length > 40 ? 'Keep your name under 40 characters.' : '',
      dailyTaskGoal: rangeError(draft.dailyTaskGoal, 1, 50, 'Daily task goal'),
      dailyFocusGoalMinutes: rangeError(draft.dailyFocusGoalMinutes, 10, 720, 'Focus goal'),
      focusMinutes: rangeError(draft.focusMinutes, 1, 180, 'Focus duration'),
      shortBreakMinutes: rangeError(draft.shortBreakMinutes, 1, 60, 'Short break'),
      longBreakMinutes: rangeError(draft.longBreakMinutes, 1, 90, 'Long break'),
      sessionsBeforeLongBreak: rangeError(draft.sessionsBeforeLongBreak, 2, 10, 'Sessions before long break'),
    };
    setErrors(v);
    if (Object.values(v).some(Boolean)) return toast('Please fix the highlighted fields.', 'error');
    updateSettings({
      displayName: draft.displayName.trim(),
      dailyTaskGoal: Number(draft.dailyTaskGoal),
      dailyFocusGoalMinutes: Number(draft.dailyFocusGoalMinutes),
      focus: {
        focusMinutes: Number(draft.focusMinutes),
        shortBreakMinutes: Number(draft.shortBreakMinutes),
        longBreakMinutes: Number(draft.longBreakMinutes),
        sessionsBeforeLongBreak: Number(draft.sessionsBeforeLongBreak),
      },
    });
    toast('Preferences saved');
  };

  const resetFocusDefaults = () => {
    setDraft((d) => ({ ...d, focusMinutes: '25', shortBreakMinutes: '5', longBreakMinutes: '15', sessionsBeforeLongBreak: '4' }));
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
    toast(result === 'granted' ? 'Browser notifications enabled' : 'Notifications were not allowed', result === 'granted' ? 'success' : 'info');
  };

  const exportData = () => {
    const payload = buildExport({ tasks, courses, focusSessions, plans, conversations, settings });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dayflow-backup-${toDateKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Backup downloaded');
  };

  const importData = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast('That file is too large to be a DAYFLOW backup.', 'error');
    try {
      const parsed = parseImport(await file.text());
      const ok = await confirm({
        title: 'Replace your current data?',
        message: `This backup contains ${parsed.tasks.length} tasks, ${parsed.courses.length} courses and ${parsed.focusSessions.length} focus sessions. Your current data will be replaced. Consider exporting first.`,
        confirmLabel: 'Import and replace',
      });
      if (!ok) return;
      replaceAllData(parsed);
      setDraft({
        displayName: parsed.settings.displayName,
        dailyTaskGoal: String(parsed.settings.dailyTaskGoal),
        dailyFocusGoalMinutes: String(parsed.settings.dailyFocusGoalMinutes),
        focusMinutes: String(parsed.settings.focus.focusMinutes),
        shortBreakMinutes: String(parsed.settings.focus.shortBreakMinutes),
        longBreakMinutes: String(parsed.settings.focus.longBreakMinutes),
        sessionsBeforeLongBreak: String(parsed.settings.focus.sessionsBeforeLongBreak),
      });
      toast('Data imported successfully');
    } catch (err) {
      toast(err.message, 'error', 6000);
    }
  };

  const resetEverything = async () => {
    const ok = await confirm({
      title: 'Reset all application data?',
      message: 'Every task, course, focus session, plan, conversation and setting will be permanently deleted from this browser. Export a backup first if you might need it.',
      confirmLabel: 'Delete everything',
    });
    if (!ok) return;
    resetAllData();
    setDraft({ displayName: '', dailyTaskGoal: '5', dailyFocusGoalMinutes: '120', focusMinutes: '25', shortBreakMinutes: '5', longBreakMinutes: '15', sessionsBeforeLongBreak: '4' });
    toast('All data has been reset');
  };

  const statusFor = (id) => ai.status.providers.find((p) => p.id === id);

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Personalise DAYFLOW and manage your data." />

      <form className="stack" onSubmit={savePreferences} noValidate>
        <Section icon={User} title="Profile" description="Used for your greeting and by the AI assistant.">
          <FormField label="Display name" htmlFor="s-name" error={errors.displayName}>
            <input id="s-name" className="input" value={draft.displayName} onChange={set('displayName')} placeholder="Your name" maxLength={40} />
          </FormField>
        </Section>

        <Section icon={Target} title="Daily goals" description="Shown as progress bars on your dashboard.">
          <div className="form-grid">
            <FormField label="Tasks to complete per day" htmlFor="s-goal" error={errors.dailyTaskGoal}>
              <input id="s-goal" type="number" min="1" max="50" className={`input ${errors.dailyTaskGoal ? 'has-error' : ''}`} value={draft.dailyTaskGoal} onChange={set('dailyTaskGoal')} />
            </FormField>
            <FormField label="Focus minutes per day" htmlFor="s-focusgoal" error={errors.dailyFocusGoalMinutes}>
              <input id="s-focusgoal" type="number" min="10" max="720" step="5" className={`input ${errors.dailyFocusGoalMinutes ? 'has-error' : ''}`} value={draft.dailyFocusGoalMinutes} onChange={set('dailyFocusGoalMinutes')} />
            </FormField>
          </div>
        </Section>

        <Section icon={Timer} title="Focus timer" description="Pomodoro durations in minutes.">
          <div className="form-grid">
            <FormField label="Focus" htmlFor="s-f" error={errors.focusMinutes}>
              <input id="s-f" type="number" min="1" max="180" className={`input ${errors.focusMinutes ? 'has-error' : ''}`} value={draft.focusMinutes} onChange={set('focusMinutes')} />
            </FormField>
            <FormField label="Short break" htmlFor="s-sb" error={errors.shortBreakMinutes}>
              <input id="s-sb" type="number" min="1" max="60" className={`input ${errors.shortBreakMinutes ? 'has-error' : ''}`} value={draft.shortBreakMinutes} onChange={set('shortBreakMinutes')} />
            </FormField>
            <FormField label="Long break" htmlFor="s-lb" error={errors.longBreakMinutes}>
              <input id="s-lb" type="number" min="1" max="90" className={`input ${errors.longBreakMinutes ? 'has-error' : ''}`} value={draft.longBreakMinutes} onChange={set('longBreakMinutes')} />
            </FormField>
            <FormField label="Sessions before a long break" htmlFor="s-cyc" error={errors.sessionsBeforeLongBreak}>
              <input id="s-cyc" type="number" min="2" max="10" className={`input ${errors.sessionsBeforeLongBreak ? 'has-error' : ''}`} value={draft.sessionsBeforeLongBreak} onChange={set('sessionsBeforeLongBreak')} />
            </FormField>
          </div>
          <div className="row" style={{ marginTop: 'var(--space-3)' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetFocusDefaults}>
              Use defaults (25 / 5 / 15)
            </button>
          </div>
          <hr className="divider" />
          <Toggle id="s-autostart" label="Start breaks automatically" description="When a focus session ends, the break countdown starts on its own." checked={settings.focus.autoStartBreaks} onChange={(v) => updateSettings({ focus: { autoStartBreaks: v } })} />
        </Section>

        <div className="settings-save">
          <button type="submit" className="btn btn--primary">
            Save preferences
          </button>
        </div>
      </form>

      <Section icon={Palette} title="Appearance">
        <div className="tabs" role="radiogroup" aria-label="Theme">
          {[
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
          ].map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={settings.theme === t.value} className={`tab ${settings.theme === t.value ? 'is-active' : ''}`} onClick={() => updateSettings({ theme: t.value })}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={Bell} title="Notifications">
        <div className="stack">
          <Toggle id="s-deadlines" label="Deadline reminders" description="Show overdue, due-today and upcoming exam alerts in the bell menu." checked={settings.notifications.deadlineReminders} onChange={(v) => updateSettings({ notifications: { deadlineReminders: v } })} />
          <Toggle id="s-focusalerts" label="Focus timer alerts" description="Show a browser notification when a session or break ends." checked={settings.notifications.focusAlerts} onChange={(v) => updateSettings({ notifications: { focusAlerts: v } })} />
          <Toggle id="s-sound" label="Sound" description="Play a soft chime when the timer finishes." checked={settings.notifications.sound} onChange={(v) => updateSettings({ notifications: { sound: v } })} />
          {settings.notifications.focusAlerts && notificationPermission !== 'granted' && (
            <div className="alert">
              <Bell size={16} />
              <span className="grow">
                {notificationPermission === 'unsupported'
                  ? 'This browser does not support notifications. In-app messages will still appear.'
                  : notificationPermission === 'denied'
                    ? 'Notifications are blocked for this site. Allow them in your browser settings to receive timer alerts.'
                    : 'Allow browser notifications to be alerted when the timer finishes, even in another tab.'}
              </span>
              {notificationPermission === 'default' && (
                <button type="button" className="btn btn--soft btn--sm" onClick={requestNotifications}>
                  Allow
                </button>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section id="ai" icon={Sparkles} title="AI provider" description="API keys are stored on the server (Netlify environment variables) — never in this browser.">
        <div className="stack">
          <div className="provider-grid" role="radiogroup" aria-label="AI provider">
            {[{ id: 'auto', label: 'Automatic', description: 'Use the server default (AI_PROVIDER), or whichever provider is configured.' }, ...AI_PROVIDERS].map((p) => {
              const info = p.id === 'auto' ? null : statusFor(p.id);
              const configured = p.id === 'auto' ? ai.status.configured : info?.configured;
              return (
                <button key={p.id} type="button" role="radio" aria-checked={settings.aiProvider === p.id} className={`provider-card ${settings.aiProvider === p.id ? 'is-selected' : ''}`} onClick={() => updateSettings({ aiProvider: p.id })}>
                  <strong>{p.label}</strong>
                  <span className="text-xs muted">{p.description}</span>
                  {!ai.status.loading && ai.status.reachable && (
                    <span className={`badge ${configured ? 'badge--success' : ''}`}>
                      {configured ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {configured ? (info ? `Ready · ${info.model}` : `Ready · ${ai.status.defaultProvider}`) : `Needs ${p.envKey ?? 'an API key'}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className={`alert ${ai.ready ? '' : 'alert--warning'}`}>
            {ai.ready ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span className="grow">{ai.ready ? `AI is active using ${ai.activeProvider?.label} (${ai.activeProvider?.model}).` : ai.reason}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={ai.refresh} disabled={ai.status.loading}>
              <RefreshCw size={14} /> Recheck
            </button>
          </div>
          <details className="setup-steps">
            <summary>How to set up AI</summary>
            <ol>
              <li>
                Get a key from{' '}
                {AI_PROVIDERS.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ' or '}
                    <a href={p.keyUrl} target="_blank" rel="noreferrer">
                      {p.label}
                    </a>
                  </span>
                ))}
                .
              </li>
              <li>
                Locally: copy <code>.env.example</code> to <code>.env</code>, add the key, and run <code>netlify dev</code>.
              </li>
              <li>
                On Netlify: Site configuration → Environment variables → add <code>GEMINI_API_KEY</code> and/or <code>ANTHROPIC_API_KEY</code>, then redeploy.
              </li>
              <li>Press "Recheck" above.</li>
            </ol>
          </details>
        </div>
      </Section>

      <Section icon={Database} title="Your data" description="Everything is stored privately in this browser's LocalStorage.">
        <div className="stack">
          <div className="storage-summary">
            <div>
              <div className="stat-card__value">{formatBytes(usage.totalBytes)}</div>
              <div className="stat-card__label">used of roughly 5 MB available</div>
            </div>
            <ul className="storage-list">
              <li>{tasks.length} tasks</li>
              <li>{courses.length} courses</li>
              <li>{focusSessions.length} focus sessions</li>
              <li>{plans.length} saved plans</li>
              <li>{conversations.length} conversations</li>
            </ul>
          </div>
          <div className="row">
            <button type="button" className="btn btn--secondary" onClick={exportData}>
              <Download size={16} /> Export data
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Import data
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
          </div>
          <hr className="divider" />
          <div className="row row--between">
            <div>
              <strong className="text-sm row" style={{ gap: 6 }}>
                <FlaskConical size={15} /> Sample data
              </strong>
              <p className="text-xs muted">{hasSampleData ? 'Sample records are marked with a "Sample" badge.' : 'Add example courses, tasks and focus sessions to explore the app.'}</p>
            </div>
            {hasSampleData ? (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={async () => {
                  if (await confirm({ title: 'Remove sample data?', message: 'Only records marked "Sample" are removed. Your own data stays.', confirmLabel: 'Remove sample data' })) {
                    removeSampleData();
                    toast('Sample data removed');
                  }
                }}
              >
                Remove sample data
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  loadSampleData();
                  toast('Sample data added');
                }}
              >
                Load sample data
              </button>
            )}
          </div>
          <hr className="divider" />
          <div className="row row--between">
            <div>
              <strong className="text-sm" style={{ color: 'var(--color-danger)' }}>
                Reset application data
              </strong>
              <p className="text-xs muted">Permanently deletes everything stored by DAYFLOW in this browser.</p>
            </div>
            <button type="button" className="btn btn--danger btn--sm" onClick={resetEverything}>
              <RotateCcw size={14} /> Reset everything
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}
