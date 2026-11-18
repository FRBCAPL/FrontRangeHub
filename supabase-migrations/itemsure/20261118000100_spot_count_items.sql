-- Spot-scoped counts should snapshot items kept, levelled, or stocked in that spot —
-- not the whole active catalog. Fixes "0 of 316" progress on a Walk-In count of ~67 items.

create or replace function itemsure.start_count_session(
  p_location_id uuid,
  p_storage_area_id uuid,
  p_name text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  org_id uuid;
  new_id uuid;
  added integer;
begin
  select location.organization_id into org_id
  from itemsure.locations as location
  where location.id = p_location_id and location.is_active;
  if org_id is null then
    raise exception 'Choose an active location you can access.';
  end if;

  if p_storage_area_id is not null and not exists (
    select 1 from itemsure.inventory_storage_areas as area
    where area.id = p_storage_area_id and area.location_id = p_location_id and area.is_active
  ) then
    raise exception 'Choose an active storage area at that location.';
  end if;

  insert into itemsure.count_sessions (organization_id, location_id, storage_area_id, scope, name)
  values (
    org_id,
    p_location_id,
    p_storage_area_id,
    case when p_storage_area_id is null then 'location' else 'storage_area' end,
    btrim(coalesce(p_name, ''))
  )
  returning id into new_id;

  perform set_config('itemsure.snapshot_session', new_id::text, true);
  insert into itemsure.count_session_items (session_id, item_id, item_name, base_unit_id, base_unit_name, base_precision_scale)
  select new_id, item.id, item.name, item.base_unit_id, '', 0
  from itemsure.inventory_items as item
  where item.organization_id = org_id
    and item.is_active
    and (
      p_storage_area_id is null
      or exists (
        select 1 from itemsure.item_places as place
        where place.item_id = item.id
          and place.location_id = p_location_id
          and place.storage_area_id is not distinct from p_storage_area_id
      )
      or exists (
        select 1 from itemsure.inventory_targets as target
        where target.item_id = item.id
          and target.location_id = p_location_id
          and target.storage_area_id is not distinct from p_storage_area_id
      )
      or exists (
        select 1 from itemsure.inventory_balances as balance
        where balance.item_id = item.id
          and balance.location_id = p_location_id
          and balance.storage_area_id is not distinct from p_storage_area_id
          and balance.quantity <> 0
      )
    );

  get diagnostics added = row_count;
  perform set_config('itemsure.snapshot_session', '', true);
  if added = 0 then
    if p_storage_area_id is null then
      raise exception 'Add active items to the catalog before starting a count.';
    end if;
    raise exception 'No items are kept, levelled, or stocked in that spot yet.';
  end if;

  return new_id;
end;
$$;

comment on function itemsure.start_count_session(uuid, uuid, text) is
  'Starts a count. Whole-site counts include every active item; spot counts include items kept, levelled, or stocked in that spot.';

create or replace function itemsure.start_supplier_count_session(
  p_location_id uuid,
  p_storage_area_id uuid,
  p_supplier_id uuid,
  p_name text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  org_id uuid;
  new_id uuid;
  added integer;
begin
  select location.organization_id into org_id
  from itemsure.locations as location
  where location.id = p_location_id and location.is_active;
  if org_id is null then
    raise exception 'Choose an active location you can access.';
  end if;

  if p_storage_area_id is not null and not exists (
    select 1 from itemsure.inventory_storage_areas as area
    where area.id = p_storage_area_id and area.location_id = p_location_id and area.is_active
  ) then
    raise exception 'Choose an active storage area at that location.';
  end if;

  if p_supplier_id is null or not exists (
    select 1 from itemsure.suppliers as supplier
    where supplier.id = p_supplier_id and supplier.organization_id = org_id and supplier.is_active
  ) then
    raise exception 'Choose an active supplier.';
  end if;

  insert into itemsure.count_sessions (organization_id, location_id, storage_area_id, scope, name, supplier_id)
  values (
    org_id,
    p_location_id,
    p_storage_area_id,
    case when p_storage_area_id is null then 'location' else 'storage_area' end,
    btrim(coalesce(p_name, '')),
    p_supplier_id
  )
  returning id into new_id;

  perform set_config('itemsure.snapshot_session', new_id::text, true);
  insert into itemsure.count_session_items (session_id, item_id, item_name, base_unit_id, base_unit_name, base_precision_scale)
  select new_id, item.id, item.name, item.base_unit_id, '', 0
  from itemsure.inventory_items as item
  where item.organization_id = org_id
    and item.is_active
    and (
      item.supplier_id = p_supplier_id
      or exists (
        select 1 from itemsure.item_suppliers as also
        where also.item_id = item.id and also.supplier_id = p_supplier_id
      )
    )
    and (
      p_storage_area_id is null
      or exists (
        select 1 from itemsure.item_places as place
        where place.item_id = item.id
          and place.location_id = p_location_id
          and place.storage_area_id is not distinct from p_storage_area_id
      )
      or exists (
        select 1 from itemsure.inventory_targets as target
        where target.item_id = item.id
          and target.location_id = p_location_id
          and target.storage_area_id is not distinct from p_storage_area_id
      )
      or exists (
        select 1 from itemsure.inventory_balances as balance
        where balance.item_id = item.id
          and balance.location_id = p_location_id
          and balance.storage_area_id is not distinct from p_storage_area_id
          and balance.quantity <> 0
      )
    );

  get diagnostics added = row_count;
  perform set_config('itemsure.snapshot_session', '', true);
  if added = 0 then
    if p_storage_area_id is null then
      raise exception 'No active items are bought from that supplier yet. Set "Buy from" on your items first.';
    end if;
    raise exception 'No items from that supplier are kept, levelled, or stocked in that spot yet.';
  end if;

  return new_id;
end;
$$;

comment on function itemsure.start_supplier_count_session(uuid, uuid, uuid, text) is
  'Starts a supplier count. When a spot is chosen, only supplier items kept/levelled/stocked there are included.';

revoke all on function itemsure.start_count_session(uuid, uuid, text) from public, anon;
grant execute on function itemsure.start_count_session(uuid, uuid, text) to authenticated, service_role;

revoke all on function itemsure.start_supplier_count_session(uuid, uuid, uuid, text) from public, anon;
grant execute on function itemsure.start_supplier_count_session(uuid, uuid, uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
