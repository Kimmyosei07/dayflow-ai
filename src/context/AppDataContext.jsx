/**
 * AppDataContext — the single source of truth for all user data.
 *
 * Components read data with `useAppData()` and change it ONLY through the
 * action functions below. Every change is persisted to LocalStorage by the
 * storage services, so pages never touch storage directly.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadAppData, saveAppData, resetAppData, normalizeAppData } from '../services/storage/appDataStorage.js';
import { saveTasks } from '../services/storage/taskStorage.js';
import { saveCourses } from '../services/storage/academicStorage.js';
import { saveFocusSessions } from '../services/storage/focusStorage.js';
import { savePlans } from '../services/storage/planStorage.js';
import { saveConversations } from '../services/storage/chatStorage.js';
import { saveSettings } from '../services/storage/settingsStorage.js';
import { normalizeSettings, normalizeFocusSession, normalizePlan } from '../services/storage/schema.js';
import { createTask, updateTask as applyTaskChanges, toggleTaskStatus } from '../utils/taskUtils.js';
import { createCourse, normalizeCourse } from '../utils/academicUtils.js';
import { createId } from '../utils/id.js';
import { createSampleData } from '../services/sampleData.js';
import { useNow } from '../hooks/useNow.js';

const AppDataContext = createContext(null);

/** Persists a slice of state whenever it changes (skipping the first render). */
function usePersist(value, save) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    save(value);
  }, [value, save]);
}

