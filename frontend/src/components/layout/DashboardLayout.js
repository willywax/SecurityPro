import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { X } from 'lucide-react';

const DashboardLayout = ({ pageTitle }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="dashboard-layout">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar (Drawer) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg bg-slate-700/50 text-white hover:bg-slate-700 transition-colors"
          data-testid="btn-close-mobile-menu"
        >
          <X className="w-5 h-5" />
        </button>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header 
          onMenuClick={() => setMobileMenuOpen(true)} 
          title={pageTitle}
        />

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
