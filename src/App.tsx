import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout }     from './components/layout/AppLayout';
import { Login }         from './pages/Login';
import { Dashboard }     from './pages/Dashboard';
import { WorkLogs }      from './pages/WorkLogs';
import { Projects }      from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Employees }     from './pages/Employees';
import { Approvals }     from './pages/Approvals';
import { Reports }       from './pages/Reports';
import { Settings }      from './pages/Settings';
import { AcceptInvite }  from './pages/AcceptInvite';
import { Onboarding }    from './pages/Onboarding';
import { useAppStore }   from './store/useAppStore';
import { useCurrentUser } from './hooks/useAuth';
import './styles/main.less';

// Hydrates the store on first load if a token exists
function AuthSync() {
  const { setAuthUser, authToken } = useAppStore();
  const { data } = useCurrentUser();
  useEffect(() => {
    if (data && authToken) {
      setAuthUser(data as Parameters<typeof setAuthUser>[0], authToken);
    }
  }, [data, authToken, setAuthUser]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authToken } = useAppStore();
  if (!authToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAppStore();
  const onboardingKey = currentUser.id ? `onboarding_completed_${currentUser.id}` : 'onboarding_completed';

  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(onboardingKey)
  );

  // Re-evaluate when the user changes (e.g. after AuthSync hydrates)
  useEffect(() => {
    if (currentUser.id) {
      const key = `onboarding_completed_${currentUser.id}`;
      setShowOnboarding(!localStorage.getItem(key));
    }
  }, [currentUser.id]);

  const handleComplete = () => {
    localStorage.setItem(onboardingKey, 'true');
    setShowOnboarding(false);
  };

  if (showOnboarding && currentUser.id) {
    return <Onboarding onComplete={handleComplete} />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthSync />
      <Routes>
        <Route path="/login"  element={<Login />} />
        <Route path="/invite" element={<AcceptInvite />} />
        <Route element={<ProtectedRoute><OnboardingGate><AppLayout /></OnboardingGate></ProtectedRoute>}>
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/work-logs"     element={<WorkLogs />} />
          <Route path="/projects"      element={<Projects />} />
          <Route path="/projects/:id"  element={<ProjectDetail />} />
          <Route path="/employees"     element={<Employees />} />
          <Route path="/approvals"     element={<Approvals />} />
          <Route path="/reports"       element={<Reports />} />
          <Route path="/settings"      element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
