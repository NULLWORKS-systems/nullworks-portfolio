"use client";
import { useCallback, useEffect, useState } from "react";
type Entry = { id:string;actor_label:string;actor_type:string;content:string;created_at:string };
type Session = {access_token:string;refresh_token?:string;expires_at?:number};
const STORE = "penumbra.shared.session.v1";
export default function SharedRoom() {
  const [email,setEmail]=useState("");
  const [session,setSession]=useState<Session|null>(null);
  const [events,setEvents]=useState<Entry[]>([]);
  const [draft,setDraft]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("access_token");
    const refresh = hash.get("refresh_token");
    const expires = Number(hash.get("expires_in") || "3600");
    if(token) {
      const s = {access_token:token,refresh_token:refresh||undefined,expires_at:Math.floor(Date.now()/1000)+expires};
      sessionStorage.setItem(STORE,JSON.stringify(s)); setSession(s);
      window.history.replaceState(null,"",window.location.pathname);
    } else {
      try { const saved=sessionStorage.getItem(STORE); if(saved) setSession(JSON.parse(saved)); } catch {}
    }
    setReady(true);
  },[]);
  const request = useCallback(async (method:"GET"|"POST",content?:string)=>{
    if(!session) return;
    if(session.expires_at && Date.now()/1000 >= session.expires_at) { setMessage("Session expired. Sign in again."); setSession(null);sessionStorage.removeItem(STORE);return; }
    const r=await fetch("/api/penumbra/shared",{method,headers:{"Authorization":"Bearer "+session.access_token,...(method==="POST"?{"Content-Type":"application/json"}:{})},...(method==="POST"?{body:JSON.stringify({content})}:{})});
    const j=await r.json();
    if(!r.ok) { setMessage(j.error||"Request failed");return; }
    if(method==="GET") {setEvents(j.events||[]);setMessage("");}
    return j;
  },[session]);
  useEffect(()=>{if(!session)return;void request("GET");const id=setInterval(()=>{void request("GET")},5000);return()=>clearInterval(id)},[session,request]);
  async function login(e:React.FormEvent) {e.preventDefault();setBusy(true);setMessage("");try{const r=await fetch("/api/penumbra/shared/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});const j=await r.json();setMessage(r.ok?"Check your inbox for the PENUMBRA magic link.":j.error||"Sign-in request failed");}catch{setMessage("Sign-in request failed");}finally{setBusy(false)}}
  async function send(e:React.FormEvent) {e.preventDefault();if(!draft.trim())return;setBusy(true);try{const r=await request("POST",draft.trim());if(r?.event){setDraft("");await request("GET");}}finally{setBusy(false)}}
  function signout(){sessionStorage.removeItem(STORE);setSession(null);setEvents([]);setMessage("");}
  return <main style={{background:"#081619",color:"#e7f5f2",minHeight:"100vh",padding:"min(6vw,48px)",fontFamily:"system-ui"}}>
    <div style={{maxWidth:920,margin:"auto"}}>
      <p style={{letterSpacing:3,color:"#7bd2c8"}}>NULLWORKS // PENUMBRA</p>
      <h1>Shared Workroom</h1>
      <p>Human Authority remains final. Messages are stored in the PENUMBRA database. Only approved room members can read or post.</p>
      {!ready?<p>Loading…</p>:!session?
        <form onSubmit={login} style={{display:"grid",gap:12,maxWidth:450,marginTop:30}}>
          <label htmlFor="email">Authorized email address</label>
          <input id="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{padding:14,color:"#111"}}/>
          <button disabled={busy} style={{padding:14,cursor:"pointer"}}>{busy?"Sending…":"Send magic link"}</button>
        </form>:
        <section>
          <button onClick={signout} style={{padding:10,marginBottom:20}}>Sign out</button>
          <div aria-live="polite" style={{border:"1px solid #41656a",borderRadius:12,padding:16,minHeight:280,maxHeight:550,overflowY:"auto"}}>
            {events.length===0?<p>No shared messages yet.</p>:events.map(e=><article key={e.id} style={{borderBottom:"1px solid #294247",padding:"12px 0"}}>
              <strong>{e.actor_label}</strong> <small>{new Date(e.created_at).toLocaleString()}</small><p style={{whiteSpace:"pre-wrap"}}>{e.content}</p>
            </article>)}
          </div>
          <form onSubmit={send} style={{display:"grid",gap:12,marginTop:16}}>
            <textarea aria-label="Message to shared room" value={draft} onChange={e=>setDraft(e.target.value)} rows={4} maxLength={12000} style={{padding:12,color:"#111"}}/>
            <button disabled={busy||!draft.trim()} style={{padding:14}}>{busy?"Saving…":"Post to shared room"}</button>
          </form>
        </section>}
      {message&&<p role="status" style={{color:"#f5d58b"}}>{message}</p>}
      <p style={{fontSize:12,opacity:.7,marginTop:32}}>Preview acceptance build. AI workers remain in the existing workroom until server-side AI persistence is integrated. No invitations are issued automatically.</p>
    </div>
  </main>;
}
