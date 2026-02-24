import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Guards from './pages/Guards';
import Clients from './pages/Clients';
import Sites from './pages/Sites';
import Assets from './pages/Assets';
import Payroll from './pages/Payroll';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Card from './components/ui/Card';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path='/' element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path='guards' element={<Guards />} />
        <Route path='clients' element={<Clients />} />
        <Route path='sites' element={<Sites />} />
        <Route path='assets' element={<Assets />} />
        <Route path='payroll' element={<Payroll />} />
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
