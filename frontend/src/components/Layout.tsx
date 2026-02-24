import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
const links = ['Dashboard','Guards','Clients','Sites','Assets','Payroll','Invoices','Payments','Reports'];
export default function Layout(){
 const [open,setOpen]=useState(false);
 return <div className='min-h-screen md:flex'>
  <button className='md:hidden p-3' onClick={()=>setOpen(!open)}>☰</button>
  <aside className={`${open?'block':'hidden'} md:block w-64 bg-slate-900 text-white p-4 space-y-2`}>
   {links.map(l=><Link key={l} className='block p-2 rounded hover:bg-slate-700' to={l==='Dashboard'?'/':`/${l.toLowerCase()}`}>{l}</Link>)}
  </aside>
  <main className='flex-1 p-4'><Outlet/></main>
 </div>
}
