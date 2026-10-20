import { NextRequest } from 'next/server';
import { readyForSignup, resend, sealEmail } from '@/lib/two-minutes-smarter/mailing';

export async function POST(request:NextRequest){
  if(!readyForSignup()) return Response.json({error:'Subscriptions are not open yet.'},{status:503});
  const origin=request.headers.get('origin');
  const expected=new URL(process.env.TMS_PUBLIC_URL!);
  if(origin && origin!==expected.origin) return Response.json({error:'Origin not allowed.'},{status:403});
  if(Number(request.headers.get('content-length')||0)>4096) return Response.json({error:'Invalid request.'},{status:413});
  let obj:Record<string,unknown>;
  try{obj=await request.json();}catch{return Response.json({error:'Invalid request.'},{status:400});}
  if(obj.website) return Response.json({error:'Invalid request.'},{status:400}); // honeypot
  const email=String(obj.email||'').trim().toLowerCase();
  if(email.length>254||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||obj.consent!==true) return Response.json({error:'Enter an email and agree to receive daily lessons.'},{status:400});
  // IMPORTANT: add durable edge/provider rate limiting before opening the public form.
  try{
    const token=sealEmail(email);
    const url=`${expected.origin}/api/two-minutes-smarter/confirm?token=${encodeURIComponent(token)}`;
    const from=process.env.TMS_FROM_EMAIL!;
    await resend('/emails',{
      from,to:[email],subject:'Confirm your Two Minutes Smarter subscription',
      html:`<p>You requested one free daily Two Minutes Smarter lesson.</p><p><a href="${url}">Confirm your subscription</a></p><p>This link expires after 48 hours. If you didn't request it, ignore this message.</p>`,
      text:`Confirm your free daily lessons: ${url}\n\nLink expires in 48 hours. If you didn't request this, ignore it.`,
    });
    return Response.json({message:'Confirmation email requested. Check your inbox.'},{status:202});
  }catch{
    return Response.json({error:'We could not send a confirmation email. Please try later.'},{status:502});
  }
}