import { useMemo, useState } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Dialog from '../components/ui/Dialog';
import Select from '../components/ui/Select';

type WorkflowAction = 'issue' | 'return' | 'lost';

type HistoryItem = {
  id: number;
  action: WorkflowAction;
  actor: string;
  note: string;
  at: string;
};

const labels: Record<WorkflowAction, string> = {
  issue: 'Issue Asset',
  return: 'Return Asset',
  lost: 'Report Lost',
};

const badgeVariant: Record<WorkflowAction, 'info' | 'success' | 'danger'> = {
  issue: 'info',
  return: 'success',
  lost: 'danger',
};

export default function Assets() {
  const [selectedAction, setSelectedAction] = useState<WorkflowAction>('issue');
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: 1, action: 'issue', actor: 'Ops Manager', note: 'Issued to Guard #G-92', at: '2026-02-05 08:40' },
    { id: 2, action: 'return', actor: 'Store Officer', note: 'Returned in good condition', at: '2026-02-12 19:15' },
  ]);

  const activeCount = useMemo(() => history.filter((item) => item.action === 'issue').length, [history]);

  const executeAction = () => {
    setHistory((current) => [
      {
        id: Math.max(0, ...current.map((item) => item.id)) + 1,
        action: selectedAction,
        actor: 'Current User',
        note:
          selectedAction === 'issue'
            ? 'Issued from central stock'
            : selectedAction === 'return'
              ? 'Returned to warehouse'
              : 'Marked as lost during shift',
        at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      },
      ...current,
    ]);
    setConfirmOpen(false);
  };

  return (
    <div className='space-y-4'>
      <Card>
        <h1 className='mb-4 text-xl font-semibold'>Asset Workflow</h1>
        <div className='grid gap-4 md:grid-cols-[1fr_auto]'>
          <div>
            <label className='mb-1 block text-xs text-text-secondary'>Workflow Action</label>
            <Select value={selectedAction} onChange={(event) => setSelectedAction(event.target.value as WorkflowAction)}>
              <option value='issue'>Issue</option>
              <option value='return'>Return</option>
              <option value='lost'>Lost</option>
            </Select>
          </div>
          <div className='flex items-end'>
            <Button onClick={() => setConfirmOpen(true)}>{labels[selectedAction]}</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold'>Issuance History Timeline</h2>
          <Badge variant='neutral'>{activeCount} issues recorded</Badge>
        </div>
        <ol className='space-y-3 border-l border-border-subtle pl-4'>
          {history.map((item) => (
            <li key={item.id} className='relative'>
              <span className='absolute -left-[1.125rem] top-2 h-2.5 w-2.5 rounded-full bg-brand-600' />
              <div className='rounded-token-md border border-border-subtle bg-surface-muted p-3'>
                <div className='mb-1 flex items-center justify-between'>
                  <Badge variant={badgeVariant[item.action]}>{item.action.toUpperCase()}</Badge>
                  <span className='text-xs text-text-secondary'>{item.at}</span>
                </div>
                <p className='text-sm font-medium'>{item.actor}</p>
                <p className='text-sm text-text-secondary'>{item.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Dialog open={confirmOpen} title={`Confirm ${labels[selectedAction]}`} onClose={() => setConfirmOpen(false)}>
        <p className='mb-4 text-sm text-text-secondary'>
          This action will be logged to issuance history and can affect stock and assignment status.
        </p>
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant={selectedAction === 'lost' ? 'danger' : 'primary'} onClick={executeAction}>
            Confirm
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
