# DAYFLOW AI

**Plan smarter. Focus better. Live intentionally.**

DAYFLOW AI is an AI-powered productivity and academic management web app for university students. It combines smart task management, an AI daily planner, an academic manager, a Pomodoro focus mode, productivity analytics and an AI assistant in one application.

Built with **React 19 + Vite + React Router**, **Netlify Functions** for the AI backend, and **LocalStorage** for data (no account needed).

---

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | Greeting, today's progress ring, daily task and focus goals, due/completed/pending/overdue counts, quick add, today's tasks, saved schedule, upcoming deadlines, focus summary, 7-day productivity charts, daily recommendation. Every number is calculated from your stored data. |
| **My Tasks** | Create, edit, delete (with confirmation), complete and reopen tasks. Title, description, category, priority, deadline + optional time, estimated duration, notes, optional course link. Views: All / Today / Upcoming / Completed / Overdue. Search, filter by category/priority/course, and 5 sort orders. |
| **AI Planner** | Select tasks, set start time, available hours, break length and existing activities (lectures, shifts). The AI orders the tasks and explains each choice; DAYFLOW calculates the times, so the plan is **always feasible**. Overflowing tasks are listed under "Recommended to defer" with a reason. Reorder, change durations, remove, regenerate and save (today or tomorrow). A rule-based planner works without AI and is labelled as such. |
| **Academic Manager** | Courses with code, name, lecturer, description and colour. Each course has a details page with progress %, pending/completed activities and type filters. Assignments, quizzes, projects and exams **are tasks** linked to a course, so they appear in My Tasks without duplicate records. |
| **Focus Mode** | Pomodoro timer (25/5/15 by default, all configurable), start/pause/resume/reset/skip, sessions-before-long-break cycle, optional task association, session history. The timer keeps running while you navigate (and survives a refresh). Completed sessions feed Analytics. |
| **Analytics** | Tasks created/completed, completion rate, focus time and sessions, 14-day and 8-week trends, category distribution, completion by category, weekly trend, streak and most productive weekday — each with a plain-English explanation. |
| **AI Assistant** | Chat with bubbles, timestamps, typing indicator, suggested prompts, stop/retry, saved conversation history, new/delete/clear conversations. A **"Share my data"** toggle controls whether your tasks, courses and focus time are sent as context. |
| **Settings** | Display name, light/dark theme, daily goals, focus durations, notification preferences (deadline reminders, browser alerts, sound), AI provider choice with live configuration status, storage usage, export/import JSON backup, load/remove sample data, reset everything. |

Also: collapsible sidebar, mobile drawer navigation, notification bell built from real deadlines, toasts, confirmation dialogs, form validation, empty/loading/error states, keyboard support (Esc closes dialogs, Enter sends chat), and a responsive layout from mobile to desktop.

---

## Prerequisites

- **Node.js 22 or newer** (`node -v`) — https://nodejs.org
- **npm** (comes with Node)
- **Git** — https://git-scm.com
- **Netlify CLI** (only needed to run AI features locally): `npm install -g netlify-cli`
- Optional: a **Gemini** and/or **Anthropic** API key

## Installation

```bash
git clone https://github.com/<your-username>/dayflow-ai.git
cd dayflow-ai
npm install
```

## Running locally

There are two ways to run the app:

| Command | URL | AI features |
| --- | --- | --- |
| `npm run dev` | http://localhost:5173 | **Off.** Fastest for UI work. The app shows a clear "AI not active" notice; everything else works. |
| `netlify dev` (or `npm run dev:netlify`) | http://localhost:8888 | **On.** Runs Vite *and* the serverless function together and reads your `.env`. |

Other commands:

```bash
npm test          # run the automated tests (Node's built-in test runner, no extra packages)
npm run build     # production build into dist/
npm run preview   # preview the production build
```

> Want to explore quickly? Click **"Explore with sample data"** on the empty dashboard (or Settings → Your data → Load sample data). Sample records carry a "Sample" badge and can be removed in one click.

## Environment variables

Copy the example file and add your keys:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | One of the two | Google Gemini key — https://aistudio.google.com/apikey |
| `ANTHROPIC_API_KEY` | One of the two | Anthropic Claude key — https://console.anthropic.com/ |
| `AI_PROVIDER` | No | Default provider for "Automatic" mode: `gemini` or `claude` |
| `GEMINI_MODEL` | No | Override the Gemini model (default `gemini-3.8-flash`) |
| `ANTHROPIC_MODEL` | No | Override the Claude model (default `claude-sonnet-5-5`) |

**Security:** these variables are read only by the Netlify Function on the server. They are never bundled into the frontend. Do **not** prefix them with `VITE_` (that would expose them in the browser), and never commit `.env` — it is already in `.gitignore`.

## AI provider setup

1. Create a key with Google AI Studio (Gemini) and/or the Anthropic Console (Claude).
2. **Locally:** put the key(s) in `.env`, then run `netlify dev`.
3. **On Netlify:** Site configuration → Environment variables → add the same variables → trigger a redeploy.
4. In the app, open **Settings → AI provider**, choose *Automatic*, *Google Gemini* or *Anthropic Claude*, and press **Recheck**. The status badge shows which providers are ready and which model they use.

Without a key the app stays fully usable. AI-only buttons are disabled with an explanation, the planner offers a **rule-based** plan, and the dashboard shows a **rule-based** tip. These are always labelled "Rule-based" and are never presented as AI output.

Model names change over time. If a provider returns "could not process the request", set `GEMINI_MODEL` / `ANTHROPIC_MODEL` to a model listed in that provider's current documentation.

## GitHub setup

