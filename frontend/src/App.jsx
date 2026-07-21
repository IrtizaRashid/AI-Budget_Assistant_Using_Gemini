import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import BudgetSetup from './pages/BudgetSetup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import IncomePage from './pages/IncomePage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import BudgetPage from './pages/BudgetPage.jsx';
import SavingsPage from './pages/SavingsPage.jsx';
import LoansPage from './pages/LoansPage.jsx';
import InvestmentsPage from './pages/InvestmentsPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AIAssistantPage from './pages/AIAssistantPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import ApiKeyModal from './components/ApiKeyModal.jsx';
import { useEffect, useState } from 'react';
import { prefetchUserWorkspace } from './services/api.js';

// A user who hasn't finished budget setup has monthly_budget = 0.
const needsBudgetSetup = (user) =>
  Boolean(user) && (!user.monthly_budget || Number(user.monthly_budget) === 0);

export default function App() {
  const { user, loading, refreshUser } = useAuth();
  const [keyPrompt, setKeyPrompt] = useState({ open: false, reason: '' });

  // Force budget-less users into /setup from ANY entry point (fresh login,
  // page refresh, or the auth-state listener restoring a session).
  const mustSetup = needsBudgetSetup(user);

  function AuthedLayout({ children }) {
    if (mustSetup) return <Navigate to="/setup" replace />;
    return (
      <ProtectedRoute>
        <AppLayout>{children}</AppLayout>
      </ProtectedRoute>
    );
  }

  useEffect(() => {
    const handler = (event) => {
      setKeyPrompt({
        open: true,
        reason: event.detail?.message || 'Update your Gemini API key to continue using AI features.',
      });
    };
    window.addEventListener('gemini-key-required', handler);
    window.addEventListener('open-gemini-key-modal', handler);
    return () => {
      window.removeEventListener('gemini-key-required', handler);
      window.removeEventListener('open-gemini-key-modal', handler);
    };
  }, []);

  useEffect(() => {
    if (user?.id && !mustSetup) {
      prefetchUserWorkspace(user.id);
    }
  }, [user?.id, mustSetup]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0d1a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-opacity-10 border-t-fuchsia-500" />
      </div>
    );
  }

  return (
    <>
      <Routes>
      {/* Public routes */}
      <Route path="/login"    element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
      <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
      <Route path="/upload-demo" element={<UploadPage />} />

      {/* Budget setup — protected but not in sidebar layout.
          Send already-configured users back to the dashboard. */}
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            {mustSetup ? <BudgetSetup /> : <Navigate to="/dashboard" replace />}
          </ProtectedRoute>
        }
      />

      {/* Upload page */}
      <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />

      {/* App routes wrapped in sidebar layout */}
      <Route path="/dashboard"    element={<AuthedLayout><Dashboard /></AuthedLayout>} />
      <Route path="/income"       element={<AuthedLayout><IncomePage /></AuthedLayout>} />
      <Route path="/expenses"     element={<AuthedLayout><ExpensesPage /></AuthedLayout>} />
      <Route path="/budget"       element={<AuthedLayout><BudgetPage /></AuthedLayout>} />
      <Route path="/savings"      element={<AuthedLayout><SavingsPage /></AuthedLayout>} />
      <Route path="/loans"        element={<AuthedLayout><LoansPage /></AuthedLayout>} />
      <Route path="/investments"  element={<AuthedLayout><InvestmentsPage /></AuthedLayout>} />
      <Route path="/transactions" element={<AuthedLayout><TransactionsPage /></AuthedLayout>} />
      <Route path="/analytics"    element={<AuthedLayout><AnalyticsPage /></AuthedLayout>} />
      <Route path="/ai"           element={<AuthedLayout><AIAssistantPage /></AuthedLayout>} />
      <Route path="/settings"     element={<AuthedLayout><SettingsPage /></AuthedLayout>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
      <ApiKeyModal
        open={Boolean(user && keyPrompt.open)}
        reason={keyPrompt.reason}
        onClose={() => setKeyPrompt({ open: false, reason: '' })}
        onSaved={async () => {
          await refreshUser();
          setKeyPrompt({ open: false, reason: '' });
        }}
      />
    </>
  );
}
