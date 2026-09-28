export const SUPABASE_URL = 'https://foveyfclihpsnwhfchib.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_dwKE-u6b2hjRhoC9f-P_jw_S_m__cmR';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

export async function dbGet<T>(path: string): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, cache: 'no-store' });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function dbPost<T>(table: string, body: unknown, prefer = 'return=representation'): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: 'POST', headers: { ...headers, Prefer: prefer }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return prefer.includes('representation') ? r.json() : (undefined as T);
}

export async function dbPatch<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function dbUpsert<T>(table: string, body: unknown, onConflict: string): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
