-- ItemSure: packaging that "goes with" sales in a category, plus bulk-add an ingredient to recipes.
--
-- 1. item_always_with: packaging item + trigger category + amount per sale. When a Clover sale uses
--    any linked inventory item in that category (or its subcategory), take the packaging off once
--    for that sale — not once per ingredient. Skipped when the packaging is already on the button's
--    links (including via a recipe), so there is no double count.
-- 2. set_item_always_with: replace all rules for one item (items.manage).
-- 3. add_ingredient_to_recipes: append one ingredient to many recipes; buttons using them follow.
-- 4. pos_always_with_uses + pos_take_uses: take-off includes always-with rows.
--
-- Safe to re-run. Needs 20261030005300_pos_take_add_ons.sql (pos_use_in_base, pos_take_uses) and
-- 20261030005100_recipes.sql (recipe_to_links).

-- ── 1. Table ──────────────────────────────────────────────────────────────

create table if not exists itemsure.item_always_with (
  organization_id uuid not null references itemsure.organizations (id) on delete cascade,
  item_id uuid not null,
  category_id uuid not null,
  uses_amount numeric(18, 6) not null,
  uses_unit text not null,
  updated_at timestamptz not null default now(),
  primary key (item_id, category_id),
  constraint item_always_with_item_fk
    foreign key (item_id, organization_id) references itemsure.inventory_items (id, organization_id) on delete cascade,
  constraint item_always_with_category_fk
    foreign key (category_id, organization_id) references itemsure.inventory_categories (id, organization_id) on delete cascade,
  constraint item_always_with_amount check (
    uses_amount > 0 and uses_amount <= 100000
    and uses_unit in ('fl_oz', 'ml', 'base', 'piece')
  )
);

comment on table itemsure.item_always_with is
  'Packaging taken off once per Clover sale when any linked item is in (or under) this category. Written only by set_item_always_with.';

create index if not exists item_always_with_org_cat_idx
  on itemsure.item_always_with (organization_id, category_id);

alter table itemsure.item_always_with enable row level security;

drop policy if exists item_always_with_read on itemsure.item_always_with;
create policy item_always_with_read on itemsure.item_always_with
for select to authenticated
using (itemsure.has_permission(organization_id, 'items.read'));

revoke all on table itemsure.item_always_with from public, anon, authenticated;
grant select on table itemsure.item_always_with to authenticated;
grant all on table itemsure.item_always_with to service_role;

drop trigger if exists item_always_with_audit on itemsure.item_always_with;
create trigger item_always_with_audit
after insert or update or delete on itemsure.item_always_with
for each row execute function itemsure.audit_row_change();

-- ── 2. Replace all always-with rules for one item ─────────────────────────
-- p_rows: [{ "category_id": uuid, "amount": number, "unit": text }], 0..20.

create or replace function itemsure.set_item_always_with(p_organization uuid, p_item uuid, p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  row jsonb;
  cat uuid;
  amt numeric;
  unt text;
  n integer;
begin
  if auth.uid() is null or not itemsure.has_permission(p_organization, 'items.manage') then
    raise exception 'You do not have permission to change this.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from itemsure.inventory_items as i
    where i.id = p_item and i.organization_id = p_organization
  ) then
    raise exception 'That item is not in this business''s catalog.';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Pick the categories this goes with, or clear them.';
  end if;
  n := jsonb_array_length(p_rows);
  if n > 20 then
    raise exception 'Keep always-with to at most 20 categories.';
  end if;

  delete from itemsure.item_always_with as a
  where a.organization_id = p_organization and a.item_id = p_item;

  for row in select value from jsonb_array_elements(p_rows) loop
    cat := (row ->> 'category_id')::uuid;
    amt := nullif(row ->> 'amount', '')::numeric;
    unt := nullif(row ->> 'unit', '');
    if cat is null or amt is null or unt is null then
      raise exception 'Each always-with needs a category, amount, and unit.';
    end if;
    if not exists (
      select 1 from itemsure.inventory_categories as c
      where c.id = cat and c.organization_id = p_organization and c.is_active
    ) then
      raise exception 'That category was not found.';
    end if;
    if exists (
      select 1 from itemsure.item_always_with as a
      where a.item_id = p_item and a.category_id = cat
    ) then
      raise exception 'Each category can be listed only once.';
    end if;
    insert into itemsure.item_always_with (organization_id, item_id, category_id, uses_amount, uses_unit)
    values (p_organization, p_item, cat, amt, unt);
  end loop;
end;
$$;

comment on function itemsure.set_item_always_with(uuid, uuid, jsonb) is
  'Replaces Goes with sales rules for one item. Needs items.manage.';

revoke all on function itemsure.set_item_always_with(uuid, uuid, jsonb) from public, anon;
grant execute on function itemsure.set_item_always_with(uuid, uuid, jsonb) to authenticated, service_role;

-- ── 3. Bulk-add one ingredient to many recipes ────────────────────────────
-- Returns { updated, skipped_have, skipped_full }.

