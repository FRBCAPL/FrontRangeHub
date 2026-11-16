-- ItemSure: Goes with sales + bulk add to recipes (20261030005700).
-- One transaction, rolled back. A failed check stops with "CHECK: ...".

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated',
  u.email, '', now(), '{"provider":"email","providers":["email"]}',
  jsonb_build_object('full_name', u.name, 'app', 'itemsure'),
  now(), now(), 'rc-confirm-' || u.tag, 'rc-recovery-' || u.tag, 'rc-change-' || u.tag, ''
from (values
  ('fd111111-1111-4111-8111-111111111157', 'aw.owner@itemsure.test', 'Aw Owner', 'o')
) as u(id, email, name, tag);

select set_config('request.jwt.claim.sub', 'fd111111-1111-4111-8111-111111111157', true);
select set_config('request.jwt.claims', '{"sub":"fd111111-1111-4111-8111-111111111157","role":"authenticated"}', true);
set local role authenticated;

insert into itemsure.organizations (id, name, slug, industry_type)
values ('afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'Always With A', 'itemsure-verify-always-with-a', 'hospitality');

insert into itemsure.inventory_categories (id, organization_id, name, parent_category_id, sort_order)
values
  ('afd00000-0000-4ccc-8ccc-000000000057', 'afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'Food', null, 1),
  ('afd00000-0000-4ccc-8ccc-000000000058', 'afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'Wings', 'afd00000-0000-4ccc-8ccc-000000000057', 2),
  ('afd00000-0000-4ccc-8ccc-000000000059', 'afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'Liquor', null, 3);

insert into itemsure.inventory_items (id, organization_id, name, base_unit_id, category_id)
select v.id::uuid, 'afd00000-0000-4aaa-8aaa-aaaaaaaaa057', v.name, u.id, v.cat::uuid
from (values
  ('afd00000-0000-4ddd-8ddd-000000000057', 'Checkered Sheets', 'afd00000-0000-4ccc-8ccc-000000000057'),
  ('afd00000-0000-4ddd-8ddd-000000000058', 'Hot Wings', 'afd00000-0000-4ccc-8ccc-000000000058'),
  ('afd00000-0000-4ddd-8ddd-000000000059', 'Well Rum', 'afd00000-0000-4ccc-8ccc-000000000059'),
  ('afd00000-0000-4ddd-8ddd-00000000005a', 'Burger', 'afd00000-0000-4ccc-8ccc-000000000057')
) as v(id, name, cat)
join itemsure.units_of_measure as u on u.code = 'each' and u.organization_id is null;

perform itemsure.set_item_always_with(
  'afd00000-0000-4aaa-8aaa-aaaaaaaaa057',
  'afd00000-0000-4ddd-8ddd-000000000057',
  '[{"category_id":"afd00000-0000-4ccc-8ccc-000000000057","amount":1,"unit":"base"}]'::jsonb
);

if (select count(*) from itemsure.item_always_with where item_id = 'afd00000-0000-4ddd-8ddd-000000000057') <> 1 then
  raise exception 'CHECK: set_item_always_with should save one rule';
end if;

-- Clover sales hour + links (edge-style writes).
reset role;
insert into itemsure.pos_items (organization_id, provider, external_id, name, not_tracked)
values
  ('afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'clover', 'WINGS', 'Wings Plate', false),
  ('afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'clover', 'SHOT', 'Rum Shot', false),
  ('afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'clover', 'BURGER', 'Burger', false);

insert into itemsure.pos_item_links (organization_id, provider, external_id, item_id, uses_amount, uses_unit)
values
  ('afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'clover', 'WINGS', 'afd00000-0000-4ddd-8ddd-000000000058', 1, 'base'),
  ('afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'clover', 'SHOT', 'afd00000-0000-4ddd-8ddd-000000000059', 1.5, 'fl_oz'),
  ('afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'clover', 'BURGER', 'afd00000-0000-4ddd-8ddd-00000000005a', 1, 'base'),
  ('afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'clover', 'BURGER', 'afd00000-0000-4ddd-8ddd-000000000057', 1, 'base');

insert into itemsure.pos_sales_hourly (organization_id, provider, external_id, hour_start, quantity, refunded_quantity)
values
  ('afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'clover', 'WINGS', date_trunc('hour', now()) - interval '2 hours', 3, 0),
  ('afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'clover', 'SHOT', date_trunc('hour', now()) - interval '2 hours', 2, 0),
  ('afd00000-0000-4aaa-8aaa-aaaaaaaaa057', 'clover', 'BURGER', date_trunc('hour', now()) - interval '2 hours', 1, 0);

set local role authenticated;

-- Internal take-off helpers are service_role only.
reset role;

-- Wings (subcategory of Food): 3 sheets. Shot (Liquor): none. Burger already links sheets: none.
if (select coalesce(sum(used), 0) from itemsure.pos_always_with_uses(
      'afd00000-0000-4aaa-8aaa-aaaaaaaaa057',
      date_trunc('hour', now()) - interval '3 hours',
      date_trunc('hour', now())
    ) where item_id = 'afd00000-0000-4ddd-8ddd-000000000057' and external_id = 'WINGS') <> 3 then
  raise exception 'CHECK: Wings sale should take 3 sheets once (subcategory match)';
end if;

if exists (
  select 1 from itemsure.pos_always_with_uses(
    'afd00000-0000-4aaa-8aaa-aaaaaaaaa057',
    date_trunc('hour', now()) - interval '3 hours',
    date_trunc('hour', now())
  ) where external_id = 'SHOT'
) then
  raise exception 'CHECK: Liquor sale should not take sheets';
end if;

if exists (
  select 1 from itemsure.pos_always_with_uses(
    'afd00000-0000-4aaa-8aaa-aaaaaaaaa057',
    date_trunc('hour', now()) - interval '3 hours',
    date_trunc('hour', now())
  ) where external_id = 'BURGER'
) then
  raise exception 'CHECK: Burger already linking sheets should skip always-with';
end if;

set local role authenticated;

-- Bulk add sheets to a recipe that a button uses.
perform itemsure.save_recipe(
  'afd00000-0000-4aaa-8aaa-aaaaaaaaa057',
  null,
  'Wings Plate',
  '[{"item_id":"afd00000-0000-4ddd-8ddd-000000000058","amount":1,"unit":"base"}]'::jsonb
);

perform itemsure.use_pos_recipe(
  'afd00000-0000-4aaa-8aaa-aaaaaaaaa057',
  (select id from itemsure.recipes where organization_id = 'afd00000-0000-4aaa-8aaa-aaaaaaaaa057' and name = 'Wings Plate'),
  array['WINGS']::text[]
);

if (select itemsure.add_ingredient_to_recipes(
      'afd00000-0000-4aaa-8aaa-aaaaaaaaa057',
      'afd00000-0000-4ddd-8ddd-000000000057',
      1, 'base',
      array[(select id from itemsure.recipes where organization_id = 'afd00000-0000-4aaa-8aaa-aaaaaaaaa057' and name = 'Wings Plate')]::uuid[]
    ) ->> 'updated') <> '1' then
  raise exception 'CHECK: bulk add should update one recipe';
end if;

if not exists (
  select 1 from itemsure.pos_item_links
  where organization_id = 'afd00000-0000-4aaa-8aaa-aaaaaaaaa057'
    and external_id = 'WINGS' and item_id = 'afd00000-0000-4ddd-8ddd-000000000057'
) then
  raise exception 'CHECK: bulk add should sync sheets onto the Clover button';
end if;

if (select itemsure.add_ingredient_to_recipes(
      'afd00000-0000-4aaa-8aaa-aaaaaaaaa057',
      'afd00000-0000-4ddd-8ddd-000000000057',
      1, 'base',
      array[(select id from itemsure.recipes where organization_id = 'afd00000-0000-4aaa-8aaa-aaaaaaaaa057' and name = 'Wings Plate')]::uuid[]
    ) ->> 'skipped_have') <> '1' then
  raise exception 'CHECK: second bulk add should skip recipes that already have it';
end if;

rollback;
