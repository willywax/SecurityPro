import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function SimpleCrudPage({title,path,fields}:{title:string,path:string,fields:string[]}){
 const [items,setItems]=useState<any[]>([]);
 const [form,setForm]=useState<any>({});
 const load=()=>api<any[]>(`/${path}`).then(setItems);
 useEffect(()=>{load()},[path]);
 const submit=async(e:any)=>{e.preventDefault(); await api(`/${path}`,{method:'POST',body:JSON.stringify(form)}); setForm({}); load();};
 return <div className='space-y-4'>
  <h1 className='text-2xl font-semibold'>{title}</h1>
  <form onSubmit={submit} className='card grid md:grid-cols-3 gap-3'>
   {fields.map(f=><input key={f} placeholder={f} className='input' value={form[f]||''} onChange={e=>setForm({...form,[f]:e.target.value})} />)}
   <button className='btn'>Create</button>
  </form>
  <div className='grid md:grid-cols-2 gap-3'>{items.map(i=><div key={i.id} className='card overflow-auto'><pre className='text-xs'>{JSON.stringify(i,null,2)}</pre></div>)}</div>
 </div>
}
