'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { foreignSeatClaim } from '@/lib/penumbra-shared/ai-seat-prompt';

type User = { id:string; email:string; name:string; isOperator?:boolean };
type Room = { id:string; title:string; owner_user_id:string; created_at:string };
type Event = { id:string; room_id:string; actor_label:string; actor_type:'human'|'ai'|'system'; content:string; created_at:string; model:string|null; provider?:string|null; parent_event_id:string|null; request_mode?:string|null; finish_reason?:string|null; was_truncated?:boolean|null; reviewed_event_id?:string|null };
type JsonResponse = { error?:string; [key:string]:any };
type HiveSource = {path:string;sha:string;content:string};
type HiveStarter = {label:string;path:string};
type PilotStatus = {
  total:number;used:number;remaining:number;mode:string;
  chatgpt:{limit:number;used:number;remaining:number};
  grok:{limit:number;used:number;remaining:number};
};
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
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [aiBusy,setAiBusy] = useState(false);
  const [join,setJoin] = useState<{room:string;token:string}|null>(null);
  const [unread,setUnread] = useState(0);
  const [hivePath,setHivePath] = useState('hive/current/2026-09-05_penumbra_handoff.yaml');
  const [hiveStarters,setHiveStarters] = useState<HiveStarter[]>([]);
  const [hivePreview,setHivePreview] = useState<HiveSource|null>(null);
  const [pilot,setPilot] = useState<PilotStatus|null>(null);
  const [aiMode,setAiMode]=useState<'ask_one'|'independent'|'verify'>('ask_one');
  const [answerDepth,setAnswerDepth]=useState<'short'|'deep'>('short');
  const [reviewEventId,setReviewEventId]=useState('');
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
    const pendingInvite=room && token ? {room,token} : null;
    if(pendingInvite){setJoin(pendingInvite);history.replaceState(null,'',location.pathname+location.hash);}
    (async()=>{
      const hash = new URLSearchParams(location.hash.replace(/^#/,''));
      const accessToken=hash.get('access_token'),refreshToken=hash.get('refresh_token');
      if(accessToken&&refreshToken){
        history.replaceState(null,'',location.pathname);
        await api('/auth/session','POST',{accessToken,refreshToken});
      }
      const r=await api('/auth/me');
      setUser(r.user as User);
      if(pendingInvite){
        try {
          await api(`/rooms/${pendingInvite.room}/join`,'POST',{token:pendingInvite.token});
          setJoin(null);
          setNotice('Invitation accepted. Your room is ready.');
        } catch(e) {setError('Could not join the invited room: '+(e as Error).message);}
      }
      await loadRooms();
    })().catch((e)=>{if(location.hash.includes('error='))setError('The sign-in link expired or was rejected. Request another one.');}).finally(()=>setInitializing(false));
  },[loadRooms]);
  const reloadPilot = useCallback(async(roomId:string)=>{
    const data=await api(`/rooms/${roomId}/pilot-status`);
    if(activeRoomId.current===roomId) setPilot(data.pilot as PilotStatus);
  },[]);
  useEffect(()=>{
    if(!active) return;
    activeRoomId.current=active.id;
    lastEventCount.current=0;
    setEvents([]);
    setUnread(0);
    setError('');
    setPilot(null);
    void reloadPilot(active.id).catch(e=>setError('Pilot status unavailable: '+(e as Error).message));
    setInviteEmail('');
    setHivePreview(null);
    if(user && active.owner_user_id===user.id){
      void api(`/rooms/${active.id}/hive`).then(r=>setHiveStarters(Array.isArray(r.starters)?r.starters as HiveStarter[]:[])).catch(()=>setHiveStarters([]));
    }
    void loadEvents(active.id);
    const timer = window.setInterval(()=>{if(document.visibilityState==='visible') void loadEvents(active.id,true);},3500);
    return ()=>window.clearInterval(timer);
  },[active?.id,user?.id,loadEvents,reloadPilot]);
  useEffect(()=>{ if(!events.length) return; bottom.current?.scrollIntoView({behavior:'smooth',block:'end'}); },[events.length,active?.id]);

  async function run(task:()=>Promise<void>) {
    setBusy(true);setError('');setNotice('');
    try {await task();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function submitAuth(e:FormEvent) {
    e.preventDefault();
    void run(async()=>{
      if(!codeSent){await api('/auth/start','POST',{email,join});setCodeSent(true);setNotice('Sign-in email requested. Open its magic link, or enter the code if one is included.');}
      else {
        const r=await api('/auth/verify','POST',{email,token:otp});
        setUser(r.user as User);
        if(join){
          await api(`/rooms/${join.room}/join`,'POST',{token:join.token});
          setJoin(null);
        }
        await loadRooms();setNotice('Signed in and room access confirmed.');
      }
    });
  }
  async function signOut(){await run(async()=>{await api('/auth/logout','POST',{});setUser(null);setRooms([]);setActive(null);setEvents([]);setCodeSent(false);setOtp('');setJoin(null);});}
  function createRoom(e:FormEvent){e.preventDefault();void run(async()=>{const r=await api('/rooms','POST',{title:newRoom});await loadRooms();setActive(r.room as Room);setNotice('Private room created. Invite access remains owner controlled.');});}
  function joinRoom(){if(!join)return;void run(async()=>{await api(`/rooms/${join.room}/join`,'POST',{token:join.token});setJoin(null);await loadRooms();setNotice('Invitation accepted.');});}
  function sendMessage(e:FormEvent){e.preventDefault();if(!active||!message.trim())return;const content=message;void run(async()=>{
    await api(`/rooms/${active.id}/events`,'POST',{clientEventId:crypto.randomUUID(),content});setMessage('');await loadEvents(active.id);
  });}
  function requestAI(worker:'chatgpt'|'grok',mode:'ask_one'|'verify'='ask_one',selectedReview?:Event){
    if(!active)return;
    const human=mode==='verify'
      ?events.find(e=>e.id===selectedReview?.parent_event_id)
      :[...events].reverse().find(e=>e.actor_type==='human');
    if(!human){setError('Select a human message first.');return;}
    setAiBusy(true);setError('');
    setNotice(mode==='verify'?'Verifying a specific stored answer.':'Requesting one '+worker+' answer.');
    api(`/rooms/${active.id}/ai`,'POST',{
      clientEventId:crypto.randomUUID(),parentEventId:human.id,
      worker,mode,depth:answerDepth,
      ...(selectedReview?{reviewEventId:selectedReview.id}:{}),
    })
      .then(async()=>{await loadEvents(active.id);setNotice('Reply saved. Check source and finish status.');})
      .catch(e=>{setError((e as Error).message);setNotice('No automatic retry was made.');})
      .finally(()=>{void reloadPilot(active.id).catch(()=>{});setAiBusy(false);});
  }
  function requestIndependent(parentId:string){
    if(!active||aiBusy)return;
    setAiBusy(true);setError('');setNotice('Independent pair requested: both models receive the same frozen evidence snapshot.');
    api(`/rooms/${active.id}/independent`,'POST',{
      parentEventId:parentId,chatClientEventId:crypto.randomUUID(),
      grokClientEventId:crypto.randomUUID(),depth:answerDepth,
    }).then(async(result)=>{
      await loadEvents(active.id);
      const failed=(result.replies||[]).filter((r:{status:string})=>r.status!=='saved');
      setNotice(failed.length?'Partial independent review: '+failed.map((r:{worker:string,error:string})=>r.worker+': '+r.error).join('; '):
        'Two independent answers saved. Neither model saw the other answer before generation.');
    }).catch(e=>{setError((e as Error).message);setNotice('No automatic retry was made.');})
      .finally(()=>{void reloadPilot(active.id).catch(()=>{});setAiBusy(false);});
  }
  function createInvite(e:FormEvent){e.preventDefault();if(!active)return;void run(async()=>{
    const res=await api(`/rooms/${active.id}/invite`,'POST',{email:inviteEmail});
    setInviteEmail('');
    setNotice('Magic-link invitation requested for '+res.recipient+'. The link is limited to this room.');
  });}
  function previewHive(){if(!active)return;void run(async()=>{
    const res=await api(`/rooms/${active.id}/hive`,'POST',{action:'preview',path:hivePath.trim()});
    setHivePreview(res.source as HiveSource);
    setNotice('Private preview only. The document has NOT been shared with room members or AI providers.');
  });}
  function shareHive(){if(!active||!hivePreview)return;void run(async()=>{
    const res=await api(`/rooms/${active.id}/hive`,'POST',{
      action:'share',path:hivePreview.path,sha:hivePreview.sha,clientEventId:crypto.randomUUID(),
    });
    await loadEvents(active.id);
    setNotice(res.duplicate?'This exact Hive revision is already attached.':'Approved Hive evidence attached to the shared room. ChatGPT and Grok can now cite it on the next human-triggered reply.');
    setHivePreview(null);
  });}
  const owner=!!user&&!!active&&active.owner_user_id===user.id;
  const latestHuman=[...events].reverse().find(e=>e.actor_type==='human');
  const existingOnLatest=events.filter(e=>e.actor_type==='ai'&&e.parent_event_id===latestHuman?.id);
  const independentAvailable=!!latestHuman&&existingOnLatest.length===0&&
    !!pilot&&pilot.chatgpt.remaining>0&&pilot.grok.remaining>0;
  const reviewChoices=events.filter(e=>e.actor_type==='ai'&&!!e.parent_event_id&&
    (e.provider==='openai'||e.provider==='spacexai'||e.provider==='xai')&&
    !events.some(other=>other.actor_type==='ai'&&other.parent_event_id===e.parent_event_id&&
      other.provider!==e.provider&& (other.provider==='openai'||other.provider==='spacexai'||other.provider==='xai')));
  const selectedReview=reviewChoices.find(e=>e.id===reviewEventId)||reviewChoices.at(-1);
  const verifyWorker=selectedReview?.provider==='openai'?'grok':'chatgpt';
  const verifyRemaining=verifyWorker==='grok'?pilot?.grok.remaining:pilot?.chatgpt.remaining;
  return <main className="nw-shared">
    <header className="nw-shared-header"><div><span className="eyebrow">NULLWORKS / PENUMBRA</span><h1>Shared workroom</h1><p>Mason · Jason · ChatGPT · Grok</p></div><div className="nw-header-actions">{user?.isOperator&&<a className="nw-access-link" href="/penumbra-workroom/access">Access Portal</a>}{user&&<button type="button" onClick={signOut}>Sign out</button>}</div></header>
    <div className="nw-shared-note">Private, member-only text room. ChatGPT and Grok respond only when requested. The owner can explicitly attach sourced, read-only Hive evidence; private repository credentials never reach the AI seats or participants.</div>
    {initializing&&<p>Checking your session…</p>}
    {!initializing&&!user&&<section className="nw-panel nw-auth"><h2>Sign in by email</h2><p>Only approved participant email addresses can sign in. Use the email magic link or an included verification code. No password needed.</p>
      <form onSubmit={submitAuth} className="nw-stack"><label>Email <input type="email" required autoComplete="email" value={email} disabled={codeSent} onChange={e=>setEmail(e.target.value)}/></label>
      {codeSent&&<label>Code from email <input inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={8} value={otp} onChange={e=>setOtp(e.target.value)} required /></label>}
      <button className="nw-primary" disabled={busy}>{codeSent?'Verify and enter' :'Send sign-in email'}</button>
      {codeSent&&<button type="button" onClick={()=>{setCodeSent(false);setOtp('');}}>Change email</button>}</form></section>}
    {user&&<div className="nw-layout"><aside className="nw-panel nw-sidebar"><div className="nw-small">Signed in as <b>{user.name}</b></div><h2>Rooms</h2>
      {rooms.map(room=><button type="button" key={room.id} className={'nw-room-choice '+(room.id===active?.id?'selected':'')} onClick={()=>setActive(room)}>{room.title}</button>)}
      {user?.isOperator&&<form onSubmit={createRoom} className="nw-stack"><label>Create private room <input value={newRoom} maxLength={120} onChange={e=>setNewRoom(e.target.value)}/></label><button disabled={busy}>Create room</button></form>}
      {join&&<div className="nw-pending"><b>Pending invitation</b><p>An invite link was opened for this account.</p><button disabled={busy} onClick={joinRoom}>Accept invitation</button></div>}
      {owner&&active&&<section className="nw-stack nw-hive">
        <h3>Private Hive Brain</h3>
        <p className="nw-small">Owner-only retrieval. Preview first; nothing leaves the private Hive until you expressly share the selected excerpt with this room.</p>
        {hiveStarters.length>0&&<label>Suggested canonical source
          <select value={hiveStarters.some(p=>p.path===hivePath)?hivePath:''} onChange={e=>{setHivePath(e.target.value);setHivePreview(null);}}>
            <option value="">Custom exact path</option>{hiveStarters.map(s=><option key={s.path} value={s.path}>{s.label}</option>)}
          </select>
        </label>}
        <label>Exact Hive path <input value={hivePath} onChange={e=>{setHivePath(e.target.value);setHivePreview(null);}} spellCheck={false}/></label>
        <button type="button" disabled={busy||!hivePath.trim()} onClick={previewHive}>Preview private Hive source</button>
        {hivePreview&&<div className="nw-hive-preview"><div className="nw-small"><b>PREVIEW ONLY</b> · SHA {hivePreview.sha.slice(0,12)} · {hivePreview.path}</div>
          <textarea readOnly rows={9} value={hivePreview.content} aria-label="Private Hive source preview"/>
          <p className="nw-small">Sharing makes this exact content permanently visible to current/future room members and available in subsequent ChatGPT/Grok prompts sent to their AI provider. Review it for sensitive material before approving.</p>
          <button type="button" className="nw-primary" disabled={busy} onClick={shareHive}>Approve sharing this evidence with room</button>
        </div>}
      </section>}
      {owner&&<form onSubmit={createInvite} className="nw-stack nw-invite"><h3>Invite a participant</h3><label>Participant email <input type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="person@example.com"/></label><button disabled={busy}>Email invitation to this room</button>
        <small>Explicit click sends the email. Each invite is single-use and expires after 24 hours.</small><a className="nw-access-link" href="/penumbra-workroom/access">Manage all rooms and people</a></form>}
    </aside><section className="nw-panel nw-room"><div className="nw-room-top"><div><h2>{active?.title||'Select a room'}</h2><div className="nw-small">{active?'Messages are stored in the shared database':'Create a room to start'}</div></div><span className="nw-presence">● Signed-in room</span></div>
      {active&&<><section className="nw-pilot-status" role="status" aria-label="AI pilot allowance">
        <b>AI Gateway · production pilot</b>
        {pilot?<div className="nw-pilot-counts">
          <span>ChatGPT <strong>{pilot.chatgpt.remaining}/{pilot.chatgpt.limit}</strong> left</span>
          <span>Grok <strong>{pilot.grok.remaining}/{pilot.grok.limit}</strong> left</span>
          <span>Total <strong>{pilot.remaining}/{pilot.total}</strong> left</span>
        </div>:<span className="nw-small">Checking allowance…</span>}
        <small>Manual requests only. Failed calls still use a reservation. No automatic retries.</small>
      </section>
      <div className="nw-thread" role="log" aria-live="polite" onScroll={()=>setUnread(0)}>
        {events.length===0&&<p className="nw-empty">No messages yet. Say hello.</p>}
        {events.map(event=><article key={event.id} className={'nw-entry '+(event.actor_type==='ai'?'nw-ai':event.actor_type==='system'?'nw-hive-entry':'')}>
          <div className="nw-meta"><b>{event.actor_label}</b>{event.actor_type==='ai'&&<span>AI · {event.model||'model unspecified'}</span>}<time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time></div>
          {event.actor_type==='ai'&&(event.actor_label==='ChatGPT'||event.actor_label==='Grok')&&
            foreignSeatClaim(event.actor_label==='ChatGPT'?'chatgpt':'grok',event.content)&&
            <p className="nw-seat-warning">Identity mismatch: this reply claims another AI's identity. The model badge reflects the provider used, but the text is unreliable. Historical record retained for audit.</p>}
          {event.actor_type==='ai'&&<div className="nw-ai-receipt">
            <span>Mode: {event.request_mode||'historical'}</span>
            {event.reviewed_event_id&&<span>Verifies: {event.reviewed_event_id.slice(0,8)}</span>}
            {event.was_truncated===true&&<strong className="nw-truncation">Output limit reached · response incomplete</strong>}
            {event.was_truncated===null&&event.finish_reason==null&&<span>Finish reason not recorded</span>}
            {event.was_truncated===false&&<span>Completed · {event.finish_reason||'provider reported'}</span>}
          </div>}
          <p>{event.content}</p></article>)}<div ref={bottom}/></div>
        {unread>0&&<p className="nw-small">{unread} newer message(s)</p>}
        <form className="nw-compose" onSubmit={sendMessage}><label htmlFor="nw-msg">Message</label><textarea id="nw-msg" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Add a message visible to both humans…" maxLength={4000} rows={3} required />
          <div className="nw-actions"><button className="nw-primary" disabled={busy||!message.trim()}>Post message</button></div></form>
        <section className="nw-mode-panel" aria-label="AI review modes">
          <h3>AI work mode</h3>
          <div className="nw-mode-selector">
            <label>Mode <select value={aiMode} onChange={e=>setAiMode(e.target.value as 'ask_one'|'independent'|'verify')}>
              <option value="ask_one">Ask One</option>
              <option value="independent">Independent Review (2 calls)</option>
              <option value="verify">Verify Answer (1 call)</option>
            </select></label>
            <label>Response length <select value={answerDepth} onChange={e=>setAnswerDepth(e.target.value as 'short'|'deep')}>
              <option value="short">Short · 250 tokens</option>
              <option value="deep">Deep · 1,200 tokens</option>
            </select></label>
          </div>
          {aiMode==='ask_one'&&<><p className="nw-small">Select exactly one worker. Uses one reservation; the other remains optional for later verification.</p>
            <div className="nw-actions">
              <button type="button" disabled={aiBusy||busy||!pilot||pilot.chatgpt.remaining===0||!latestHuman} onClick={()=>requestAI('chatgpt')}>{aiBusy?'Working…':'Ask ChatGPT · 1 call'}</button>
              <button type="button" disabled={aiBusy||busy||!pilot||pilot.grok.remaining===0||!latestHuman} onClick={()=>requestAI('grok')}>{aiBusy?'Working…':'Ask Grok · 1 call'}</button>
            </div></>}
          {aiMode==='independent'&&<><p className="nw-small">Both workers answer the latest fresh human message independently, using the same frozen context. Neither sees the other's answer. One manual click reserves two calls atomically; partial failures are recorded.</p>
            <button type="button" disabled={aiBusy||busy||!independentAvailable} onClick={()=>latestHuman&&requestIndependent(latestHuman.id)}>
              {aiBusy?'Both workers responding…':'Ask both independently · 2 calls'}
            </button>
            {!independentAvailable&&<p className="nw-small">Requires a new human message with no AI replies and at least one reservation per model.</p>}</>}
          {aiMode==='verify'&&<><p className="nw-small">Select an existing answer. The opposite AI reviews its FULL text and the original human question; earlier transcript excerpts are limited. One call is required. No automated follow-up.</p>
            <label>Answer to verify
              <select value={selectedReview?.id||''} onChange={e=>setReviewEventId(e.target.value)}>
                {reviewChoices.length===0&&<option value="">No eligible answer (both workers may already have replied)</option>}
                {reviewChoices.map(e=><option key={e.id} value={e.id}>{e.actor_label} · {new Date(e.created_at).toLocaleString()} · {e.content.slice(0,70)}</option>)}
              </select>
            </label>
            <button type="button" disabled={aiBusy||busy||!selectedReview||!verifyRemaining} onClick={()=>selectedReview&&requestAI(verifyWorker,'verify',selectedReview)}>
              {aiBusy?'Verifying…':'Verify with '+(verifyWorker==='chatgpt'?'ChatGPT':'Grok')+' · 1 call'}
            </button>
            {!selectedReview&&<p className="nw-small">This pilot allows one reply per model per original human message. Existing two-answer threads cannot receive a third reply without starting a new review question.</p>}
          </>}
          <p className="nw-small">Costs are provider-based. Short/deep settings change the maximum output and potential cost, not the 10+10 call allowance. Each button requires an explicit human action.</p>
        </section>
</>}
      {!active&&<p>Select or create a private room to begin.</p>}
    </section></div>}
    {notice&&<p className="nw-notice" role="status">{notice}</p>}{error&&<p className="nw-error" role="alert">{error}</p>}
    <footer className="nw-footer">Human Authority remains final. No external actions or durable voice transcription are enabled here.</footer>
  </main>;
}
