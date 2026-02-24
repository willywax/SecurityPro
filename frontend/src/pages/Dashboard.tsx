import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Card from '../components/ui/Card';

export default function Dashboard() {
  const [stats, setStats] = useState({ guards: 0, clients: 0, sites: 0, assetsAvail: 0, payroll: '-' });

  useEffect(() => {
    (async () => {
      const [guards, clients, sites, assets, months] = await Promise.all([
        api<any[]>('/guards'),
        api<any[]>('/clients'),
        api<any[]>('/sites'),
        api<any[]>('/assets?status=available'),
        api<any[]>('/payroll-months'),
      ]);
      setStats({ guards: guards.length, clients: clients.length, sites: sites.length, assetsAvail: assets.length, payroll: months[0]?.month || '-' });
    })();
  }, []);

  return (
    <div className='grid gap-4 md:grid-cols-4'>
      {Object.entries(stats).map(([k, v]) => (
        <Card key={k}>
          <div className='text-sm text-text-secondary'>{k}</div>
          <div className='text-2xl font-semibold text-text-primary'>{String(v)}</div>
        </Card>
      ))}
    </div>
  );
}
