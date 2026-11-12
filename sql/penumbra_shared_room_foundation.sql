-- PENUMBRA persistent-room foundation (review-only; not applied to production).
-- Requires Supabase Auth identities for Mason and Jason.
-- Restrict public schema resources with RLS; no anonymous access.
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
  joined_at timestamptz not null default now(),
  primary key (room_id,user_id)
);
create table if not exists public.penumbra_room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.penumbra_rooms(id) on delete cascade,
  client_event_id uuid not null,
  author_user_id uuid references auth.users(id),
  actor_type text not null check (actor_type in ('human','ai','system')),
  actor_label text not null check (length(actor_label) between 1 and 80),
  content text not null check (length(content) between 1 and 20000),
  created_at timestamptz not null default now(),
  parent_event_id uuid references public.penumbra_room_events(id),
  provider text,
  model text,
  evidence_refs jsonb not null default '[]'::jsonb,
  authority_state text not null default 'UNREVIEWED',
  unique (room_id,client_event_id),
  constraint penumbra_author_binding check (
    (actor_type = 'human' and author_user_id is not null)
    or (actor_type in ('ai','system') and author_user_id is null)
  )
);
create index if not exists penumbra_events_room_order on public.penumbra_room_events(room_id,created_at,id);

alter table public.penumbra_rooms enable row level security;
alter table public.penumbra_room_members enable row level security;
alter table public.penumbra_room_events enable row level security;

-- No anonymous grants. RLS is a second gate.
revoke all on public.penumbra_rooms, public.penumbra_room_members, public.penumbra_room_events from anon;
grant select,insert on public.penumbra_rooms to authenticated;
grant select on public.penumbra_room_members to authenticated;
grant select,insert on public.penumbra_room_events to authenticated;

create policy penumbra_rooms_create_own on public.penumbra_rooms
for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy penumbra_rooms_read_member on public.penumbra_rooms
for select to authenticated using (
  owner_user_id = (select auth.uid()) or exists (
    select 1 from public.penumbra_room_members m
    where m.room_id = id and m.user_id = (select auth.uid())
  )
);
create policy penumbra_members_read_self on public.penumbra_room_members
for select to authenticated using (user_id = (select auth.uid()));
create policy penumbra_events_read_members on public.penumbra_room_events
for select to authenticated using (
  exists (select 1 from public.penumbra_rooms r
    where r.id = room_id and (r.owner_user_id = (select auth.uid())
      or exists (select 1 from public.penumbra_room_members m
        where m.room_id = r.id and m.user_id = (select auth.uid()))))
);
create policy penumbra_events_insert_human on public.penumbra_room_events
for insert to authenticated with check (
  actor_type = 'human' and author_user_id = (select auth.uid()) and
  exists (select 1 from public.penumbra_rooms r
    where r.id = room_id and (r.owner_user_id = (select auth.uid())
      or exists (select 1 from public.penumbra_room_members m
        where m.room_id = r.id and m.user_id = (select auth.uid()))))
);

-- Intentionally no client policies for editing/deleting messages, membership
-- insertion, or AI/system event insertion. Membership invitations and AI output
-- must use explicitly authorized audited server-side endpoints.
-- No realtime publication configured by this migration.
