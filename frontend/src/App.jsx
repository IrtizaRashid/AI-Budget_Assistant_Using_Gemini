import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useEffect, useState, lazy, Suspense } from 'react';
import { prefetchUserWorkspace } from './services/api.js';

import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import ApiKeyModal from './components/ApiKeyModal.jsx';

// Eagerly loaded for fast initial view
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// Lazily loaded pages for code splitting
const BudgetSetup = lazy(() => import('./pages/BudgetSetup.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const IncomePage = lazy(() => import('./pages/IncomePage.jsx'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage.jsx'));
const BudgetPage = lazy(() => import('./pages/BudgetPage.jsx'));
const SavingsPage = lazy(() => import('./pages/SavingsPage.jsx'));
const LoansPage = lazy(() => import('./pages/LoansPage.jsx'));
const InvestmentsPage = lazy(() => import('./pages/InvestmentsPage.jsx'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const UploadPage = lazy(() => import('./pages/UploadPage.jsx'));

// A user who hasn't finished budget setup has monthly_budget = 0.
const needsBudgetSetup = (user) =>
  Boolean(user) && (!user.monthly_budget || Number(user.monthly_budget) === 0);

// Global fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#0d0d1a]">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-opacity-10 border-t-fuchsia-500" />
  </div>
);

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
    return <PageLoader />;
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
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
