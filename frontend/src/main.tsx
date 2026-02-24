import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SimpleCrudPage from './pages/SimpleCrudPage';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Card from './components/ui/Card';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path='/' element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path='guards' element={<SimpleCrudPage title='Guards' path='guards' fields={['guard_no', 'full_name', 'hire_date', 'base_salary_monthly']} />} />
        <Route path='clients' element={<SimpleCrudPage title='Clients' path='clients' fields={['name', 'contact_name', 'billing_email']} />} />
        <Route path='sites' element={<SimpleCrudPage title='Sites' path='sites' fields={['client_id', 'name', 'region']} />} />
        <Route path='assets' element={<SimpleCrudPage title='Assets' path='assets' fields={['asset_tag', 'type', 'name']} />} />
        <Route path='payroll' element={<SimpleCrudPage title='Payroll Months' path='payroll-months' fields={['month']} />} />
        <Route path='invoices' element={<Invoices />} />
        <Route path='payments' element={<Payments />} />
        <Route
          path='reports'
          element={<Card>Reports: use statement endpoint and A/R summary from API.</Card>}
        />
      </Route>
    </Routes>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
