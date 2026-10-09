begin;
-- Existing clients remain supported; new clients use the retry-safe RPC.
alter table public.vdx_requests add column client_request_id uuid;
create unique index vdx_request_retry_key on public.vdx_requests(user_id, client_request_id);

create table public.vdx_request_events (
 id bigint generated always as identity primary key,
 request_id uuid not null references public.vdx_requests(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null check (status in ('waiting_connection','ready_to_plan','cancelled')),
 created_at timestamptz not null default now()
);
alter table public.vdx_request_events enable row level security;
revoke all on public.vdx_request_events from public, anon, authenticated;
grant select on public.vdx_request_events to authenticated;
create policy "Read own request events" on public.vdx_request_events for select to authenticated
 using ((select auth.uid()) = user_id);
create index vdx_request_event_lookup on public.vdx_request_events(request_id, id);

create function public.vdx_record_request_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if TG_OP = 'INSERT' or new.status is distinct from old.status then
  insert into public.vdx_request_events(request_id,user_id,status) values(new.id,new.user_id,new.status);
 end if;
 return new;
end $$;
revoke all on function public.vdx_record_request_event() from public, anon, authenticated;
create trigger vdx_request_event after insert or update of status on public.vdx_requests
 for each row execute function public.vdx_record_request_event();
-- This is a snapshot of existing requests, not a fabricated prior history.
insert into public.vdx_request_events(request_id,user_id,status)
 select id,user_id,status from public.vdx_requests;

create function public.vdx_save_request(p_client_request_id uuid,p_text text,p_provider text)
returns public.vdx_requests language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); result public.vdx_requests;
begin
 if owner_id is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_client_request_id is null or p_text is null or char_length(btrim(p_text)) not between 1 and 10000
  or p_provider is null or p_provider not in ('uber-eats','doordash') then
  raise exception 'Invalid request' using errcode='22023';
 end if;
 insert into public.vdx_requests(user_id,client_request_id,request_text,provider)
 values(owner_id,p_client_request_id,btrim(p_text),p_provider)
 on conflict (user_id,client_request_id) do nothing;
 select * into result from public.vdx_requests where user_id=owner_id and client_request_id=p_client_request_id;
 if result.request_text is distinct from btrim(p_text) or result.provider is distinct from p_provider then
  raise exception 'Retry key already used for a different request' using errcode='22023';
 end if;
 return result;
end $$;
revoke all on function public.vdx_save_request(uuid,text,text) from public, anon;
grant execute on function public.vdx_save_request(uuid,text,text) to authenticated;

create function public.vdx_cancel_request(p_request_id uuid)
returns public.vdx_requests language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); result public.vdx_requests;
begin
 if owner_id is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into result from public.vdx_requests where id=p_request_id and user_id=owner_id for update;
 if not found then raise exception 'Request not found' using errcode='P0002'; end if;
 if result.status <> 'cancelled' then
  update public.vdx_requests set status='cancelled' where id=result.id returning * into result;
 end if;
 return result;
end $$;
revoke all on function public.vdx_cancel_request(uuid) from public, anon;
grant execute on function public.vdx_cancel_request(uuid) to authenticated;
commit;
