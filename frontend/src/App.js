import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/EmployeeList';
import EmployeeCreate from './pages/EmployeeCreate';
import EmployeeDetail from './pages/EmployeeDetail';
import ClientList from './pages/ClientList';
import ClientDetail from './pages/ClientDetail';
import SiteList from './pages/SiteList';
import SiteDetail from './pages/SiteDetail';
import AssetList from './pages/AssetList';
import AssetDetail from './pages/AssetDetail';
import PayrollList from './pages/PayrollList';
import PayrollCreate from './pages/PayrollCreate';
import PayrollDetail from './pages/PayrollDetail';
import InvoiceList from './pages/InvoiceList';
import InvoiceCreate from './pages/InvoiceCreate';
import InvoiceDetail from './pages/InvoiceDetail';
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
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/employees/new" element={<EmployeeCreate />} />
            <Route path="/employees/:id" element={<EmployeeDetail />} />
            <Route path="/clients" element={<ClientList />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/sites" element={<SiteList />} />
            <Route path="/sites/:id" element={<SiteDetail />} />
            <Route path="/assets" element={<AssetList />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/payroll" element={<PayrollList />} />
            <Route path="/payroll/new" element={<PayrollCreate />} />
            <Route path="/payroll/:id" element={<PayrollDetail />} />
            <Route path="/invoices" element={<InvoiceList />} />
            <Route path="/invoices/new" element={<InvoiceCreate />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
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
