-- VDX-owned tables only. Does not modify existing application tables.
create table public.vdx_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 request_text text not null check (char_length(request_text) between 1 and 10000),
 provider text not null check (provider in ('contacts','whatsapp','uber-eats','doordash')),
 status text not null default 'waiting_connection' check (status in ('waiting_connection','ready_to_plan','cancelled')),
 created_at timestamptz not null default now()
);
alter table public.vdx_requests enable row level security;
revoke all on public.vdx_requests from anon, authenticated;
grant select, delete on public.vdx_requests to authenticated;
grant insert(user_id, request_text, provider) on public.vdx_requests to authenticated;
create policy "Read own VDX requests" on public.vdx_requests for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own VDX requests" on public.vdx_requests for insert to authenticated with check ((select auth.uid()) = user_id and status = 'waiting_connection');
create policy "Delete own VDX requests" on public.vdx_requests for delete to authenticated using ((select auth.uid()) = user_id);
create index vdx_requests_user_created on public.vdx_requests(user_id, created_at desc);
-- Clients cannot mark requests connected, approved, or completed.
-- OAuth secrets are deliberately absent from this client-readable schema.
