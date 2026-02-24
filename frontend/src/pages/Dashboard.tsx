import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import { assetsApi, clientsApi, guardsApi, payrollApi, sitesApi, toOperatorMessage } from '../lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ guards: 0, clients: 0, sites: 0, assetsAvail: 0, payroll: '-' });

  useEffect(() => {
    (async () => {
      try {
        const [guards, clients, sites, assets, months] = await Promise.all([
          guardsApi.list(),
          clientsApi.list(),
          sitesApi.list(),
          assetsApi.listAvailable(),
          payrollApi.listMonths(),
        ]);
        setStats({ guards: guards.length, clients: clients.length, sites: sites.length, assetsAvail: assets.length, payroll: months[0]?.month || '-' });
      } catch (error) {
        console.error(toOperatorMessage(error, 'Dashboard load failed'));
      }
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