export function AppDataProvider({ children }) {
  // Load once, synchronously, so the first render already has the data.
  const [initial] = useState(loadAppData);
  const [tasks, setTasks] = useState(initial.tasks);
  const [courses, setCourses] = useState(initial.courses);
  const [focusSessions, setFocusSessions] = useState(initial.focusSessions);
  const [plans, setPlans] = useState(initial.plans);
  const [conversations, setConversations] = useState(initial.conversations);
  const [settings, setSettings] = useState(initial.settings);

  usePersist(tasks, saveTasks);
  usePersist(courses, saveCourses);
  usePersist(focusSessions, saveFocusSessions);
  usePersist(plans, savePlans);
  usePersist(conversations, saveConversations);
  usePersist(settings, saveSettings);

  // `now` refreshes every 30 seconds so "overdue" / "today" stay accurate.
  const now = useNow(30000);

  // Apply the theme to <html data-theme="..."> for the CSS variables.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  /* ---------------- Tasks ---------------- */
  const addTask = useCallback((input) => {
    const task = createTask(input);
    setTasks((list) => [task, ...list]);
    return task;
  }, []);

  const updateTask = useCallback((id, changes) => {
    setTasks((list) => list.map((t) => (t.id === id ? applyTaskChanges(t, changes) : t)));
  }, []);

  const toggleTask = useCallback((id) => {
    setTasks((list) => list.map((t) => (t.id === id ? toggleTaskStatus(t) : t)));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((list) => list.filter((t) => t.id !== id));
  }, []);

  /* ---------------- Courses ---------------- */
  const addCourse = useCallback((input) => {
    const course = createCourse(input);
    setCourses((list) => [...list, course]);
    return course;
  }, []);

  const updateCourse = useCallback((id, changes) => {
    setCourses((list) =>
      list.map((c) => (c.id === id ? normalizeCourse({ ...c, ...changes, id, updatedAt: new Date().toISOString() }) : c)),
    );
  }, []);

  /** Deletes a course. Its activities are deleted too, or kept as normal tasks. */
  const deleteCourse = useCallback((id, { deleteActivities = false } = {}) => {
    setCourses((list) => list.filter((c) => c.id !== id));
    setTasks((list) =>
      deleteActivities
        ? list.filter((t) => t.courseId !== id)
        : list.map((t) => (t.courseId === id ? { ...t, courseId: null, academicType: null } : t)),
    );
  }, []);

  /* ---------------- Focus sessions ---------------- */
  const addFocusSession = useCallback((session) => {
    const clean = normalizeFocusSession({ ...session, id: createId('focus') });
    if (clean) setFocusSessions((list) => [clean, ...list]);
  }, []);

  const deleteFocusSession = useCallback((id) => {
    setFocusSessions((list) => list.filter((s) => s.id !== id));
  }, []);

  /* ---------------- Plans (one per date) ---------------- */
  const savePlan = useCallback((plan) => {
    const clean = normalizePlan({ ...plan, savedAt: new Date().toISOString() });
    if (!clean) return;
    setPlans((list) => [clean, ...list.filter((p) => p.date !== clean.date)].slice(0, 60));
  }, []);

  const deletePlan = useCallback((date) => {
    setPlans((list) => list.filter((p) => p.date !== date));
  }, []);

  /* ---------------- Conversations ---------------- */
  const createConversation = useCallback(() => {
    const ts = new Date().toISOString();
    const convo = { id: createId('chat'), title: 'New conversation', createdAt: ts, updatedAt: ts, messages: [] };
    setConversations((list) => [convo, ...list]);
    return convo;
  }, []);

  /** `updater` receives the conversation and returns the new version. */
  const updateConversation = useCallback((id, updater) => {
    setConversations((list) =>
      list.map((c) => (c.id === id ? { ...updater(c), updatedAt: new Date().toISOString() } : c)),
    );
  }, []);

  const deleteConversation = useCallback((id) => {
    setConversations((list) => list.filter((c) => c.id !== id));
  }, []);

  const clearConversations = useCallback(() => setConversations([]), []);

  /* ---------------- Settings ---------------- */
  const updateSettings = useCallback((patch) => {
    setSettings((current) =>
      normalizeSettings({
        ...current,
        ...patch,
        focus: { ...current.focus, ...(patch.focus ?? {}) },
        notifications: { ...current.notifications, ...(patch.notifications ?? {}) },
      }),
    );
  }, []);

  /* ---------------- Whole-app operations ---------------- */
  const replaceAllData = useCallback((raw) => {
    const data = normalizeAppData(raw);
    saveAppData(data);
    setTasks(data.tasks);
    setCourses(data.courses);
    setFocusSessions(data.focusSessions);
    setPlans(data.plans);
    setConversations(data.conversations);
    setSettings(data.settings);
  }, []);

  const resetAllData = useCallback(() => {
    resetAppData();
    replaceAllData({});
  }, [replaceAllData]);

  const loadSampleData = useCallback(() => {
    const sample = createSampleData(new Date());
    setCourses((list) => [...list, ...sample.courses]);
    setTasks((list) => [...sample.tasks, ...list]);
    setFocusSessions((list) => [...sample.focusSessions, ...list]);
  }, []);

  const removeSampleData = useCallback(() => {
    setCourses((list) => list.filter((c) => !c.isSample));
    setTasks((list) => list.filter((t) => !t.isSample));
    setFocusSessions((list) => list.filter((s) => !s.isSample));
  }, []);

  const hasSampleData = useMemo(
    () => tasks.some((t) => t.isSample) || courses.some((c) => c.isSample) || focusSessions.some((s) => s.isSample),
    [tasks, courses, focusSessions],
  );

  const value = useMemo(
    () => ({
      now,
      tasks,
      courses,
      focusSessions,
      plans,
      conversations,
      settings,
      hasSampleData,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      addCourse,
      updateCourse,
      deleteCourse,
      addFocusSession,
      deleteFocusSession,
      savePlan,
      deletePlan,
      createConversation,
      updateConversation,
      deleteConversation,
      clearConversations,
      updateSettings,
      replaceAllData,
      resetAllData,
      loadSampleData,
      removeSampleData,
    }),
    [now, tasks, courses, focusSessions, plans, conversations, settings, hasSampleData, addTask, updateTask, toggleTask, deleteTask, addCourse, updateCourse, deleteCourse, addFocusSession, deleteFocusSession, savePlan, deletePlan, createConversation, updateConversation, deleteConversation, clearConversations, updateSettings, replaceAllData, resetAllData, loadSampleData, removeSampleData],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
