import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Payments(){
 const [clients,setClients]=useState<any[]>([]); const [invoices,setInvoices]=useState<any[]>([]); const [items,setItems]=useState<any[]>([]);
 const [form,setForm]=useState<any>({method:'bank'});
 useEffect(()=>{api('/clients').then(setClients);api('/invoices?status=sent').then(setInvoices);api('/payments').then(setItems)},[]);
 const submit=async(e:any)=>{e.preventDefault(); const alloc=form.invoice_id?[{invoice_id:form.invoice_id,amount:Number(form.alloc_amount||form.amount)}]:[]; await api('/payments',{method:'POST',body:JSON.stringify({...form,amount:Number(form.amount),allocations:alloc})}); setItems(await api('/payments'));};
 return <div className='space-y-4'><h1 className='text-2xl font-semibold'>Payments</h1><form onSubmit={submit} className='card grid md:grid-cols-3 gap-2'>
  <select className='input' onChange={e=>setForm({...form,client_id:e.target.value})}>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
  <input type='date' className='input' onChange={e=>setForm({...form,payment_date:e.target.value})}/>
  <input className='input' placeholder='amount' onChange={e=>setForm({...form,amount:e.target.value})}/>
  <select className='input' onChange={e=>setForm({...form,invoice_id:e.target.value})}><option>Allocate invoice</option>{invoices.map((i:any)=><option value={i.id} key={i.id}>{i.invoice_no}</option>)}</select>
  <button className='btn'>Record Payment</button>
 </form><div className='grid gap-2'>{items.map((p:any)=><div key={p.id} className='card'>{p.payment_date} - {p.amount}</div>)}</div></div>
}
