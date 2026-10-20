import { NextRequest } from 'next/server';
import { readyForSignup, resend, unsealEmail } from '@/lib/two-minutes-smarter/mailing';

export async function GET(request:NextRequest){
  if(!readyForSignup()) return new Response('Newsletter confirmation is unavailable.',{status:503});
  const token=new URL(request.url).searchParams.get('token')||'';
  try {
    const email=unsealEmail(token);
    const audience=encodeURIComponent(process.env.TMS_AUDIENCE_ID!);
    // Resend audience/contact API: verify compatibility with the connected account before activation.
    await resend(`/audiences/${audience}/contacts`,{email,unsubscribed:false});
    const redirect=new URL('/two-minutes-smarter',process.env.TMS_PUBLIC_URL);
    redirect.searchParams.set('signup','confirmed');
    return Response.redirect(redirect,303);
  }catch{
    return new Response('This confirmation link could not be completed. It may have expired. Please request a new one from the website.',{status:400,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
}