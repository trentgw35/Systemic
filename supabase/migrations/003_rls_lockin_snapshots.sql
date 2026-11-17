-- M03: lock-in snapshots + tighten RLS so PostgREST cannot bypass API masking/ownership.

alter table public.items
  add column if not exists checks_snapshot jsonb,
  add column if not exists confirmations_snapshot jsonb;

-- Profiles: only self or shared-workspace members (not every authenticated user)
drop policy if exists profiles_select_authenticated on public.profiles;
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

-- Items: members can read; only item owner may update/delete; insert unchanged
drop policy if exists items_update_member on public.items;
create policy items_update_owner on public.items
  for update to authenticated using (
    created_by = auth.uid() and public.is_workspace_member(workspace_id)
  )
  with check (
    created_by = auth.uid() and public.is_workspace_member(workspace_id)
  );

-- Nodes: no direct client SELECT/INSERT/UPDATE/DELETE.
-- The Next.js API loads/mutates via the service role after membership + ownership checks.
drop policy if exists nodes_select_member on public.nodes;
drop policy if exists nodes_insert_member on public.nodes;
drop policy if exists nodes_update_member on public.nodes;
drop policy if exists nodes_delete_member on public.nodes;

-- Explicit deny-by-absence for authenticated; service_role bypasses RLS.
-- Keep a locked-item read path for future client use if needed:
create policy nodes_select_when_locked on public.nodes
  for select to authenticated using (
    exists (
      select 1 from public.items i
      where i.id = item_id
        and i.locked_at is not null
        and public.is_workspace_member(i.workspace_id)
    )
  );

-- Owned section trees remain readable only through the API (service role).
-- No insert/update/delete policies for authenticated → PostgREST mutations fail.
