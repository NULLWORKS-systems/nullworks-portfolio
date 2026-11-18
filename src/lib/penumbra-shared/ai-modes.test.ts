import test from 'node:test';
import assert from 'node:assert/strict';
import { buildModePrompt, independentEligible, outputLimit, validMode, validDepth } from './ai-modes.ts';
import type { SeatEvent } from './ai-seat-prompt.ts';
const human:SeatEvent={id:'human-1',parent_event_id:null,actor_type:'human',actor_label:'Human',
 provider:null,content:"Explain how the machine\'s safety interlocks work."};
const chat:SeatEvent={id:'chat-1',parent_event_id:'human-1',actor_type:'ai',actor_label:'ChatGPT',
 provider:'openai',content:'Full answer: stop, isolate, verify, document. '.repeat(30)};
const grok:SeatEvent={id:'grok-1',parent_event_id:'human-1',actor_type:'ai',actor_label:'Grok',
 provider:'spacexai',content:'Independent observations.'};

test('token lengths and mode validation are explicit and bounded',()=>{
 assert.equal(outputLimit('short'),250);assert.equal(outputLimit('deep'),1200);
 assert.equal(validMode('independent'),true);assert.equal(validMode('verify'),true);
 assert.equal(validMode('unlimited'),false);assert.equal(validDepth('deep'),true);
 assert.equal(validDepth('infinite'),false);
});
test('independent mode requires both workers to be blind to current parent answers',()=>{
 assert.equal(independentEligible([human],'human-1'),true);
 assert.equal(independentEligible([human,chat],'human-1'),false);
 assert.equal(independentEligible([chat],'human-1'),false);
 const prompt=buildModePrompt({worker:'grok',mode:'independent',parentId:'human-1',
  events:[human,chat],approvedEvidence:[]});
 assert.equal((prompt.map(m=>m.role) as string[]).includes('assistant'),false);
 assert.ok(!prompt.some(m=>m.content.includes('Full answer: stop')));
 assert.ok(prompt.some(m=>m.content.includes('No other worker answer')));
});
test('verification includes complete quoted response, not abbreviated transcript',()=>{
 const messages=buildModePrompt({worker:'grok',mode:'verify',parentId:'human-1',
 events:[human,chat],reviewEventId:'chat-1',approvedEvidence:[]});
 const final=messages.at(-1)?.content||'';
 assert.match(final,/BEGIN FULL TARGET ANSWER/);
 assert.match(final,/stop, isolate, verify, document/);
 assert.ok(final.length>1200);
 assert.match(final,/CORRECTIONS/);
 assert.throws(()=>buildModePrompt({worker:'chatgpt',mode:'verify',parentId:'human-1',
 events:[human,chat],reviewEventId:'chat-1',approvedEvidence:[]}),/CANNOT_VERIFY_SELF/);
 assert.throws(()=>buildModePrompt({worker:'grok',mode:'verify',parentId:'human-1',
 events:[human,grok],reviewEventId:'grok-1',approvedEvidence:[]}),/CANNOT_VERIFY_SELF/);
});
