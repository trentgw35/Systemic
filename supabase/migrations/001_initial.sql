-- Systemic — initial schema (Context 04)
-- Enforce sum-to-100 per children-set in the same transaction as mutations (trigger).

create extension if not exists pgcrypto;

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.memberships (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text,
  token text not null unique,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz
);

create index workspace_invites_token_idx on public.workspace_invites (token);
create index workspace_invites_email_idx on public.workspace_invites (lower(email));

create table public.items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  mode text not null check (mode in ('decision', 'rcca')),
  title text not null,
  group_tag text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  locked_at timestamptz,
  lock_stamp text,
  expected_areas text[],
  checks_snapshot jsonb,
  confirmations_snapshot jsonb
);

create index items_workspace_id_idx on public.items (workspace_id);

create table public.nodes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  parent_id uuid references public.nodes (id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('opinion', 'anecdote', 'advisory', 'data', 'process')),
  local_weight numeric(8, 4) not null check (local_weight >= 0 and local_weight <= 100),
  owner_id uuid references public.profiles (id),
  delegated_from uuid references public.profiles (id),
  confirmed boolean not null default false,
  confirmed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index nodes_item_id_idx on public.nodes (item_id);
create index nodes_parent_id_idx on public.nodes (parent_id);
create index nodes_owner_id_idx on public.nodes (owner_id);

create table public.action_notes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  node_id uuid not null references public.nodes (id) on delete cascade,
  text text not null,
  owner_name text not null,
  due_date date,
  created_at timestamptz not null default now()
);

-- Sum-to-100 invariant for every children-set (siblings under the same parent_id / item)
create or replace function public.assert_children_sum_100()
returns trigger
language plpgsql
as $$
declare
  v_item_id uuid;
  v_parent_id uuid;
  v_sum numeric;
begin
  if tg_op = 'DELETE' then
    v_item_id := old.item_id;
    v_parent_id := old.parent_id;
  else
    v_item_id := new.item_id;
    v_parent_id := new.parent_id;
  end if;

  select coalesce(sum(local_weight), 0) into v_sum
  from public.nodes
  where item_id = v_item_id
    and parent_id is not distinct from v_parent_id;

  -- Empty set (node and all siblings removed, or item cascade-deleted) is allowed.
  if v_sum = 0 then
    return null;
  end if;

  if abs(v_sum - 100) > 0.0001 then
    raise exception 'children-set weights must sum to 100 (got %)', v_sum;
  end if;

  return null;
end;
$$;

create constraint trigger nodes_sum_100_trigger
after insert or update or delete on public.nodes
deferrable initially deferred
for each row
execute function public.assert_children_sum_100();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update
    set email = excluded.email,
        name = case
          when public.profiles.name = '' then excluded.name
          else public.profiles.name
        end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

create or replace function public.create_workspace(ws_name text, seed_demo boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ws_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if length(trim(ws_name)) = 0 then
    raise exception 'workspace name required';
  end if;

  insert into public.workspaces (name, created_by)
  values (trim(ws_name), uid)
  returning id into ws_id;

  insert into public.memberships (workspace_id, user_id, role)
  values (ws_id, uid, 'admin');

  return ws_id;
end;
$$;

revoke all on function public.create_workspace(text, boolean) from public;
grant execute on function public.create_workspace(text, boolean) to authenticated;

create or replace function public.get_invite_by_token(invite_token text)
returns setof public.workspace_invites
language sql
stable
security definer
set search_path = public
as $$
  select * from public.workspace_invites
  where token = invite_token
    and accepted_at is null
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

revoke all on function public.get_invite_by_token(text) from public;
grant execute on function public.get_invite_by_token(text) to authenticated;

create or replace function public.accept_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.workspace_invites;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into inv from public.workspace_invites
  where token = invite_token
    and accepted_at is null
    and (expires_at is null or expires_at > now())
  for update;

  if inv.id is null then
    raise exception 'invite not found or already used';
  end if;

  if inv.email is not null then
    if lower(inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
      raise exception 'invite email mismatch';
    end if;
  end if;

  insert into public.memberships (workspace_id, user_id, role)
  values (inv.workspace_id, uid, inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invites
  set accepted_at = now()
  where id = inv.id;

  return inv.workspace_id;
end;
$$;

revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.items enable row level security;
alter table public.nodes enable row level security;
alter table public.action_notes enable row level security;

create policy profiles_select_scoped on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or exists (
      select 1
      from public.memberships m1
      join public.memberships m2 on m1.workspace_id = m2.workspace_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy workspaces_select_member on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
create policy workspaces_update_admin on public.workspaces
  for update to authenticated using (public.is_workspace_admin(id));
create policy workspaces_delete_admin on public.workspaces
  for delete to authenticated using (public.is_workspace_admin(id));

create policy memberships_select_member on public.memberships
  for select to authenticated using (public.is_workspace_member(workspace_id) or user_id = auth.uid());
create policy memberships_delete_admin on public.memberships
  for delete to authenticated using (public.is_workspace_admin(workspace_id) and user_id <> auth.uid());

create policy invites_select_admin_or_email on public.workspace_invites
  for select to authenticated using (
    public.is_workspace_admin(workspace_id)
    or (email is not null and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
create policy invites_insert_admin on public.workspace_invites
  for insert to authenticated with check (public.is_workspace_admin(workspace_id) and created_by = auth.uid());
create policy invites_update_admin on public.workspace_invites
  for update to authenticated using (public.is_workspace_admin(workspace_id));

create policy items_select_member on public.items
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy items_insert_member on public.items
  for insert to authenticated with check (
    public.is_workspace_member(workspace_id) and created_by = auth.uid()
  );
-- Only the item owner may update (lock-in, group tag, snapshots) or delete.
create policy items_update_owner on public.items
  for update to authenticated using (
    created_by = auth.uid() and public.is_workspace_member(workspace_id)
  )
  with check (
    created_by = auth.uid() and public.is_workspace_member(workspace_id)
  );
create policy items_delete_owner on public.items
  for delete to authenticated using (
    created_by = auth.uid() and public.is_workspace_member(workspace_id)
  );

-- Nodes: PostgREST cannot read other members' pre-lock-in trees or mutate
-- weights. The Next.js API uses the service role after membership + ownership
-- checks, then returns a masked view (Context 04 rule 2).
-- After lock-in, members may SELECT the revealed tree directly if needed.
create policy nodes_select_when_locked on public.nodes
  for select to authenticated using (
    exists (
      select 1 from public.items i
      where i.id = item_id
        and i.locked_at is not null
        and public.is_workspace_member(i.workspace_id)
    )
  );
-- No INSERT/UPDATE/DELETE policies for authenticated on nodes.

create policy action_notes_select_member on public.action_notes
  for select to authenticated using (
    exists (
      select 1 from public.items i
      where i.id = item_id and public.is_workspace_member(i.workspace_id)
    )
  );
create policy action_notes_insert_member on public.action_notes
  for insert to authenticated with check (
    exists (
      select 1 from public.items i
      where i.id = item_id and public.is_workspace_member(i.workspace_id) and i.locked_at is not null
    )
  );
