import { useEffect, useState } from 'react';
import { api } from '../lib/api';
export default function Dashboard(){
  const [stats,setStats]=useState({guards:0,clients:0,sites:0,assetsAvail:0,payroll:'-'});
  useEffect(()=>{(async()=>{
    const [guards,clients,sites,assets,months] = await Promise.all([
      api<any[]>('/guards'), api<any[]>('/clients'), api<any[]>('/sites'), api<any[]>('/assets?status=available'), api<any[]>('/payroll-months')
    ]);
    setStats({guards:guards.length,clients:clients.length,sites:sites.length,assetsAvail:assets.length,payroll:months[0]?.month||'-'});
  })();},[]);
  return <div className='grid md:grid-cols-4 gap-4'>{Object.entries(stats).map(([k,v])=><div className='card' key={k}><div className='text-sm text-gray-500'>{k}</div><div className='text-2xl font-semibold'>{String(v)}</div></div>)}</div>
}
