import { NextRequest } from 'next/server';
import { lessons } from '@/lib/two-minutes-smarter/lessons';
import { lessonEmail } from '@/lib/two-minutes-smarter/mailing';
/** Internal preview endpoint; NEVER sends email. Broadcast remains a separate external gate. */
export async function POST(request:NextRequest){
  const required=process.env.TMS_PREVIEW_SECRET;
  if(!required||request.headers.get('authorization')!==`Bearer ${required}`){
    return Response.json({error:'Unauthorized'},{status:401});
  }
  let body:{lesson_id?:string};
  try{body=await request.json();}catch{return Response.json({error:'Bad JSON'},{status:400});}
  const x=lessons.find(lesson=>lesson.id===body.lesson_id);
  if(!x) return Response.json({error:'Lesson not found'},{status:404});
  return Response.json({lesson_id:x.id,status:x.status,...lessonEmail(x),warning:'DRAFT ONLY. No subscribers contacted. Send requires a separate approved mailing operation.'});
}