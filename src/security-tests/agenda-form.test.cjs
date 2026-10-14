const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./harness.cjs');
function form({start='2026-10-14T09:00',end='2026-10-14T10:00',fetch}={}) {
  const values=[[],'Visita sintética',start,end,'','','','',''];let i=0;const messages=[];
  const Component=harness({react:{useState:()=>{const index=i++;return [values[index],v=>{if(index===8)messages.push(v)}]}},fetch})('src/app/portal/agenda/AgendaClient.tsx').default;
  const tree=Component({initial:[],contacts:[],clients:[],teams:[],vehicles:[]});
  return {submit:()=>tree.props.children[0].props.onSubmit({preventDefault(){}}),messages};
}
test('agenda: reversed interval explains validation without sending a request',async()=>{
 let requests=0;const f=form({end:'2026-10-14T08:00',fetch:async()=>{requests++;return {ok:false,json:async()=>({error:'Dados de agenda inválidos.'})}}});
 await f.submit();assert.equal(requests,0);assert.match(f.messages.at(-1),/fim.*posterior/i);
});
test('agenda: server validation message reaches user',async()=>{
 const f=form({fetch:async()=>({ok:false,json:async()=>({error:'Permissão insuficiente'})})});await f.submit();assert.equal(f.messages.at(-1),'Permissão insuficiente');
});
test('agenda: network failure is caught and leaves form retryable',async()=>{
 const f=form({fetch:async()=>{throw Error('offline')}});await assert.doesNotReject(f.submit());assert.match(f.messages.at(-1),/conexão/i);
});
test('agenda: browser local date converts to ISO accepted by API without losing instant',async()=>{
 let payload;const f=form({fetch:async(_url,opts)=>{payload=JSON.parse(opts.body);return {ok:true,json:async()=>({event:{id:'synthetic'}})}}});await f.submit();
 const {CreateAgendaEventSchema}=harness()('src/lib/validation/contacts-agenda.ts');
 assert.equal(CreateAgendaEventSchema.safeParse(payload).success,true);
 assert.equal(Date.parse(payload.startsAt),new Date('2026-10-14T09:00').getTime());
});
