import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
import Button from './ui/Button';
import Drawer from './ui/Drawer';

const links = ['Dashboard', 'Guards', 'Clients', 'Sites', 'Assets', 'Payroll', 'Invoices', 'Payments', 'Reports'];

export default function Layout() {
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className='space-y-1'>
      {links.map((link) => (
        <Link
          key={link}
          className='block rounded-token-md px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white'
          to={link === 'Dashboard' ? '/' : `/${link.toLowerCase()}`}
          onClick={() => setOpen(false)}
        >
          {link}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className='min-h-screen bg-canvas text-text-primary md:flex'>
      <div className='border-b border-border-subtle bg-surface p-3 md:hidden'>
        <Button variant='secondary' onClick={() => setOpen(true)}>
          ☰ Menu
        </Button>
      </div>
      <aside className='hidden w-64 bg-surface-inverse p-4 md:block'>{nav}</aside>
      <Drawer open={open} onClose={() => setOpen(false)} title='Navigation'>
        <div className='rounded-token-md bg-surface-inverse p-3'>{nav}</div>
      </Drawer>
      <main className='flex-1 p-4 md:p-6'>
        <Outlet />
      </main>
    </div>
  );
}
