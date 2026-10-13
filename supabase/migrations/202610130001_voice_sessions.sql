-- Counts only session requests; never audio or transcript content.
create table if not exists public.vdx_voice_limits (
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null default now(),
 requests integer not null default 0
);
alter table public.vdx_voice_limits enable row level security;
revoke all on public.vdx_voice_limits from anon, authenticated;
create or replace function public.vdx_claim_voice_session() returns boolean
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); allowed boolean;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 insert into public.vdx_voice_limits(user_id,requests) values(uid,1)
 on conflict(user_id) do update set
 requests=case when public.vdx_voice_limits.window_start < now()-interval '1 hour' then 1 else public.vdx_voice_limits.requests+1 end,
 window_start=case when public.vdx_voice_limits.window_start < now()-interval '1 hour' then now() else public.vdx_voice_limits.window_start end
 returning requests<=12 into allowed;
 return allowed;
end;
$$;
revoke all on function public.vdx_claim_voice_session() from public,anon;
grant execute on function public.vdx_claim_voice_session() to authenticated;
