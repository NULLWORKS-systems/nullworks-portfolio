import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeatPrompt, foreignSeatClaim, type SeatEvent } from './ai-seat-prompt.ts';

const human:SeatEvent={
  id:'87a434e6-4829-418d-b649-c8377dca9c58',
  parent_event_id:null,actor_type:'human',actor_label:'Human',
  provider:null,content:"OK the reply count is at 20 so let's check in with grok and chat. Give us your information please."
};
const olderGrok:SeatEvent={
  id:'grok-previous',parent_event_id:'human-older',actor_type:'ai',
  actor_label:'Grok',provider:'spacexai',
  content:'[Grok] I am Grok and I have no direct access to the Hive.'
};
const olderChatGPT:SeatEvent={
  id:'chat-previous',parent_event_id:'human-older',actor_type:'ai',
  actor_label:'ChatGPT',provider:'openai',
  content:'This is the earlier ChatGPT seat response.'
};
const evidence={content:'[HIVE SOURCE: hive/current/brief.yaml | SHA: abcdef] Example evidence.'};

test('ChatGPT receives other AI output as quoted user-reference data, never assistant role',()=>{
  const messages=buildSeatPrompt({
    worker:'chatgpt',events:[olderGrok,olderChatGPT,human],
    parentId:human.id,approvedEvidence:[evidence],
  });
  assert.equal((messages.map(x=>x.role) as string[]).includes('assistant'),false);
  assert.match(messages[0].content,/You are ChatGPT, the ChatGPT seat/);
  assert.match(messages[0].content,/NOT Grok/);
  assert.equal(messages[messages.length-1].role,'user');
  assert.match(messages[messages.length-1].content,/OK the reply count is at 20/);
  assert.match(messages[messages.length-1].content,/Reply as ChatGPT/);
  const context=messages.find(x=>x.content.includes('PRIOR ROOM TRANSCRIPT'));
  assert.ok(context);
  assert.match(context.content,/Grok/);
  assert.match(context.content,/NOT your earlier assistant turns/);
  assert.ok(messages.some(x=>x.content.includes('[HIVE SOURCE:')));
});

test('Grok receives explicit own identity and exact human message',()=>{
  const messages=buildSeatPrompt({
    worker:'grok',events:[olderChatGPT,olderGrok,human],
    parentId:human.id,approvedEvidence:[],
  });
  assert.equal((messages.map(x=>x.role) as string[]).includes('assistant'),false);
  assert.match(messages[0].content,/You are Grok, the Grok seat/);
  assert.match(messages.at(-1)?.content||'',/Reply as Grok/);
});

test('response identity guard catches the observed 2026-11-18 ChatGPT-to-Grok imitation',()=>{
  const observed='[Grok] **Grok response to event ID 87a434e6**\n\nHello Mason, human participant. I am Grok, the AI assistant.';
  assert.equal(foreignSeatClaim('chatgpt',observed),true);
  assert.equal(foreignSeatClaim('chatgpt','Hello Mason, human participant. I am Grok, the AI assistant.'),true);
  assert.equal(foreignSeatClaim('grok','[ChatGPT] I am ChatGPT.'),true);
  assert.equal(foreignSeatClaim('chatgpt','I am ChatGPT. The earlier Grok response is inaccurate.'),false);
  assert.equal(foreignSeatClaim('grok','I am Grok; the other seat is ChatGPT.'),false);
});

test('a nonexistent human event cannot be supplied as a target',()=>{
  assert.throws(()=>buildSeatPrompt({worker:'chatgpt',events:[olderGrok],
    parentId:'does-not-exist',approvedEvidence:[]}),/HUMAN_PARENT_MISSING/);
});
