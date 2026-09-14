"use client";
import {useState} from "react";
import AnvilShell from "../../AnvilShell";
const endpoint="https://foveyfclihpsnwhfchib.supabase.co/functions/v1/anvil-crownrot-upload";
const expected=["ARACHNID","cover.png"];
async function send(file:File){let last="";for(let i=0;i<3;i++){try{const fd=new FormData();fd.append("file",file);const r=await fetch(endpoint,{method:"POST",body:fd});last=await r.text();if(r.ok)return {ok:true,text:last};}catch(e){last=String(e)}await new Promise(r=>setTimeout(r,700*(i+1)))}return {ok:false,text:last}}
export default function Page(){
  const[log,setLog]=useState<string[]>([]);
  const[busy,setBusy]=useState(false);
  async function upload(files:FileList|null){
    if(!files?.length)return;
    setBusy(true);
    for(const f of Array.from(files)){
      setLog(x=>[...x,`UPLOADING — ${f.name}`]);
      const r=await send(f);
      setLog(x=>[...x,`${r.ok?"OK":"FAIL"} — ${r.ok?f.name:`${f.name} // ${r.text}`}`]);
    }
    setBusy(false);
  }
  return <AnvilShell accent="#ff4d57"><main style={{minHeight:"100vh",background:"#080706",color:"#eee7d8",padding:"32px 18px 80px",fontFamily:"ui-monospace,monospace"}}><div style={{maxWidth:860,margin:"auto"}}><div style={{color:"#ff4d57",fontWeight:900,letterSpacing:2}}>NULLWORKS // ANVIL // MEDIA INGEST</div><h1 style={{fontSize:"clamp(44px,9vw,92px)",lineHeight:.88,margin:"22px 0 10px",letterSpacing:"-.06em"}}>CROWNROT<br/>ARACHNID</h1><p style={{color:"#aaa294",fontSize:18,lineHeight:1.5}}>Upload the ARACHNID master and cover into owned ANVIL storage. Files land as <code>01-arachnid.mp3</code> and <code>cover.png</code>.</p><div style={{display:"grid",gap:12,margin:"28px 0"}}><label style={button}><b>{busy?"UPLOADING — KEEP THIS PAGE OPEN":"SELECT MP3 MASTER"}</b><input disabled={busy} type="file" accept="audio/mpeg,.mp3" hidden onChange={e=>upload(e.target.files)}/></label><label style={button}><b>SELECT ALBUM COVER</b><input disabled={busy} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>upload(e.target.files)}/></label></div><section style={panel}><b style={{color:"#ff4d57"}}>EXPECTED CANON</b>{expected.map((t,i)=><div key={t} style={{padding:"9px 0",borderBottom:"1px solid #29251f"}}>{String(i+1).padStart(2,"0")} — {t}</div>)}</section><section style={{...panel,marginTop:14}}><b style={{color:"#ff4d57"}}>INGEST RECEIPT {busy?"// WORKING":""}</b>{log.length===0?<p style={{color:"#777"}}>Nothing uploaded yet.</p>:log.map((x,i)=><div key={i} style={{padding:"7px 0",color:x.startsWith("OK")?"#b8d49a":x.startsWith("FAIL")?"#ef8e7c":"#aaa"}}>{x}</div>)}</section></div></main></AnvilShell>;
}
const button:React.CSSProperties={display:"block",cursor:"pointer",border:"1px solid #655538",borderRadius:16,padding:"18px 20px",background:"linear-gradient(145deg,#17130e,#0c0b09)",color:"#e8dcc3",fontSize:15,letterSpacing:1};
const panel:React.CSSProperties={border:"1px solid #332d23",borderRadius:18,padding:20,background:"#0d0c0a"};
