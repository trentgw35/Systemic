-- Fix: bind RPC actors to auth.uid() and revoke authenticated EXECUTE
-- (re-applies the hardened bodies from 002 for projects that already ran the old 002).

create or replace function public.update_children_weights(
  p_item_id uuid,
  p_parent_id uuid,
  p_weights jsonb,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_locked timestamptz;
  v_ws uuid;
  r record;
begin
  if p_actor is distinct from auth.uid() then
    raise exception 'actor must be the signed-in user';
  end if;

  select i.locked_at, i.workspace_id into v_locked, v_ws
  from public.items i
  where i.id = p_item_id;

  if v_ws is null then
    raise exception 'item not found';
  end if;
  if v_locked is not null then
    raise exception 'item is locked in';
  end if;
  if not public.is_workspace_member(v_ws) then
    raise exception 'forbidden';
  end if;

  select owner_id into v_owner
  from public.nodes
  where id = p_parent_id and item_id = p_item_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'only the section owner can change these weights';
  end if;

  for r in
    select * from jsonb_to_recordset(p_weights) as x(id uuid, local_weight numeric)
  loop
    update public.nodes
    set local_weight = r.local_weight
    where id = r.id
      and item_id = p_item_id
      and parent_id is not distinct from p_parent_id;
  end loop;

  update public.nodes
  set confirmed = false, confirmed_at = null
  where id = p_parent_id and item_id = p_item_id;

  update public.items
  set updated_at = now()
  where id = p_item_id;
end;
$$;

revoke all on function public.update_children_weights(uuid, uuid, jsonb, uuid) from public;
revoke all on function public.update_children_weights(uuid, uuid, jsonb, uuid) from authenticated;
revoke all on function public.update_children_weights(uuid, uuid, jsonb, uuid) from anon;

create or replace function public.set_node_confirmed(
  p_item_id uuid,
  p_node_id uuid,
  p_confirmed boolean,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_locked timestamptz;
  v_ws uuid;
  v_child_count int;
begin
  if p_actor is distinct from auth.uid() then
    raise exception 'actor must be the signed-in user';
  end if;

  select i.locked_at, i.workspace_id into v_locked, v_ws
  from public.items i
  where i.id = p_item_id;

  if v_ws is null then
    raise exception 'item not found';
  end if;
  if v_locked is not null then
    raise exception 'item is locked in';
  end if;
  if not public.is_workspace_member(v_ws) then
    raise exception 'forbidden';
  end if;

  select owner_id into v_owner
  from public.nodes
  where id = p_node_id and item_id = p_item_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'only the section owner can confirm this set';
  end if;

  select count(*) into v_child_count
  from public.nodes
  where parent_id = p_node_id and item_id = p_item_id;

  if v_child_count = 0 then
    raise exception 'node has no children-set to confirm';
  end if;

  update public.nodes
  set
    confirmed = p_confirmed,
    confirmed_at = case when p_confirmed then now() else null end
  where id = p_node_id and item_id = p_item_id;

  update public.items
  set updated_at = now()
  where id = p_item_id;
end;
$$;

revoke all on function public.set_node_confirmed(uuid, uuid, boolean, uuid) from public;
revoke all on function public.set_node_confirmed(uuid, uuid, boolean, uuid) from authenticated;
revoke all on function public.set_node_confirmed(uuid, uuid, boolean, uuid) from anon;
