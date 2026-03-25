import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Loader2, TrendingDown } from 'lucide-react';
import writeOffService from '@/services/writeOffService';

const reasonColors = {
  damaged: 'bg-orange-100 text-orange-700',
  lost: 'bg-red-100 text-red-700',
  expired: 'bg-yellow-100 text-yellow-700',
  obsolete: 'bg-slate-100 text-slate-600',
  other: 'bg-purple-100 text-purple-700',
};

const WriteOffRegister = () => {
  const [reasonFilter, setReasonFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['write-offs', { reasonFilter, dateFrom, dateTo }],
    queryFn: () => writeOffService.list({
      reason: reasonFilter !== 'all' ? reasonFilter : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
  });

  const writeOffs = data?.write_offs || [];
  const totalValue = data?.total_value || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Write-off Register</h1>
          <p className="text-slate-500 text-sm mt-1">{data?.total ?? 0} write-off record{data?.total !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-right">
          <p className="text-xs text-red-600 uppercase tracking-wide">Total Value Written Off</p>
          <p className="text-lg font-bold text-red-700">TZS {totalValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Reasons" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            {['damaged', 'lost', 'expired', 'obsolete', 'other'].map(r => (
              <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" placeholder="From" />
          <span className="text-slate-400 text-sm">—</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" placeholder="To" />
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : isError ? (
        <Card><CardContent className="py-12 text-center text-red-600">Failed to load write-off register</CardContent></Card>
      ) : writeOffs.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <TrendingDown className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No write-offs found</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {writeOffs.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="text-slate-600 whitespace-nowrap">{w.write_off_date}</TableCell>
                  <TableCell className="font-medium text-slate-900">{w.item_name}</TableCell>
                  <TableCell className="text-slate-600">{w.asset_type_name || '—'}</TableCell>
                  <TableCell className="text-right font-semibold text-red-700">{w.quantity}</TableCell>
                  <TableCell className="text-right text-slate-600">
                    {w.unit_cost ? `TZS ${Number(w.unit_cost).toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-red-700">
                    TZS {Number(w.value).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={reasonColors[w.reason] || 'bg-slate-100 text-slate-700'}>
                      {w.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 max-w-[200px] truncate">{w.reason_details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default WriteOffRegister;
