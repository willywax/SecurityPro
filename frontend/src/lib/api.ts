const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export async function api<T>(path:string, init?:RequestInit):Promise<T>{
  const res = await fetch(`${API}${path}`, { headers:{'Content-Type':'application/json'}, ...init });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}
