import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

type NavItem = {
  label: string;
  to: string;
  icon: string;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: '⌂' },
  { label: 'Guards', to: '/guards', icon: '🛡️' },
  { label: 'Clients', to: '/clients', icon: '👥' },
  { label: 'Sites', to: '/sites', icon: '📍' },
  { label: 'Assets', to: '/assets', icon: '🧰' },
  { label: 'Payroll', to: '/payroll', icon: '💵' },
  { label: 'Invoices', to: '/invoices', icon: '🧾' },
  { label: 'Payments', to: '/payments', icon: '💳' },
  { label: 'Reports', to: '/reports', icon: '📊' },
];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/guards': 'Guards',
  '/clients': 'Clients',
  '/sites': 'Sites',
  '/assets': 'Assets',
  '/payroll': 'Payroll',
  '/invoices': 'Invoices',
  '/payments': 'Payments',
  '/reports': 'Reports',
};

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const pageTitle = useMemo(() => {
    return pageTitles[location.pathname] ?? 'Security Pro';
  }, [location.pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      openButtonRef.current?.focus();
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !drawerRef.current) {
        return;
      }

      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ];

      const focusableEls = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(focusableSelectors.join(',')),
      );

      if (focusableEls.length === 0) {
        return;
      }

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapFocus);
    };
  }, [drawerOpen]);

  const nav = (
    <nav aria-label='Primary' className='space-y-1'>
      {navItems.map((item) => (
        <NavLink
          end={item.to === '/'}
          key={item.label}
          to={item.to}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-token-md px-3 py-2 text-sm font-medium transition',
              isActive
                ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/40'
                : 'text-white/90 hover:bg-white/10 hover:text-white',
            ].join(' ')
          }
        >
          <span aria-hidden='true'>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className='min-h-screen bg-canvas text-text-primary md:flex'>
      <aside className='fixed inset-y-0 left-0 hidden w-64 bg-surface-inverse p-4 md:block'>
        <Link className='mb-6 block text-lg font-semibold text-white' to='/'>
          Security Pro
        </Link>
        {nav}
      </aside>

      {drawerOpen && (
        <div className='fixed inset-0 z-50 md:hidden'>
          <button
            aria-label='Close navigation menu'
            className='absolute inset-0 bg-black/45'
            onClick={() => setDrawerOpen(false)}
            type='button'
          />
          <aside
            id='mobile-nav'
            aria-label='Mobile navigation'
            aria-modal='true'
            className='relative h-full w-72 bg-surface-inverse p-4 shadow-lg'
            ref={drawerRef}
            role='dialog'
          >
            <div className='mb-4 flex items-center justify-between'>
              <span className='text-lg font-semibold text-white'>Security Pro</span>
              <button
                aria-label='Close menu'
                className='rounded-token-sm p-2 text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                onClick={() => setDrawerOpen(false)}
                ref={closeButtonRef}
                type='button'
              >
                ✕
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className='flex min-h-screen flex-1 flex-col md:ml-64'>
        <header className='sticky top-0 z-30 border-b border-border-subtle bg-surface/95 px-4 py-3 backdrop-blur md:px-6'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <button
                aria-expanded={drawerOpen}
                aria-label='Open navigation menu'
                aria-controls='mobile-nav'
                className='inline-flex items-center justify-center rounded-token-md border border-border-subtle bg-surface-muted px-3 py-2 text-sm font-medium text-text-primary shadow-token-sm transition hover:bg-slate-200 md:hidden'
                onClick={() => setDrawerOpen(true)}
                ref={openButtonRef}
                type='button'
              >
                ☰
              </button>
              <h1 className='text-lg font-semibold md:text-xl'>{pageTitle}</h1>
            </div>
            <div className='flex items-center gap-2'>
              <button
                className='inline-flex items-center justify-center rounded-token-md border border-border-subtle bg-surface-muted px-3 py-2 text-sm font-medium text-text-primary shadow-token-sm transition hover:bg-slate-200'
                type='button'
              >
                + Add Shift
              </button>
              <button
                className='inline-flex items-center justify-center rounded-token-md border border-border-subtle bg-surface-muted px-3 py-2 text-sm font-medium text-text-primary shadow-token-sm transition hover:bg-slate-200'
                type='button'
              >
                Generate Report
              </button>
              <button
                className='rounded-token-md border border-border-subtle px-3 py-2 text-sm text-text-primary hover:bg-surface-muted'
                type='button'
              >
                User Menu
              </button>
            </div>
          </div>
        </header>

        <main className='flex-1 p-4 md:p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
