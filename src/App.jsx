import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppDataProvider } from './context/AppDataContext.jsx';
import { UiProvider } from './context/UiContext.jsx';
import { AiStatusProvider } from './context/AiStatusContext.jsx';
import { FocusTimerProvider } from './context/FocusTimerContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import StorageWatcher from './components/layout/StorageWatcher.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import PlannerPage from './pages/PlannerPage.jsx';
import AcademicPage from './pages/AcademicPage.jsx';
import CourseDetailPage from './pages/CourseDetailPage.jsx';
import FocusPage from './pages/FocusPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

/**
 * Provider order matters:
 *  UiProvider (toasts/confirm) → AppDataProvider (data) → AI status → Focus timer.
 */
export default function App() {
  return (
    <BrowserRouter>
      <UiProvider>
        <AppDataProvider>
          <AiStatusProvider>
            <FocusTimerProvider>
              <StorageWatcher />
              <Routes>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="planner" element={<PlannerPage />} />
                  <Route path="academic" element={<AcademicPage />} />
                  <Route path="academic/:courseId" element={<CourseDetailPage />} />
                  <Route path="focus" element={<FocusPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="assistant" element={<AssistantPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </FocusTimerProvider>
          </AiStatusProvider>
        </AppDataProvider>
      </UiProvider>
    </BrowserRouter>
  );
}
