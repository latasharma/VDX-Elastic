// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite entry.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
for(const name of ['202610070001_vdx_requests.sql','202610070002_request_lifecycle.sql'])await db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',key='00000000-0000-4000-8000-000000000003';
await db.query('insert into auth.users values ($1),($2)',[a,b]);
async function asUser(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function save(text='Thai food'){return (await db.query('select * from public.vdx_save_request($1,$2,$3)',[key,text,'uber-eats'])).rows[0];}
await asUser(a);const first=await save();assert.equal((await save()).id,first.id);
assert.equal((await db.query('select * from public.vdx_request_events')).rows.length,1);
await assert.rejects(save('Different order'));
await assert.rejects(db.query("update public.vdx_requests set status='ready_to_plan'"));
await assert.rejects(db.query("insert into public.vdx_request_events(request_id,user_id,status) values($1,$2,'ready_to_plan')",[first.id,a]));
await asUser(b);assert.equal((await db.query('select * from public.vdx_requests')).rows.length,0);
assert.equal((await db.query('select * from public.vdx_request_events')).rows.length,0);
await assert.rejects(db.query('select public.vdx_cancel_request($1)',[first.id]));
const second=await save();assert.notEqual(second.id,first.id);
await asUser(a);await db.query('select public.vdx_cancel_request($1)',[first.id]);await db.query('select public.vdx_cancel_request($1)',[first.id]);
assert.equal((await save()).status,'cancelled');
assert.deepEqual((await db.query('select status from public.vdx_request_events order by id')).rows.map(x=>x.status),['waiting_connection','cancelled']);
await db.exec('reset role;set role anon');await assert.rejects(save());
await asUser('');await assert.rejects(save());
await db.close();console.log('PASS: migration, retry deduplication, conflicting retry rejection, tenant isolation, client status/evidence protection, cancellation and anonymous rejection.');