```bash
git init
git add .
git commit -m "Initial commit: DAYFLOW AI"
git branch -M main
git remote add origin https://github.com/<your-username>/dayflow-ai.git
git push -u origin main
```

Check that `.env` was **not** committed (`git status` should never list it).

## Netlify deployment

1. Push the project to GitHub (above).
2. Netlify → **Add new site → Import an existing project → GitHub** → pick the repository.
3. Build settings are read from `netlify.toml`: build command `npm run build`, publish directory `dist`, functions directory `netlify/functions`.
4. Add your environment variables (Site configuration → Environment variables).
5. Deploy. Every push to `main` redeploys automatically.

`netlify.toml` also includes the single-page-app redirect, so refreshing on `/tasks` or `/academic/<id>` works.

---

## Architecture

```
Browser (React)                                   Netlify (server)
┌──────────────────────────────────────┐          ┌───────────────────────────────┐
│ pages/ & components/                 │          │ netlify/functions/ai.js       │
│   │ use contexts (never storage/AI)  │          │   └─ lib/aiHandler.js          │
│ context/AppDataContext ──► services/storage ──► LocalStorage                   │
│ context/AiStatusContext ─┐           │  fetch   │      validate → pick provider │
│ pages ─► services/ai/aiService.js ───┼─────────►│      → adapter → normalise    │
│                                      │          │   lib/providers/gemini.js     │
│ utils/ (pure logic, unit-tested)     │          │   lib/providers/claude.js     │
└──────────────────────────────────────┘          └───────────────────────────────┘
```

Key decisions:

- **Provider-independent AI.** Components call `aiService.js` functions such as `generatePlanOrder` and `askAssistant`. The service sends a neutral request `{ provider, system, messages, responseFormat }` to one Netlify Function, which picks an adapter and returns `{ ok, provider, model, text }`. To add a provider (for example OpenAI), write one adapter in `netlify/lib/providers/`, register it in `providers/index.js`, and add a display entry in `src/services/ai/providers/`. Nothing else changes.
- **AI orders, code schedules.** For the planner, the AI returns only an order and reasons (JSON). `utils/plannerUtils.js` turns that into clock times around fixed activities and breaks. The AI therefore cannot produce overlapping or over-long schedules. Its reply is also validated: unknown task IDs are dropped and missing ones are added back.
- **One record per academic activity.** Assignments and exams are tasks with a `courseId`, so the Academic Manager and My Tasks always agree.
- **Storage behind services.** Only `src/services/storage/*` touches LocalStorage. Swapping in a cloud database later means replacing these functions, not the UI.
- **Resilient data.** Every record goes through a normaliser (`schema.js`) on load and import. Corrupted JSON is backed up under `dayflow:corrupt:<key>` and the user is told. Duplicate IDs are removed, and tasks pointing to deleted courses are unlinked.
- **Versioned data.** `SCHEMA_VERSION` plus `migrations.js` upgrade stored data and imported backups step by step. Files from a newer app version are rejected with a clear message.
- **Pure, tested logic.** Dates, filtering, sorting, scheduling, analytics, storage, migrations and the AI handler are plain functions with no React, covered by `npm test`.
- **Few dependencies.** Runtime packages are only `react`, `react-dom`, `react-router-dom` and `lucide-react`. Charts are small hand-made SVG/CSS components, and the tests use Node's built-in runner.

### Folder structure

```
dayflow-ai/
├── index.html                 # HTML shell + font
├── netlify.toml               # build, functions, dev server, SPA redirect
├── .env.example               # variable names only — no secrets
├── netlify/
│   ├── functions/ai.js        # HTTP endpoint (/.netlify/functions/ai)
│   └── lib/
│       ├── aiHandler.js       # validation, provider selection, error mapping
│       ├── errors.js
│       └── providers/         # gemini.js, claude.js, index.js (registry)
├── public/favicon.svg
├── src/
│   ├── main.jsx / App.jsx     # entry + routes + providers
│   ├── styles/                # variables.css (design tokens, dark theme), base, layout, components, pages
│   ├── context/               # AppData (all data + actions), Ui (toast/confirm), AiStatus, FocusTimer
│   ├── hooks/                 # useNow, useTaskActions, useClickOutside, useDocumentTitle
│   ├── services/
│   │   ├── storage/           # storageService, task/academic/settings/focus/plan/chat storage, schema, migrations, appDataStorage
│   │   ├── ai/                # aiService.js, providers/ (display info), prompts/
│   │   └── sampleData.js
│   ├── utils/                 # dates, tasks, planner, analytics, academic, timer, notifications, recommendations
│   ├── components/            # layout/, ui/, charts/, tasks/, planner/, academic/, dashboard/
│   └── pages/                 # one file per route
└── tests/                     # node:test unit tests
```

## Testing

`npm test` runs 58 unit tests covering:

- date helpers
- task creation, validation, filtering, sorting and statistics
- the scheduler: no overlaps, deferral, fixed activities, midnight cut-off
- AI-reply parsing and validation
- analytics calculations
- storage corruption handling, export/import round-trip and migrations
- the AI handler, using a mocked `fetch` for both providers: rate limits, auth errors, network errors, empty replies and request validation
- the Pomodoro cycle, course progress, notifications and sample data

## Known limitations

- Data lives in this browser only (LocalStorage, roughly 5 MB). Use **Export data** to back up or move devices. Accounts and cloud sync are not part of this version; the storage services are ready for them.
- Browser notifications need permission and only fire while the app is open in a tab.
- AI features need your own API key and a running Netlify Function (`netlify dev` locally, or a deployed site).
- AI replies are not streamed; they appear when complete.
