'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type User = { id:string; email:string; name:string; isOperator:boolean };
type Room = { id:string; title:string; owner_user_id:string; created_at:string };
type Member = { user_id:string; display_name:string; role:string; created_at:string };
type Invite = {
  id:string; invitee_email:string; created_at:string; expires_at:string;
  used_by:string|null; used_at:string|null; sent_at:string|null; revoked_at:string|null;
};
type Access = { roomId:string; members:Member[]; invites:Invite[] };
const API = '/api/penumbra-shared';

async function request(path:string, method:'GET'|'POST'='GET', body?:unknown):Promise<any> {
  const res = await fetch(API+path,{method,credentials:'same-origin',cache:'no-store',
    headers:body===undefined?undefined:{'Content-Type':'application/json'},
    body:body===undefined?undefined:JSON.stringify(body)});
  const json = await res.json().catch(()=>({error:'Invalid server response'}));
  if(!res.ok) throw new Error(json.error || ('Request failed: '+res.status));
  return json;
}
function inviteStatus(invite:Invite, members:Member[]):string {
  if(invite.revoked_at) return 'Revoked';
  if(invite.used_by) return members.some(m=>m.user_id===invite.used_by)?'Joined':'Former member';
  if(Date.parse(invite.expires_at)<Date.now()) return 'Expired';
  if(invite.sent_at) return 'Email sent · awaiting join';
  return 'Prepared · not emailed';
}

