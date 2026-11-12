'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type User = { id:string; email:string; name:string };
type Room = { id:string; title:string; owner_user_id:string; created_at:string };
type Event = { id:string; room_id:string; actor_label:string; actor_type:'human'|'ai'|'system'; content:string; created_at:string; model:string|null; parent_event_id:string|null };
type JsonResponse = { error?:string; [key:string]:any };
const ROOT = '/api/penumbra-shared';

async function api(path:string, method:'GET'|'POST'='GET', body?:unknown):Promise<JsonResponse> {
  const result = await fetch(ROOT+path,{method,credentials:'same-origin',cache:'no-store',
    headers:body===undefined?undefined:{'Content-Type':'application/json'},
    body:body===undefined?undefined:JSON.stringify(body)});
  const value = await result.json().catch(()=>({error:'Invalid server response'}));
  if (!result.ok) throw new Error(value.error||`Server error ${result.status}`);
  return value;
}

export default function SharedRoomClient() {
  const [user,setUser] = useState<User|null>(null);
  const [initializing,setInitializing] = useState(true);
  const [email,setEmail] = useState('');
  const [otp,setOtp] = useState('');
  const [codeSent,setCodeSent] = useState(false);
  const [rooms,setRooms] = useState<Room[]>([]);
  const [active,setActive] = useState<Room|null>(null);
  const [events,setEvents] = useState<Event[]>([]);
  const [newRoom,setNewRoom] = useState('Jason + Mason + ChatGPT + Grok');
  const [message,setMessage] = useState('');
  const [inviteEmail,setInviteEmail] = useState('');
  const [inviteUrl,setInviteUrl] = useState('');
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [aiBusy,setAiBusy] = useState(false);
  const [join,setJoin] = useState<{room:string;token:string}|null>(null);
  const [unread,setUnread] = useState(0);
  const bottom = useRef<HTMLDivElement|null>(null);
  const mounted = useRef(false);
  const activeRoomId = useRef<string|null>(null);
  const lastEventCount = useRef(0);

  const loadRooms = useCallback(async () => {
    const res = await api('/rooms');
    const list = Array.isArray(res.rooms)?res.rooms as Room[]:[];
    setRooms(list);
    setActive(current => current ? list.find(r=>r.id===current.id)||null : list[0]||null);
  },[]);
  const loadEvents = useCallback(async (roomId:string, quiet=false) => {
    try {
      const res = await api(`/rooms/${roomId}/events`);
      if (Array.isArray(res.events) && activeRoomId.current === roomId) {
        const incoming = res.events as Event[];
        if (quiet && lastEventCount.current && incoming.length > lastEventCount.current) {
          setUnread(count=>count+incoming.length-lastEventCount.current);
        }
        lastEventCount.current=incoming.length;
        setEvents(incoming);
      }
    } catch(e) { if (!quiet) setError((e as Error).message); }
  },[]);
  useEffect(()=>{
    if(mounted.current) return;
    mounted.current=true;
    const params = new URLSearchParams(location.search);
    const room=params.get('room'),token=params.get('invite');
    if(room && token){setJoin({room,token});history.replaceState(null,'',location.pathname+location.hash);}
    (async()=>{
      const hash = new URLSearchParams(location.hash.replace(/^#/,''));
      const accessToken=hash.get('access_token'),refreshToken=hash.get('refresh_token');
      if(accessToken&&refreshToken){
        history.replaceState(null,'',location.pathname);
        await api('/auth/session','POST',{accessToken,refreshToken});
      }
      const r=await api('/auth/me');
      setUser(r.user as User);
      await loadRooms();
    })().catch((e)=>{if(location.hash.includes('error='))setError('The sign-in link expired or was rejected. Request another one.');}).finally(()=>setInitializing(false));
  },[loadRooms]);
  useEffect(()=>{
    if(!active) return;
    activeRoomId.current=active.id;
    lastEventCount.current=0;
    setEvents([]);
    setUnread(0);
    setInviteUrl('');
    setInviteEmail('');
    void loadEvents(active.id);
    const timer = window.setInterval(()=>{if(document.visibilityState==='visible') void loadEvents(active.id,true);},3500);
    return ()=>window.clearInterval(timer);
  },[active?.id,loadEvents]);
  useEffect(()=>{ if(!events.length) return; bottom.current?.scrollIntoView({behavior:'smooth',block:'end'}); },[events.length,active?.id]);

  async function run(task:()=>Promise<void>) {
    setBusy(true);setError('');setNotice('');
    try {await task();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function submitAuth(e:FormEvent) {
    e.preventDefault();
    void run(async()=>{
      if(!codeSent){await api('/auth/start','POST',{email,join});setCodeSent(true);setNotice('Sign-in email requested. Open its magic link, or enter the code if one is included.');}
      else {const r=await api('/auth/verify','POST',{email,token:otp});setUser(r.user as User);await loadRooms();setNotice('Signed in.');}
    });
  }
  async function signOut(){await run(async()=>{await api('/auth/logout','POST',{});setUser(null);setRooms([]);setActive(null);setEvents([]);setCodeSent(false);setOtp('');setJoin(null);});}
  function createRoom(e:FormEvent){e.preventDefault();void run(async()=>{const r=await api('/rooms','POST',{title:newRoom});await loadRooms();setActive(r.room as Room);setNotice('Private room created. Invite access remains owner controlled.');});}
  function joinRoom(){if(!join)return;void run(async()=>{await api(`/rooms/${join.room}/join`,'POST',{token:join.token});setJoin(null);await loadRooms();setNotice('Invitation accepted.');});}
  function sendMessage(e:FormEvent){e.preventDefault();if(!active||!message.trim())return;const content=message;void run(async()=>{
    await api(`/rooms/${active.id}/events`,'POST',{clientEventId:crypto.randomUUID(),content});setMessage('');await loadEvents(active.id);
  });}
  function requestAI(worker:'chatgpt'|'grok'){ if(!active)return;
    const human = [...events].reverse().find(e=>e.actor_type==='human');
    if(!human){setError('Send a human message first.');return;}
    setAiBusy(true);setError('');setNotice(`${worker==='chatgpt'?'ChatGPT':'Grok'} response requested by a room member.`);
    api(`/rooms/${active.id}/ai`,'POST',{clientEventId:crypto.randomUUID(),parentEventId:human.id,worker})
      .then(()=>loadEvents(active.id)).catch(e=>setError((e as Error).message))
      .finally(()=>{setAiBusy(false);setNotice('');});
  }
  function createInvite(e:FormEvent){e.preventDefault();if(!active)return;void run(async()=>{
    const res=await api(`/rooms/${active.id}/invite`,'POST',{email:inviteEmail});
    setInviteUrl(String(res.inviteUrl||''));
    setNotice('Private invitation prepared, NOT sent. Share it only after authorizing recipient and channel.');
  });}
  const owner=!!user&&!!active&&active.owner_user_id===user.id;
  return <main className="nw-shared">
    <header className="nw-shared-header"><div><span className="eyebrow">NULLWORKS / PENUMBRA</span><h1>Shared workroom</h1><p>Mason · Jason · ChatGPT · Grok</p></div>{user&&<button type="button" onClick={signOut}>Sign out</button>}</header>
    <div className="nw-shared-note">Private, member-only text room. ChatGPT or Grok respond only when a room member explicitly requests a reply. This room does not automatically expose the Hive.</div>
    {initializing&&<p>Checking your session…</p>}
    {!initializing&&!user&&<section className="nw-panel nw-auth"><h2>Sign in by email</h2><p>Only approved participant email addresses can sign in. Use the email magic link or an included verification code. No password needed.</p>
      <form onSubmit={submitAuth} className="nw-stack"><label>Email <input type="email" required autoComplete="email" value={email} disabled={codeSent} onChange={e=>setEmail(e.target.value)}/></label>
      {codeSent&&<label>Code from email <input inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={8} value={otp} onChange={e=>setOtp(e.target.value)} required /></label>}
      <button className="nw-primary" disabled={busy}>{codeSent?'Verify and enter' :'Send sign-in email'}</button>
      {codeSent&&<button type="button" onClick={()=>{setCodeSent(false);setOtp('');}}>Change email</button>}</form></section>}
    {user&&<div className="nw-layout"><aside className="nw-panel nw-sidebar"><div className="nw-small">Signed in as <b>{user.name}</b></div><h2>Rooms</h2>
      {rooms.map(room=><button type="button" key={room.id} className={'nw-room-choice '+(room.id===active?.id?'selected':'')} onClick={()=>setActive(room)}>{room.title}</button>)}
      <form onSubmit={createRoom} className="nw-stack"><label>Create private room <input value={newRoom} maxLength={120} onChange={e=>setNewRoom(e.target.value)}/></label><button disabled={busy}>Create room</button></form>
      {join&&<div className="nw-pending"><b>Pending invitation</b><p>An invite link was opened for this account.</p><button disabled={busy} onClick={joinRoom}>Accept invitation</button></div>}
      {owner&&<form onSubmit={createInvite} className="nw-stack nw-invite"><h3>Invite Jason</h3><label>Approved email <input type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/></label><button disabled={busy}>Prepare invite link</button>
        {inviteUrl&&<><textarea readOnly rows={3} value={inviteUrl} aria-label="Private invitation link"/><button type="button" onClick={()=>navigator.clipboard.writeText(inviteUrl)}>Copy link</button><small>Not sent. Single-use, expires in 24 hours.</small></>}</form>}
    </aside><section className="nw-panel nw-room"><div className="nw-room-top"><div><h2>{active?.title||'Select a room'}</h2><div className="nw-small">{active?'Messages are stored in the shared database':'Create a room to start'}</div></div><span className="nw-presence">● Signed-in room</span></div>
      {active&&<><div className="nw-thread" role="log" aria-live="polite" onScroll={()=>setUnread(0)}>
        {events.length===0&&<p className="nw-empty">No messages yet. Say hello.</p>}
        {events.map(event=><article key={event.id} className={'nw-entry '+(event.actor_type==='ai'?'nw-ai':'')}>
          <div className="nw-meta"><b>{event.actor_label}</b>{event.actor_type==='ai'&&<span>AI · {event.model||'model unspecified'}</span>}<time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time></div>
          <p>{event.content}</p></article>)}<div ref={bottom}/></div>
        {unread>0&&<p className="nw-small">{unread} newer message(s)</p>}
        <form className="nw-compose" onSubmit={sendMessage}><label htmlFor="nw-msg">Message</label><textarea id="nw-msg" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Add a message visible to both humans…" maxLength={4000} rows={3} required />
          <div className="nw-actions"><button className="nw-primary" disabled={busy||!message.trim()}>Post message</button><button type="button" disabled={aiBusy||busy||!events.some(e=>e.actor_type==='human')} onClick={()=>requestAI('chatgpt')}>{aiBusy?'Worker responding…':'Ask ChatGPT'}</button><button type="button" disabled={aiBusy||busy||!events.some(e=>e.actor_type==='human')} onClick={()=>requestAI('grok')}>{aiBusy?'Worker responding…':'Ask Grok'}</button></div></form></>}
      {!active&&<p>Select or create a private room to begin.</p>}
    </section></div>}
    {notice&&<p className="nw-notice" role="status">{notice}</p>}{error&&<p className="nw-error" role="alert">{error}</p>}
    <footer className="nw-footer">Human Authority remains final. No external actions or durable voice transcription are enabled here.</footer>
  </main>;
}
