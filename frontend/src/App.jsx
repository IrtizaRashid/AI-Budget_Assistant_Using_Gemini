import { Routes, Route, Navigate } from 'react-router-dom';
import BudgetSetup from './pages/BudgetSetup.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Root component — defines the app's routes.
// "/"          -> first-time budget setup (Step 3)
// "/dashboard" -> placeholder until Step 4
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BudgetSetup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      {/* Any unknown path falls back to setup */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
