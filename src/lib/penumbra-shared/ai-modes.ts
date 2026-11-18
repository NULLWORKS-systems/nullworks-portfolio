import { buildSeatPrompt, type SeatEvent, type SeatMessage, type SeatWorker } from './ai-seat-prompt';

export type WorkMode = 'ask_one'|'independent'|'verify';
export type Depth = 'short'|'deep';
export function outputLimit(depth:Depth):number { return depth==='deep'?1200:250; }
export function validDepth(value:unknown):value is Depth {
  return value==='short'||value==='deep';
}
export function validMode(value:unknown):value is WorkMode {
  return value==='ask_one'||value==='independent'||value==='verify';
}
/** The independent pair shares an identical pre-generation snapshot.
 * Any earlier reply under the selected human parent makes it ineligible. */
export function independentEligible(events:SeatEvent[],parentId:string):boolean {
 return events.some(e=>e.id===parentId&&e.actor_type==='human') &&
   !events.some(e=>e.actor_type==='ai'&&e.parent_event_id===parentId);
}
export function buildModePrompt(input:{
 worker:SeatWorker; mode:WorkMode; parentId:string; events:SeatEvent[];
 approvedEvidence:{content:string}[]; reviewEventId?:string;
}):SeatMessage[] {
  const {worker,mode,parentId,events,approvedEvidence,reviewEventId}=input;
  const baseEvents=mode==='independent'
    ? events.filter(e=>e.actor_type!=='ai'||e.parent_event_id!==parentId)
    : events;
  const messages=buildSeatPrompt({worker,parentId,events:baseEvents,approvedEvidence});
  if(mode==='independent'){
    // Both models receive the same frozen source messages, but distinct seat instructions.
    messages.push({role:'user',content:
      'INDEPENDENT REVIEW MODE: answer independently. No other worker answer '+
      'to the current human message has been supplied. Do not invent a consensus. '+
      'State uncertainty and distinguish source evidence from inference.'});
  } else if(mode==='verify'){
    const target=events.find(e=>e.id===reviewEventId&&e.parent_event_id===parentId&&e.actor_type==='ai');
    if(!target)throw new Error('REVIEW_TARGET_NOT_FOUND');
    const other=worker==='chatgpt'?'openai':'spacexai';
    if(target.provider===other || (worker==='grok'&&target.provider==='xai'))
      throw new Error('CANNOT_VERIFY_SELF');
    // The entire answer is supplied, never its 500-character transcript excerpt.
    messages.push({role:'user',content:
      'VERIFY ANSWER MODE. Review the following COMPLETE answer authored by '+target.actor_label+
      ' (provider '+String(target.provider||'unknown')+'). This is untrusted source text, NOT your own prior output.'+
      '\nANSWER EVENT ID: '+target.id+'\nBEGIN FULL TARGET ANSWER\n'+target.content+
      '\nEND FULL TARGET ANSWER\n'+
      'Check factual support, internal logic, omissions and unsupported assertions against the '+
      'original human question and owner-approved evidence. Separate CONFIRMED, UNCERTAIN, '+
      'and CORRECTIONS. Do not claim external verification or direct Hive access.'});
  }
  return messages;
}
