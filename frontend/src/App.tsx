import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Sidebar";
import { SettingsProvider } from "@/context/SettingsContext";
import { ChatsProvider } from "@/context/ChatsContext";
import { ToastProvider } from "@/components/ui";
import { OfflineProvider } from "@/context/OfflineContext";
import { OfflineBanner } from "@/components/OfflineBanner";
import Dashboard from "@/pages/Dashboard";
import AIChat from "@/pages/AIChat";
import StudyAssistant from "@/pages/StudyAssistant";
import TasksPage from "@/pages/Tasks";
import StudyPlanner from "@/pages/StudyPlanner";
import NotesPage from "@/pages/Notes";
import LearningHub from "@/pages/Learning";
import CalendarPage from "@/pages/Calendar";
import AnalyticsPage from "@/pages/Analytics";
import FocusPage from "@/pages/Focus";
import SettingsPage from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<AIChat />} />
        <Route path="/study-assistant" element={<StudyAssistant />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/planner" element={<StudyPlanner />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/learning" element={<LearningHub />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/focus" element={<FocusPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <OfflineProvider>
          <ChatsProvider>
            <BrowserRouter>
              <Layout>
                <AppRoutes />
              </Layout>
            </BrowserRouter>
          </ChatsProvider>
        </OfflineProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}