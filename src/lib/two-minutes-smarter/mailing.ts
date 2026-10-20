/** Newsletter server helpers. Do not import this file from Client Components. */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import type { Lesson } from './lessons';

const base = 'https://api.resend.com';
export function readyForSignup(): boolean {
  return ['RESEND_API_KEY','TMS_FROM_EMAIL','TMS_AUDIENCE_ID','TMS_TOKEN_SECRET','TMS_PUBLIC_URL']
    .every(k => Boolean(process.env[k])) && process.env.TMS_SIGNUP_ENABLED === 'true';
}
function encryptionKey(){
  const secret=process.env.TMS_TOKEN_SECRET;
  if(!secret||secret.length<32) throw new Error('Confirmation secret must be at least 32 characters');
  return scryptSync(secret,'tms-confirm-v1',32);
}
/** Encrypted expiring opt-in token, without a database of unconfirmed addresses. */
export function sealEmail(email:string):string {
  const iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);
  const payload=Buffer.from(JSON.stringify({email,expires:Date.now()+48*3600_000}), 'utf8');
  const encrypted=Buffer.concat([cipher.update(payload),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}
export function unsealEmail(token:string):string {
  if(token.length>2000||!(/^[A-Za-z0-9_-]+$/.test(token))) throw new Error('Invalid token');
  const buf=Buffer.from(token,'base64url');
  if(buf.length<29) throw new Error('Invalid token');
  const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),buf.subarray(0,12));
  decipher.setAuthTag(buf.subarray(12,28));
  const data=JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)),decipher.final()]).toString('utf8')) as {email?:string;expires?:number};
  if(typeof data.email!=='string'||!data.expires||Date.now()>data.expires) throw new Error('Expired or invalid token');
  return data.email;
}
export async function resend(path:string,body:object,method:'POST'|'PATCH'='POST'){
  const key=process.env.RESEND_API_KEY;
  if(!key) throw new Error('Email provider not configured');
  const response=await fetch(`${base}${path}`,{method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`);
  return data as {id?:string};
}
function esc(s:string){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
export function lessonEmail(x:Lesson){
  const link=`https://nullworks.systems/two-minutes-smarter#${encodeURIComponent(x.slug)}`;
  const facts=x.facts.map((f,i)=>`<tr><td style="padding:10px 0;vertical-align:top;color:#267365;font-weight:800;width:30px">${i+1}.</td><td style="padding:10px 0;color:#263e3a"><strong>${esc(f.label)}</strong><br/>${esc(f.text)}</td></tr>`).join('');
  const html=`<!doctype html><html><body style="background:#f7f6f0;margin:0;font-family:Arial,sans-serif;color:#1f3936"><div style="margin:0 auto;max-width:620px;padding:35px 24px"><div style="font-size:12px;letter-spacing:2px;color:#318376;font-weight:900">TWO MINUTES SMARTER · DAY ${String(x.day).padStart(3,'0')}</div><h1 style="font-family:Georgia,serif;font-size:44px;margin:20px 0">${esc(x.flag)} ${esc(x.title)}</h1><p style="line-height:1.7">${esc(x.intro)}</p><table role="presentation" style="width:100%;border-collapse:collapse">${facts}</table><p style="background:#e8f0df;padding:19px;line-height:1.6"><strong>💡 THE INTERESTING BIT</strong><br/>${esc(x.surprise)}</p><p style="line-height:1.7"><strong>REMEMBER:</strong> ${esc(x.takeaway)}</p><p style="line-height:1.7"><strong>QUIZ:</strong> ${esc(x.quiz)}</p><p><a href="${link}" style="display:inline-block;padding:14px 18px;background:#133c40;color:white;text-decoration:none;border-radius:4px">Listen to the song &amp; see the answer →</a></p><p style="font-size:12px;line-height:1.6;color:#677c72;margin-top:40px">You requested the free daily Two Minutes Smarter lessons from NULLWORKS. You can unsubscribe using your email provider's included unsubscribe link.</p></div></body></html>`;
  const text=[`TWO MINUTES SMARTER — DAY ${String(x.day).padStart(3,'0')}`,`${x.flag} ${x.title}`,'',x.intro,'',...x.facts.flatMap((f,i)=>[`${i+1}. ${f.label}`,f.text,'']),`SURPRISE: ${x.surprise}`,`REMEMBER: ${x.takeaway}`,`QUIZ: ${x.quiz}`,'',`Listen and see answer: ${link}`,'','You requested this daily email. Use the unsubscribe link provided by the mailing service to leave the list.'].join('\n');
  return {subject:`🌍 Two Minutes Smarter #${String(x.day).padStart(3,'0')}: ${x.title}`,html,text};
}