export default function AccessPortalClient() {
  const [user,setUser]=useState<User|null>(null);
  const [rooms,setRooms]=useState<Room[]>([]);
  const [roomId,setRoomId]=useState('');
  const [access,setAccess]=useState<Access|null>(null);
  const [newRoom,setNewRoom]=useState('');
  const [inviteEmail,setInviteEmail]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const reloadRooms=useCallback(async()=>{
    const data=await request('/rooms');
    const next=Array.isArray(data.rooms)?data.rooms as Room[]:[];
    setRooms(next);
    setRoomId(current=>next.some(r=>r.id===current)?current:(next[0]?.id||''));
  },[]);
  const reloadAccess=useCallback(async(id:string)=>{
    const data=await request('/rooms/'+id+'/access');
    setAccess(data as Access);
  },[]);
  useEffect(()=>{
    (async()=>{
      const data=await request('/auth/me');
      setUser(data.user as User);
      if(!data.user?.isOperator) return;
      await reloadRooms();
    })().catch(e=>setError((e as Error).message)).finally(()=>setLoading(false));
  },[reloadRooms]);
  useEffect(()=>{
    if(!roomId){setAccess(null);return;}
    setAccess(null);
    void reloadAccess(roomId).catch(e=>setError((e as Error).message));
  },[roomId,reloadAccess]);

  async function perform(task:()=>Promise<void>){
    setBusy(true);setError('');setNotice('');
    try {await task();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function createRoom(e:FormEvent){
    e.preventDefault();void perform(async()=>{
      const data=await request('/rooms','POST',{title:newRoom.trim()});
      await reloadRooms();setRoomId(data.room.id);setNewRoom('');
      setNotice('Private room created. Only you are a member until you explicitly invite someone.');
    });
  }
  function sendInvite(e:FormEvent){
    e.preventDefault();if(!roomId)return;
    void perform(async()=>{
      const data=await request('/rooms/'+roomId+'/invite','POST',{email:inviteEmail.trim()});
      await reloadAccess(roomId);setInviteEmail('');
      setNotice('Magic-link invitation requested for '+data.recipient+'. Sent through PENUMBRA email authentication. The recipient can open the link and join this room.');
    });
  }
  function revokeInvite(id:string,email:string){
    if(!roomId||!window.confirm('Revoke the unused invitation for '+email+'?'))return;
    void perform(async()=>{
      await request('/rooms/'+roomId+'/access','POST',{action:'revoke_invite',id});
      await reloadAccess(roomId);setNotice('Invitation revoked.');
    });
  }
  function removeMember(id:string,name:string){
    if(!roomId||!window.confirm('Remove '+name+' from this room? Other rooms are unaffected.'))return;
    void perform(async()=>{
      await request('/rooms/'+roomId+'/access','POST',{action:'remove_member',userId:id});
      await reloadAccess(roomId);setNotice('Member removed from this room.');
    });
  }
  const selected=rooms.find(r=>r.id===roomId);
  return <main className="nw-shared nw-access-portal">
    <header className="nw-shared-header">
      <div><span className="eyebrow">NULLWORKS / PENUMBRA</span>
        <h1>Access Portal</h1>
        <p>Room-specific memberships and invitation controls</p></div>
      <a className="nw-access-link" href="/penumbra-workroom/shared">Back to workroom</a>
    </header>
    <div className="nw-shared-note">Only Human Authority can create rooms, send invitations, revoke pending links, or remove participants. Every invitation is limited to its selected room. The private Hive remains owner-only.</div>
    {loading&&<p>Checking owner access…</p>}
    {!loading&&!user&&<p className="nw-error">Sign in through the <a href="/penumbra-workroom/shared">shared workroom</a> first.</p>}
    {!loading&&user&&!user.isOperator&&<p className="nw-error">This portal is reserved for PENUMBRA Human Authority. You can use rooms to which you have been invited.</p>}
    {user?.isOperator&&<div className="nw-access-grid">
      <section className="nw-panel nw-stack">
        <h2>1. Select room</h2>
        <label>Room
          <select value={roomId} onChange={e=>setRoomId(e.target.value)}>
            {rooms.length===0&&<option value="">No rooms yet</option>}
            {rooms.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </label>
        <form className="nw-stack" onSubmit={createRoom}>
          <label>Create another private room<input value={newRoom} required maxLength={120}
            onChange={e=>setNewRoom(e.target.value)} placeholder="e.g. Engineering / Japan Partner"/></label>
          <button type="submit" disabled={busy||!newRoom.trim()}>Create room</button>
        </form>
        {selected&&<p className="nw-small">Selected: <b>{selected.title}</b>. Only members of this room can see its conversation and approved attachments.</p>}
      </section>
      {roomId&&<section className="nw-panel nw-stack">
        <h2>2. Email an invitation</h2>
        <form onSubmit={sendInvite} className="nw-stack">
          <label>Participant email
            <input type="email" autoComplete="email" required value={inviteEmail}
              onChange={e=>setInviteEmail(e.target.value)} placeholder="person@example.com"/>
          </label>
          <button className="nw-primary" type="submit" disabled={busy||!inviteEmail.trim()}>
            Send invitation to this room
          </button>
        </form>
        <p className="nw-small">One owner click sends one Supabase/Resend magic-link email. The link expires after 24 hours, is single-use, and does not grant access to other rooms or unrestricted Hive files. No email is sent just by typing an address.</p>
      </section>}
      {roomId&&<section className="nw-panel nw-stack">
        <h2>3. Room members</h2>
        {!access&&<p className="nw-small">Loading memberships…</p>}
        {access?.members.length===0&&<p className="nw-small">No members yet.</p>}
        {access?.members.map(m=><div key={m.user_id} className="nw-access-entry">
          <div><b>{m.display_name}</b><div className="nw-small">{m.role==='owner'?'Room owner':'Member'}</div></div>
          {m.role!=='owner'&&<button type="button" disabled={busy}
            onClick={()=>removeMember(m.user_id,m.display_name)}>Remove</button>}
        </div>)}
      </section>}
      {roomId&&<section className="nw-panel nw-stack">
        <h2>4. Invitation history</h2>
        {!access&&<p className="nw-small">Loading invitations…</p>}
        {access?.invites.length===0&&<p className="nw-small">No invitations for this room.</p>}
        {access?.invites.map(invite=><div key={invite.id} className="nw-access-entry">
          <div><b className="nw-break">{invite.invitee_email}</b>
            <div className="nw-small">{inviteStatus(invite,access.members)}</div>
            <div className="nw-small">Created {new Date(invite.created_at).toLocaleString()}</div>
          </div>
          {!invite.used_by&&!invite.revoked_at&&Date.parse(invite.expires_at)>Date.now()&&
            <button type="button" disabled={busy} onClick={()=>revokeInvite(invite.id,invite.invitee_email)}>Revoke</button>}
        </div>)}
      </section>}
    </div>}
    {notice&&<p className="nw-notice" role="status">{notice}</p>}
    {error&&<p className="nw-error" role="alert">{error}</p>}
    <footer className="nw-footer">Human Authority remains final. Invitations are explicit, scoped, and auditable.</footer>
  </main>;
}