create or replace function itemsure.add_ingredient_to_recipes(
  p_organization uuid,
  p_item uuid,
  p_amount numeric,
  p_unit text,
  p_recipe_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ids uuid[] := array(select distinct x from unnest(coalesce(p_recipe_ids, '{}')) as x);
  rid uuid;
  pos integer;
  updated integer := 0;
  skipped_have integer := 0;
  skipped_full integer := 0;
  amt numeric := p_amount;
  unt text := nullif(btrim(coalesce(p_unit, '')), '');
  b record;
begin
  if auth.uid() is null or not itemsure.has_permission(p_organization, 'items.manage') then
    raise exception 'You do not have permission to change recipes.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from itemsure.inventory_items as i
    where i.id = p_item and i.organization_id = p_organization
  ) then
    raise exception 'That item is not in this business''s catalog.';
  end if;
  if (amt is null) <> (unt is null) then
    raise exception 'Set both amount and unit, or leave both empty for the usual pour.';
  end if;
  if amt is not null and (amt <= 0 or amt > 100000 or unt not in ('fl_oz', 'ml', 'base', 'piece')) then
    raise exception 'Amount must be more than 0 with a valid unit.';
  end if;
  if coalesce(array_length(ids, 1), 0) = 0 then
    raise exception 'Pick at least one recipe.';
  end if;

  foreach rid in array ids loop
    if not exists (
      select 1 from itemsure.recipes as r
      where r.id = rid and r.organization_id = p_organization
    ) then
      raise exception 'One of those recipes was not found.';
    end if;
    if exists (
      select 1 from itemsure.recipe_items as ri
      where ri.recipe_id = rid and ri.item_id = p_item
    ) then
      skipped_have := skipped_have + 1;
      continue;
    end if;
    select count(*)::integer into pos from itemsure.recipe_items as ri where ri.recipe_id = rid;
    if pos >= 20 then
      skipped_full := skipped_full + 1;
      continue;
    end if;
    insert into itemsure.recipe_items (organization_id, recipe_id, item_id, position, uses_amount, uses_unit)
    values (p_organization, rid, p_item, pos + 1, amt, unt);
    for b in select u.external_id from itemsure.pos_recipe_uses as u where u.recipe_id = rid loop
      perform itemsure.recipe_to_links(p_organization, rid, b.external_id);
    end loop;
    update itemsure.recipes set updated_at = now() where id = rid;
    updated := updated + 1;
  end loop;

  return jsonb_build_object(
    'updated', updated,
    'skipped_have', skipped_have,
    'skipped_full', skipped_full
  );
end;
$$;

comment on function itemsure.add_ingredient_to_recipes(uuid, uuid, numeric, text, uuid[]) is
  'Appends one ingredient to many recipes and refreshes Clover buttons using them. Needs items.manage.';

revoke all on function itemsure.add_ingredient_to_recipes(uuid, uuid, numeric, text, uuid[]) from public, anon;
grant execute on function itemsure.add_ingredient_to_recipes(uuid, uuid, numeric, text, uuid[]) to authenticated, service_role;

-- ── 4. Always-with take-off (once per sale hour × button × packaging item) ─

create or replace function itemsure.pos_always_with_uses(p_org uuid, p_from timestamptz, p_to timestamptz)
returns table (hour_start timestamptz, item_id uuid, external_id text, used numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with sales as (
    select h.hour_start, h.external_id, (h.quantity + h.refunded_quantity) as qty
    from itemsure.pos_sales_hourly as h
    where h.organization_id = p_org
      and h.provider = 'clover'
      and h.hour_start >= p_from
      and h.hour_start < p_to
      and h.quantity + h.refunded_quantity > 0
  ),
  triggered as (
    select distinct s.hour_start, s.external_id, s.qty, aw.item_id, aw.uses_amount, aw.uses_unit
    from sales as s
    join itemsure.pos_item_links as l
      on l.organization_id = p_org and l.provider = 'clover' and l.external_id = s.external_id
    join itemsure.inventory_items as linked on linked.id = l.item_id
    left join itemsure.inventory_categories as cat on cat.id = linked.category_id
    join itemsure.item_always_with as aw
      on aw.organization_id = p_org
     and (linked.category_id = aw.category_id or cat.parent_category_id = aw.category_id)
    where not exists (
      select 1 from itemsure.pos_item_links as x
      where x.organization_id = p_org and x.provider = 'clover'
        and x.external_id = s.external_id and x.item_id = aw.item_id
    )
  )
  select t.hour_start, t.item_id, t.external_id,
         t.qty * itemsure.pos_use_in_base(t.item_id, t.uses_amount, t.uses_unit)
  from triggered as t;
$$;

comment on function itemsure.pos_always_with_uses(uuid, timestamptz, timestamptz) is
  'Internal: packaging taken once per Clover sale when a linked item matches Goes with sales.';

revoke all on function itemsure.pos_always_with_uses(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function itemsure.pos_always_with_uses(uuid, timestamptz, timestamptz) to service_role;

create or replace function itemsure.pos_take_uses(p_org uuid, p_from timestamptz, p_to timestamptz, p_add_ons_from timestamptz)
returns table (hour_start timestamptz, item_id uuid, external_id text, modifier_id text, used numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select s.hour_start, s.item_id, s.external_id, null::text, s.used
  from itemsure.pos_sale_uses(p_org, p_from, p_to) as s
  union all
  select m.hour_start, m.item_id, m.external_id, m.modifier_id, m.used
  from itemsure.pos_modifier_uses(p_org, greatest(p_from, p_add_ons_from), p_to) as m
  where p_add_ons_from is not null
  union all
  select a.hour_start, a.item_id, a.external_id, null::text, a.used
  from itemsure.pos_always_with_uses(p_org, p_from, p_to) as a;
$$;

comment on function itemsure.pos_take_uses(uuid, timestamptz, timestamptz, timestamptz) is
  'Internal: sales, optional add-ons, and Goes with sales packaging for take-off.';
