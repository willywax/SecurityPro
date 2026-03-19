import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import { Toaster } from './components/ui/sonner';

// Placeholder pages for navigation items
const PlaceholderPage = ({ title }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center" data-testid={`page-${title.toLowerCase()}`}>
    <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
    <p className="text-slate-500">This module will be implemented in the next phase.</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected routes with dashboard layout */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<PlaceholderPage title="Employees" />} />
            <Route path="/clients" element={<PlaceholderPage title="Clients" />} />
            <Route path="/sites" element={<PlaceholderPage title="Sites" />} />
            <Route path="/assets" element={<PlaceholderPage title="Assets" />} />
            <Route path="/payroll" element={<PlaceholderPage title="Payroll" />} />
            <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
