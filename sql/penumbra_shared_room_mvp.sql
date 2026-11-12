-- NULLWORKS PENUMBRA SHARED WORKROOM v0.2 — NOT APPLIED.
-- Dedicated Supabase project must be selected before applying.
-- Requires Supabase Auth email OTP, database REST API, and RLS.
create extension if not exists pgcrypto;

create table if not exists public.penumbra_rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 120),
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.penumbra_room_members (
  room_id uuid not null references public.penumbra_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  display_name text not null check (length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key(room_id,user_id)
);

create table if not exists public.penumbra_room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.penumbra_rooms(id) on delete cascade,
  client_event_id uuid not null,
  author_user_id uuid references auth.users(id),
  actor_type text not null check (actor_type in ('human','ai','system')),
  actor_label text not null default 'Human' check (length(actor_label) between 1 and 80),
  content text not null check (length(content) between 1 and 20000),
  provider text,
  model text,
  parent_event_id uuid references public.penumbra_room_events(id),
  created_at timestamptz not null default now(),
  unique(room_id,client_event_id),
  constraint penumbra_human_actor_bound check (
    (actor_type = 'human' and author_user_id is not null)
    or (actor_type in ('ai','system') and author_user_id is null)
  )
);
create index if not exists penumbra_room_events_order on public.penumbra_room_events(room_id,created_at,id);
-- One AI reply per explicit human message; retries cannot create duplicate AI output.
create unique index if not exists penumbra_single_ai_reply on public.penumbra_room_events(room_id,parent_event_id)
  where actor_type='ai' and parent_event_id is not null;

create table if not exists public.penumbra_room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.penumbra_rooms(id) on delete cascade,
  invited_by uuid not null references auth.users(id),
  invitee_email text not null check (length(invitee_email) between 3 and 254),
  token_sha256 text not null unique check (length(token_sha256) = 64),
  expires_at timestamptz not null,
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists penumbra_room_invites_room on public.penumbra_room_invites(room_id,expires_at);

alter table public.penumbra_rooms enable row level security;
alter table public.penumbra_room_members enable row level security;
alter table public.penumbra_room_events enable row level security;
alter table public.penumbra_room_invites enable row level security;

revoke all on public.penumbra_rooms, public.penumbra_room_members,
  public.penumbra_room_events, public.penumbra_room_invites from anon, authenticated;
grant select,insert on public.penumbra_rooms to authenticated;
grant select on public.penumbra_room_members to authenticated;
grant select on public.penumbra_room_events to authenticated;
grant insert(room_id,client_event_id,author_user_id,actor_type,content)
  on public.penumbra_room_events to authenticated;
-- Invitations are service-role only; no anon/authenticated privileges.

create policy penumbra_room_insert_own on public.penumbra_rooms
for insert to authenticated with check (owner_user_id=(select auth.uid()));
create policy penumbra_room_select_member on public.penumbra_rooms
for select to authenticated using (
  owner_user_id=(select auth.uid()) or exists (
    select 1 from public.penumbra_room_members m
    where m.room_id=id and m.user_id=(select auth.uid())
  )
);
create policy penumbra_members_select_self on public.penumbra_room_members
for select to authenticated using (user_id=(select auth.uid()));
create policy penumbra_events_select_member on public.penumbra_room_events
for select to authenticated using (
  exists(select 1 from public.penumbra_rooms r where r.id=room_id)
);
create policy penumbra_events_insert_human on public.penumbra_room_events
for insert to authenticated with check (
  actor_type='human' and author_user_id=(select auth.uid())
  and actor_label='Human' and provider is null and model is null and parent_event_id is null
  and exists(select 1 from public.penumbra_rooms r where r.id=room_id)
);
-- A direct authenticated INSERT cannot set actor_label, provider, model, or parent_event_id.
-- API maps verified author_user_id to a display label after room membership checks.
-- Client cannot change or remove events. AI and invite writes require a separate
-- server-side check and service role (never in a browser).
-- No Realtime publication by default. Polling is the initial transport.
