import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Invoices(){
  const [clients,setClients]=useState<any[]>([]); const [invoices,setInvoices]=useState<any[]>([]);
  const [form,setForm]=useState<any>({currency:'TZS',items:[{description:'Security services',quantity:1,unit_price:0}]});
  useEffect(()=>{api<any[]>('/clients').then(setClients);api<any[]>('/invoices').then(setInvoices)},[]);
  const create=async(e:any)=>{e.preventDefault(); const payload={...form,client_id:form.client_id,issue_date:form.issue_date,due_date:form.due_date,items:form.items,tax_total:Number(form.tax_total||0)}; await api('/invoices',{method:'POST',body:JSON.stringify(payload)}); setInvoices(await api('/invoices'));};
  return <div className='space-y-4'>
    <h1 className='text-2xl font-semibold'>Invoices</h1>
    <form onSubmit={create} className='card grid md:grid-cols-2 gap-2'>
      <select className='input' onChange={e=>setForm({...form,client_id:e.target.value})}>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <input type='date' className='input' onChange={e=>setForm({...form,issue_date:e.target.value})}/>
      <input type='date' className='input' onChange={e=>setForm({...form,due_date:e.target.value})}/>
      <input className='input' placeholder='description' onChange={e=>setForm({...form,items:[{...form.items[0],description:e.target.value}]})}/>
      <input className='input' placeholder='unit price' onChange={e=>setForm({...form,items:[{...form.items[0],unit_price:Number(e.target.value)}]})}/>
      <button className='btn'>Create Invoice</button>
    </form>
    <div className='space-y-2'>{invoices.map(i=><div className='card flex justify-between' key={i.id}><span>{i.invoice_no} - {i.status}</span><span>{i.total}</span></div>)}</div>
  </div>
}
