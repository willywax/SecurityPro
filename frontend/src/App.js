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
import StorePage from './pages/StorePage';
import InventoryList from './pages/InventoryList';
import InventoryCreate from './pages/InventoryCreate';
import InventoryDetail from './pages/InventoryDetail';
import IssuancesPage from './pages/IssuancesPage';
import WriteOffRegister from './pages/WriteOffRegister';
import AssetTypesPage from './pages/AssetTypesPage';
import PayrollList from './pages/PayrollList';
import PayrollCreate from './pages/PayrollCreate';
import PayrollDetail from './pages/PayrollDetail';
import InvoiceList from './pages/InvoiceList';
import InvoiceCreate from './pages/InvoiceCreate';
import InvoiceDetail from './pages/InvoiceDetail';
import ZoneList from './pages/ZoneList';
import ZoneDetail from './pages/ZoneDetail';
import RegionList from './pages/RegionList';
import RegionDetail from './pages/RegionDetail';
import UsersPage from './pages/UsersPage';
import AllocationsPage from './pages/AllocationsPage';
import DailyLogsPage from './pages/DailyLogsPage';
import SubmitDailyLogPage from './pages/SubmitDailyLogPage';
import DailyLogDetailPage from './pages/DailyLogDetailPage';
import EmployeeReportPage from './pages/EmployeeReportPage';
import EmployeeReportResultsPage from './pages/EmployeeReportResultsPage';
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
            <Route path="/clients/new" element={<ClientDetail />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/sites" element={<SiteList />} />
            <Route path="/sites/new" element={<SiteDetail />} />
            <Route path="/sites/:id" element={<SiteDetail />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/inventory" element={<InventoryList />} />
            <Route path="/inventory/new" element={<InventoryCreate />} />
            <Route path="/inventory/:id" element={<InventoryDetail />} />
            <Route path="/issuances" element={<IssuancesPage />} />
            <Route path="/write-offs" element={<WriteOffRegister />} />
            <Route path="/asset-types" element={<AssetTypesPage />} />
            <Route path="/payroll" element={<PayrollList />} />
            <Route path="/payroll/new" element={<PayrollCreate />} />
            <Route path="/payroll/:id" element={<PayrollDetail />} />
            <Route path="/invoices" element={<InvoiceList />} />
            <Route path="/invoices/new" element={<InvoiceCreate />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/zones" element={<ZoneList />} />
            <Route path="/zones/new" element={<ZoneDetail />} />
            <Route path="/zones/:id" element={<ZoneDetail />} />
            <Route path="/regions" element={<RegionList />} />
            <Route path="/regions/new" element={<RegionDetail />} />
            <Route path="/regions/:id" element={<RegionDetail />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/allocations" element={<AllocationsPage />} />
            <Route path="/daily-logs" element={<DailyLogsPage />} />
            <Route path="/daily-logs/new" element={<SubmitDailyLogPage />} />
            <Route path="/daily-logs/:id" element={<DailyLogDetailPage />} />
            <Route path="/reports/employees" element={<EmployeeReportPage />} />
            <Route path="/reports/employees/results" element={<EmployeeReportResultsPage />} />
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
