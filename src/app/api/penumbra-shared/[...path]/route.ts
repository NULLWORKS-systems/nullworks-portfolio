import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { allowedEmail, displayLabel, inviteTokenValid, isUuid, messageText, normalizedEmail, originAllowed, roomTitle } from '@/lib/penumbra-shared/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabase = (process.env.PENUMBRA_SUPABASE_URL || '').replace(/\/$/, '');
const anon = process.env.PENUMBRA_SUPABASE_ANON_KEY || '';
const service = process.env.PENUMBRA_SUPABASE_SERVICE_ROLE_KEY || '';
const mason = normalizedEmail(process.env.PENUMBRA_MASON_EMAIL);
const jason = normalizedEmail(process.env.PENUMBRA_JASON_EMAIL);
const allowlist = process.env.PENUMBRA_ALLOWED_EMAILS || '';
const ACCESS = 'penumbra_access';
const REFRESH = 'penumbra_refresh';
type Person = { id: string; email: string; name: string };
type Tokens = { access_token: string; refresh_token: string; expires_in?: number };
type Identity = { user: Person; renewed?: Tokens };

function reply(data: unknown, status = 200, tokens?: Tokens) {
  const res = NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  if (tokens) setCookies(res, tokens);
  return res;
}
function setCookies(res: NextResponse, tokens: Tokens) {
  const base = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' };
  res.cookies.set(ACCESS, tokens.access_token, { ...base, maxAge: Math.max(60, Math.min(Number(tokens.expires_in) || 3600, 7200)) });
  res.cookies.set(REFRESH, tokens.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 14 });
}
function ready() { return Boolean(supabase && anon && service && mason && allowlist); }
function allowed(email: string) { return allowedEmail(email, allowlist); }
async function authFetch(path: string, init: RequestInit = {}) {
  return fetch(supabase + '/auth/v1/' + path, { ...init, cache: 'no-store', headers: { apikey: anon, 'Content-Type': 'application/json', ...init.headers } });
}
async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(supabase + '/rest/v1/' + path, {
    ...init, cache: 'no-store',
    headers: { apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json', ...init.headers }
  });
  if (!r.ok) throw new Error('Database operation failed: ' + r.status);
  return (await r.json().catch(() => [])) as any[];
}
async function personFromToken(access: string): Promise<Person | null> {
  if (!access || access.length > 16000) return null;
  const r = await authFetch('user', { headers: { Authorization: 'Bearer ' + access } });
  if (!r.ok) return null;
  const u = await r.json();
  const email = normalizedEmail(u?.email);
  if (!isUuid(u?.id) || !allowed(email)) return null;
  return { id: u.id, email, name: displayLabel(email, mason, jason) };
}
async function identity(req: NextRequest): Promise<Identity | null> {
  const access = req.cookies.get(ACCESS)?.value || '';
  const user = await personFromToken(access);
  if (user) return { user };
  const refresh = req.cookies.get(REFRESH)?.value;
  if (!refresh) return null;
  const r = await authFetch('token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: refresh }) });
  if (!r.ok) return null;
  const tokens = await r.json() as Tokens;
  if (!tokens.access_token || !tokens.refresh_token) return null;
  const renewedUser = await personFromToken(tokens.access_token);
  return renewedUser ? { user: renewedUser, renewed: tokens } : null;
}
async function membership(roomId: string, userId: string) {
  const rows = await db('penumbra_room_members?select=role,display_name&room_id=eq.' + roomId + '&user_id=eq.' + userId + '&limit=1');
  return rows[0] || null;
}
function csrf(req: NextRequest) { return originAllowed(req.headers.get('origin'), req.nextUrl.origin); }
async function body(req: NextRequest) { try { return await req.json(); } catch { return null; } }
function errorResponse(e: unknown) {
  console.error('PENUMBRA shared API failure:', e instanceof Error ? e.message : 'unknown');
  return reply({ error: 'Shared workroom operation failed' }, 500);
}

async function handler(req: NextRequest, parts: string[]) {
  if (!ready()) return reply({ error: 'PENUMBRA preview configuration incomplete' }, 503);
  if (req.method === 'POST' && !csrf(req)) return reply({ error: 'Origin rejected' }, 403);
  const route = parts.join('/');
  const data = req.method === 'POST' ? await body(req) : null;
  if (req.method === 'POST' && data === null) return reply({ error: 'Invalid request' }, 400);

  if (route === 'auth/start' && req.method === 'POST') {
    const email = normalizedEmail(data?.email);
    if (!allowed(email)) return reply({ error: 'Email is not approved for this workroom' }, 403);
    const join = data?.join;
    const invitation = isUuid(join?.room) && inviteTokenValid(join?.token)
      ? '?room=' + encodeURIComponent(join.room) + '&invite=' + encodeURIComponent(join.token) : '';
    const redirect = req.nextUrl.origin + '/penumbra-workroom/shared' + invitation;
    const r = await authFetch('otp?redirect_to=' + encodeURIComponent(redirect), {
      method: 'POST', body: JSON.stringify({ email, create_user: true })
    });
    if (!r.ok) return reply({ error: r.status === 429 ? 'Email requests are rate limited' : 'Sign-in email could not be requested' }, r.status === 429 ? 429 : 502);
    return reply({ ok: true });
  }

  if (route === 'auth/verify' && req.method === 'POST') {
    const email = normalizedEmail(data?.email);
    const token = typeof data?.token === 'string' ? data.token.trim() : '';
    if (!allowed(email) || !/^[0-9]{6,8}$/.test(token)) return reply({ error: 'Invalid verification details' }, 400);
    const r = await authFetch('verify', { method: 'POST', body: JSON.stringify({ email, token, type: 'email' }) });
    if (!r.ok) return reply({ error: 'Invalid or expired code' }, 401);
    const tokens = await r.json() as Tokens;
    const user = await personFromToken(tokens.access_token);
    if (!user || user.email !== email || !tokens.refresh_token) return reply({ error: 'Account not approved' }, 403);
    return reply({ user }, 200, tokens);
  }

  if (route === 'auth/session' && req.method === 'POST') {
    const tokens: Tokens = {
      access_token: typeof data?.accessToken === 'string' ? data.accessToken : '',
      refresh_token: typeof data?.refreshToken === 'string' ? data.refreshToken : ''
    };
    if (!tokens.refresh_token || tokens.refresh_token.length > 1000) return reply({ error: 'Invalid session' }, 400);
    const user = await personFromToken(tokens.access_token);
    if (!user) return reply({ error: 'Invalid or unapproved session' }, 401);
    return reply({ user }, 200, tokens);
  }
  if (route === 'auth/logout' && req.method === 'POST') {
    const res = reply({ ok: true });
    res.cookies.delete(ACCESS);
    res.cookies.delete(REFRESH);
    return res;
  }

  const auth = await identity(req);
  if (!auth) return reply({ error: 'Sign in required' }, 401);
  const { user, renewed } = auth;
  if (route === 'auth/me' && req.method === 'GET') return reply({ user }, 200, renewed);

  if (route === 'rooms' && req.method === 'GET') {
    const members = await db('penumbra_room_members?select=room_id&user_id=eq.' + user.id + '&limit=100');
    if (!members.length) return reply({ rooms: [] }, 200, renewed);
    const ids = members.map(m => m.room_id).filter(isUuid);
    if (!ids.length) return reply({ rooms: [] }, 200, renewed);
    const rooms = await db('penumbra_rooms?select=id,title,owner_user_id,created_at&id=in.(' + ids.join(',') + ')&archived_at=is.null&order=created_at.asc');
    return reply({ rooms }, 200, renewed);
  }
  if (route === 'rooms' && req.method === 'POST') {
    if (user.email !== mason) return reply({ error: 'Only the owner may create rooms' }, 403, renewed);
    const title = roomTitle(data?.title);
    if (!title) return reply({ error: 'Room title must be 1–120 characters' }, 400, renewed);
    const created = await db('penumbra_rooms', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ title, owner_user_id: user.id }) });
    const room = created[0];
    if (!room?.id) throw new Error('Room creation returned no ID');
    await db('penumbra_room_members', { method: 'POST', body: JSON.stringify({ room_id: room.id, user_id: user.id, role: 'owner', display_name: user.name }) });
    return reply({ room }, 201, renewed);
  }

  if (parts.length < 3 || parts[0] !== 'rooms' || !isUuid(parts[1])) return reply({ error: 'Not found' }, 404, renewed);
  const roomId = parts[1];
  const member = await membership(roomId, user.id);
  const operation = parts[2];
  if (operation === 'join' && req.method === 'POST') {
    const token = data?.token;
    if (!inviteTokenValid(token)) return reply({ error: 'Invalid invitation' }, 400, renewed);
    if (member) return reply({ joined: true }, 200, renewed);
    const hashed = createHash('sha256').update(token).digest('hex');
    const invited = await db('penumbra_room_invites?select=id,invitee_email,expires_at,used_at&room_id=eq.' + roomId + '&token_sha256=eq.' + hashed + '&limit=1');
    const invite = invited[0];
    if (!invite || normalizedEmail(invite.invitee_email) !== user.email || invite.used_at || new Date(invite.expires_at).getTime() <= Date.now()) {
      return reply({ error: 'Invitation invalid, expired, or belongs to another account' }, 403, renewed);
    }
    const claimed = await db('penumbra_room_invites?id=eq.' + invite.id + '&used_at=is.null', {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ used_by: user.id, used_at: new Date().toISOString() })
    });
    if (claimed.length !== 1) return reply({ error: 'Invitation was already used' }, 409, renewed);
    await db('penumbra_room_members', { method: 'POST', body: JSON.stringify({ room_id: roomId, user_id: user.id, role: 'member', display_name: user.name }) });
    return reply({ joined: true }, 200, renewed);
  }
  if (!member) return reply({ error: 'Room membership required' }, 403, renewed);

  if (operation === 'events' && req.method === 'GET') {
    const events = await db('penumbra_room_events?select=id,room_id,actor_type,actor_label,content,model,parent_event_id,created_at&room_id=eq.' + roomId + '&order=created_at.asc&limit=500');
    return reply({ events }, 200, renewed);
  }
  if (operation === 'events' && req.method === 'POST') {
    const content = messageText(data?.content);
    if (!content || !isUuid(data?.clientEventId)) return reply({ error: 'Invalid message' }, 400, renewed);
    const created = await db('penumbra_room_events', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ room_id: roomId, client_event_id: data.clientEventId, author_user_id: user.id, actor_type: 'human', actor_label: user.name, content })
    });
    return reply({ event: created[0] }, 201, renewed);
  }
  if (operation === 'invite' && req.method === 'POST') {
    if (member.role !== 'owner' || user.email !== mason) return reply({ error: 'Owner approval required' }, 403, renewed);
    const email = normalizedEmail(data?.email);
    if (!allowed(email) || email === mason || (jason && email !== jason)) return reply({ error: 'Invitee not approved' }, 403, renewed);
    const token = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    await db('penumbra_room_invites', {
      method: 'POST', body: JSON.stringify({ room_id: roomId, invited_by: user.id, invitee_email: email, token_sha256: hash, expires_at: new Date(Date.now() + 86400000).toISOString() })
    });
    const inviteUrl = req.nextUrl.origin + '/penumbra-workroom/shared?room=' + roomId + '&invite=' + token;
    return reply({ inviteUrl, sent: false }, 201, renewed);
  }
  if (operation === 'ai' && req.method === 'POST') {
    if (process.env.PENUMBRA_AI_ENABLED !== 'true') return reply({ error: 'AI execution is disabled until the private room is verified' }, 503, renewed);
    if (!process.env.OPENAI_API_KEY) return reply({ error: 'ChatGPT service is not configured' }, 503, renewed);
    if (!isUuid(data?.clientEventId) || !isUuid(data?.parentEventId)) return reply({ error: 'Invalid AI request' }, 400, renewed);
    const events = await db('penumbra_room_events?select=id,actor_type,actor_label,content&room_id=eq.' + roomId + '&order=created_at.desc&limit=35');
    const trigger = events.find(e => e.id === data.parentEventId && e.actor_type === 'human');
    if (!trigger) return reply({ error: 'AI request must follow a human room message' }, 400, renewed);
    const context = events.reverse().map(e => e.actor_label + ': ' + e.content).join('\n').slice(-30000);
    const ai = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.PENUMBRA_OPENAI_MODEL || 'gpt-4.1', max_output_tokens: 1200,
        instructions: 'You are ChatGPT participating in the private NULLWORKS PENUMBRA shared room. Be useful, concise, and evidence-based. You have no permission to execute external actions. Human Authority remains final.',
        input: context })
    });
    if (!ai.ok) return reply({ error: 'ChatGPT service unavailable (' + ai.status + ')' }, 502, renewed);
    const result = await ai.json();
    const response = typeof result.output_text === 'string' ? result.output_text : (Array.isArray(result.output) ? result.output.flatMap((o:any) => (o.content || []).filter((c:any) => c.type === 'output_text').map((c:any) => c.text)).join('\n') : '');
    if (!response.trim()) return reply({ error: 'AI service returned no text' }, 502, renewed);
    const created = await db('penumbra_room_events', { method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ room_id: roomId, client_event_id: data.clientEventId, actor_type: 'ai', actor_label: 'ChatGPT', content: response.slice(0, 12000), provider: 'openai', model: result.model || 'gpt-4.1', parent_event_id: trigger.id }) });
    return reply({ event: created[0] }, 201, renewed);
  }
  return reply({ error: 'Not found' }, 404, renewed);
}
export async function GET(req: NextRequest, ctx: { params: Promise<{path:string[]}> }) {
  try { return await handler(req, (await ctx.params).path); } catch(e) { return errorResponse(e); }
}
export async function POST(req: NextRequest, ctx: { params: Promise<{path:string[]}> }) {
  try { return await handler(req, (await ctx.params).path); } catch(e) { return errorResponse(e); }
}
