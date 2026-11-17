-- ItemSure: private Demo Bar per signed-in user (discover the product with sample data).
--
-- organizations.is_demo: marks a business as the user's resettable demo.
-- enter_demo(): create or open that user's Demo Bar and seed sample inventory + mock Clover.
-- reset_demo(org): wipe and reseed (same org id). Caller must be a member of an is_demo org.
--
-- Mock Clover uses environment sandbox + merchant_id DEMO (no token / Edge Function).
-- Sales and sync windows are pre-seeded so Sales vs counts works offline.
--
-- APPLY BEFORE SMOKE TEST (does not run itself):
--   1) Supabase SQL editor or CLI: run this file on the ItemSure project.
--   2) Auth → Providers → enable Anonymous sign-ins (guest Demo Bar needs this).
--   3) Optional check: verify/demo-bar.sql (rolls back).
--   4) App (no account): Welcome → Try the Demo Bar → Home / Inventory / Sales vs counts → Reset sample.

alter table itemsure.organizations
  add column if not exists is_demo boolean not null default false;

comment on column itemsure.organizations.is_demo is
  'Private product demo for one member. Resettable sample data; not a real business.';

create index if not exists organizations_demo_member_idx
  on itemsure.organization_memberships (user_id)
  where status = 'active';

-- ── Wipe demo content (keep the organization row) ───────────────────────────

create or replace function itemsure.wipe_demo_bar(p_organization uuid)
returns void
language plpgsql
security definer
set search_path = itemsure, public
as $$
begin
  if not exists (select 1 from itemsure.organizations where id = p_organization and is_demo) then
    raise exception 'Not a Demo Bar.';
  end if;

  -- Approved counts and ledger rows refuse ordinary deletes. Disable those guards
  -- only for this wipe (same approach as seeding backdated counts).
  alter table itemsure.count_session_items disable trigger count_session_items_guard;
  alter table itemsure.count_entries disable trigger count_entries_guard;
  alter table itemsure.count_sessions disable trigger count_sessions_guard;
  alter table itemsure.inventory_movements disable trigger inventory_movements_protect;
  alter table itemsure.inventory_movement_packages disable trigger inventory_movement_packages_protect;

  begin
    delete from itemsure.pos_modifier_hourly where organization_id = p_organization;
    delete from itemsure.pos_sales_hourly where organization_id = p_organization;
    delete from itemsure.pos_sales_syncs where organization_id = p_organization;
    delete from itemsure.pos_modifiers where organization_id = p_organization;
    delete from itemsure.pos_item_links where organization_id = p_organization;
    delete from itemsure.pos_match_ignores where organization_id = p_organization;
    delete from itemsure.pos_items where organization_id = p_organization;
    delete from itemsure.pos_connections where organization_id = p_organization;

    delete from itemsure.shopping_ticks where organization_id = p_organization;
    delete from itemsure.shopping_extras where organization_id = p_organization;
    delete from itemsure.shopping_supplier_choices where organization_id = p_organization;
    delete from itemsure.shopping_receipts where organization_id = p_organization;

    delete from itemsure.count_sessions where organization_id = p_organization;
    delete from itemsure.inventory_movements where organization_id = p_organization;
    delete from itemsure.inventory_balances where organization_id = p_organization;
    delete from itemsure.inventory_targets where organization_id = p_organization;
    delete from itemsure.item_places where organization_id = p_organization;
    delete from itemsure.item_contents where organization_id = p_organization;
    delete from itemsure.item_piece_counts where organization_id = p_organization;
    delete from itemsure.item_suppliers where organization_id = p_organization;
    delete from itemsure.item_extra_categories where organization_id = p_organization;
    delete from itemsure.item_supplier_prices where organization_id = p_organization;
    delete from itemsure.item_always_with where organization_id = p_organization;
    delete from itemsure.recipes where organization_id = p_organization;
    delete from itemsure.inventory_items where organization_id = p_organization;
    delete from itemsure.inventory_categories where organization_id = p_organization;
    delete from itemsure.inventory_storage_areas where organization_id = p_organization;
    delete from itemsure.locations where organization_id = p_organization;
    delete from itemsure.suppliers where organization_id = p_organization;
    delete from itemsure.audit_events where organization_id = p_organization;
  exception
    when others then
      alter table itemsure.count_session_items enable trigger count_session_items_guard;
      alter table itemsure.count_entries enable trigger count_entries_guard;
      alter table itemsure.count_sessions enable trigger count_sessions_guard;
      alter table itemsure.inventory_movements enable trigger inventory_movements_protect;
      alter table itemsure.inventory_movement_packages enable trigger inventory_movement_packages_protect;
      raise;
  end;

  alter table itemsure.count_session_items enable trigger count_session_items_guard;
  alter table itemsure.count_entries enable trigger count_entries_guard;
  alter table itemsure.count_sessions enable trigger count_sessions_guard;
  alter table itemsure.inventory_movements enable trigger inventory_movements_protect;
  alter table itemsure.inventory_movement_packages enable trigger inventory_movement_packages_protect;
end;
$$;

comment on function itemsure.wipe_demo_bar(uuid) is
  'Clears Demo Bar sample data for one organization. Internal helper for reset/seed.';

revoke all on function itemsure.wipe_demo_bar(uuid) from public, anon, authenticated;

-- ── Seed sample inventory + mock Clover ─────────────────────────────────────

create or replace function itemsure.seed_demo_bar(p_organization uuid)
returns void
language plpgsql
security definer
set search_path = itemsure, public
as $$
declare
  uid uuid := auth.uid();
  bottle uuid;
  each_u uuid;
  case_u uuid;
  loc uuid := gen_random_uuid();
  bar uuid := gen_random_uuid();
  kitchen uuid := gen_random_uuid();
  cat_liquor uuid := gen_random_uuid();
  cat_beer uuid := gen_random_uuid();
  cat_mix uuid := gen_random_uuid();
  cat_food uuid := gen_random_uuid();
  supplier uuid := gen_random_uuid();
  rum uuid := gen_random_uuid();
  vodka uuid := gen_random_uuid();
  whiskey uuid := gen_random_uuid();
  gin uuid := gen_random_uuid();
  tequila uuid := gen_random_uuid();
  amaretto uuid := gen_random_uuid();
  red_bull uuid := gen_random_uuid();
  ranch uuid := gen_random_uuid();
  lemons uuid := gen_random_uuid();
  lime uuid := gen_random_uuid();
  beer_case uuid := gen_random_uuid();
  soda uuid := gen_random_uuid();
  chips uuid := gen_random_uuid();
  t0 timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  t_open timestamptz := t0 - interval '7 days' + interval '10 hours';
  t_close timestamptz := t0 - interval '1 day' + interval '22 hours';
  s1 uuid;
  s2 uuid;
  preview jsonb;
  h timestamptz;
begin
  if uid is null then
    raise exception 'Sign in to use the Demo Bar.';
  end if;
  if not exists (select 1 from itemsure.organizations where id = p_organization and is_demo) then
    raise exception 'Not a Demo Bar.';
  end if;

  select id into bottle from itemsure.units_of_measure where code = 'bottle' and organization_id is null;
  select id into each_u from itemsure.units_of_measure where code = 'each' and organization_id is null;
  select id into case_u from itemsure.units_of_measure where code = 'case' and organization_id is null;
  if bottle is null or each_u is null or case_u is null then
    raise exception 'ItemSure units are missing. Apply the seed migration first.';
  end if;

  perform itemsure.wipe_demo_bar(p_organization);

  insert into itemsure.locations (id, organization_id, name)
  values (loc, p_organization, 'Demo Bar');

  insert into itemsure.inventory_storage_areas (id, organization_id, location_id, name) values
    (bar, p_organization, loc, 'Front Bar'),
    (kitchen, p_organization, loc, 'Kitchen');

  insert into itemsure.inventory_categories (id, organization_id, name, sort_order) values
    (cat_liquor, p_organization, 'Liquor', 10),
    (cat_beer, p_organization, 'Beer', 20),
    (cat_mix, p_organization, 'Mixers', 30),
    (cat_food, p_organization, 'Food', 40);

  insert into itemsure.suppliers (id, organization_id, name)
  values (supplier, p_organization, 'Demo Distributing');

  insert into itemsure.inventory_items (id, organization_id, name, category_id, base_unit_id) values
    (rum, p_organization, 'Rum', cat_liquor, bottle),
    (vodka, p_organization, 'Vodka', cat_liquor, bottle),
    (whiskey, p_organization, 'Whiskey', cat_liquor, bottle),
    (gin, p_organization, 'Gin', cat_liquor, bottle),
    (tequila, p_organization, 'Tequila', cat_liquor, bottle),
    (amaretto, p_organization, 'Amaretto', cat_liquor, bottle),
    (red_bull, p_organization, 'Red Bull', cat_mix, each_u),
    (ranch, p_organization, 'Ranch', cat_food, each_u),
    (lemons, p_organization, 'Lemons', cat_food, each_u),
    (lime, p_organization, 'Limes', cat_food, each_u),
    (beer_case, p_organization, 'Domestic Beer (case)', cat_beer, case_u),
    (soda, p_organization, 'Club Soda', cat_mix, each_u),
    (chips, p_organization, 'Chips', cat_food, each_u);

  insert into itemsure.item_contents (item_id, organization_id, content_ml) values
    (rum, p_organization, 750),
    (vodka, p_organization, 750),
    (whiskey, p_organization, 750),
    (gin, p_organization, 750),
    (tequila, p_organization, 750),
    (amaretto, p_organization, 750);

  insert into itemsure.item_piece_counts (item_id, organization_id, pieces, piece_label)
  values (beer_case, p_organization, 24, 'cans');

  insert into itemsure.item_suppliers (organization_id, item_id, supplier_id) values
    (p_organization, rum, supplier),
    (p_organization, vodka, supplier),
    (p_organization, beer_case, supplier);

  -- Levels: some low, some top-off-due under Usual (~1/5 span), most healthy.
  insert into itemsure.inventory_targets
    (organization_id, location_id, storage_area_id, item_id, minimum_quantity, par_quantity)
  values
    (p_organization, loc, bar, rum, 2, 6),
    (p_organization, loc, bar, vodka, 2, 6),
    (p_organization, loc, bar, whiskey, 1, 4),
    (p_organization, loc, bar, gin, 1, 4),
    (p_organization, loc, bar, tequila, 1, 4),
    (p_organization, loc, bar, amaretto, 2, 4),
    (p_organization, loc, bar, red_bull, 6, 24),
    (p_organization, loc, kitchen, ranch, 2, 8),
    (p_organization, loc, kitchen, lemons, 10, 40),
    (p_organization, loc, kitchen, lime, 10, 40),
    (p_organization, loc, bar, beer_case, 1, 4),
    (p_organization, loc, bar, soda, 4, 12),
    (p_organization, loc, kitchen, chips, 5, 20);

  -- Opening count (week ago) then closing count (yesterday).
  s1 := itemsure.start_count_session(loc, null, 'Demo opening');
  insert into itemsure.count_entries (session_id, item_id, storage_area_id, quantity, unit_id, client_anchor_at) values
    (s1, rum, bar, 6, bottle, t_open),
    (s1, vodka, bar, 5, bottle, t_open),
    (s1, whiskey, bar, 4, bottle, t_open),
    (s1, gin, bar, 3, bottle, t_open),
    (s1, tequila, bar, 3, bottle, t_open),
    (s1, amaretto, bar, 4, bottle, t_open),
    (s1, red_bull, bar, 24, each_u, t_open),
    (s1, ranch, kitchen, 8, each_u, t_open),
    (s1, lemons, kitchen, 40, each_u, t_open),
    (s1, lime, kitchen, 36, each_u, t_open),
    (s1, beer_case, bar, 4, case_u, t_open),
    (s1, soda, bar, 12, each_u, t_open),
    (s1, chips, kitchen, 20, each_u, t_open);
  -- Stamp entry times before approve so review cutoffs / movements use demo dates.
  -- (session_replication_role is not allowed on hosted Supabase.)
  alter table itemsure.count_entries disable trigger count_entries_guard;
  update itemsure.count_entries
    set updated_at = t_open, created_at = t_open, counted_from = t_open
    where session_id = s1;
  alter table itemsure.count_entries enable trigger count_entries_guard;
  perform itemsure.submit_count_session(s1, true);
  preview := itemsure.preview_count_approval(s1);
  perform itemsure.approve_count_session(s1, (preview ->> 'watermark')::bigint, true);
  alter table itemsure.count_sessions disable trigger count_sessions_guard;
  alter table itemsure.count_sessions disable trigger count_sessions_touch_updated_at;
  alter table itemsure.count_sessions disable trigger count_sessions_audit;
  update itemsure.count_sessions
    set submitted_at = t_open, started_at = t_open - interval '30 minutes', created_at = t_open - interval '40 minutes'
    where id = s1;
  alter table itemsure.count_sessions enable trigger count_sessions_guard;
  alter table itemsure.count_sessions enable trigger count_sessions_touch_updated_at;
  alter table itemsure.count_sessions enable trigger count_sessions_audit;
  update itemsure.count_reviews set decided_at = t_open + interval '5 minutes' where session_id = s1;

  -- Mock Clover menu + pours (written as definer; browsers cannot).
  insert into itemsure.pos_connections (
    organization_id, provider, environment, merchant_id, merchant_name, status,
    location_id, items_synced_at, connected_by
  ) values (
    p_organization, 'clover', 'sandbox', 'DEMO', 'Demo Clover', 'connected',
    loc, now(), uid
  );

  insert into itemsure.pos_items (organization_id, provider, external_id, name, category_name, price_cents) values
    (p_organization, 'clover', 'BTN_RUM', 'Rum & Coke', 'Cocktails', 900),
    (p_organization, 'clover', 'BTN_VODKA', 'Vodka Soda', 'Cocktails', 900),
    (p_organization, 'clover', 'BTN_WHISKEY', 'Whiskey Neat', 'Cocktails', 1000),
    (p_organization, 'clover', 'BTN_BEER', 'Domestic Beer', 'Beer', 500),
    (p_organization, 'clover', 'BTN_RB', 'Red Bull', 'Energy', 400),
    (p_organization, 'clover', 'BTN_NACHOS', 'Nachos', 'Food', 1200);

  insert into itemsure.pos_item_links (organization_id, provider, external_id, item_id, uses_amount, uses_unit) values
    (p_organization, 'clover', 'BTN_RUM', rum, 1.5, 'fl_oz'),
    (p_organization, 'clover', 'BTN_VODKA', vodka, 1.5, 'fl_oz'),
    (p_organization, 'clover', 'BTN_WHISKEY', whiskey, 2, 'fl_oz'),
    (p_organization, 'clover', 'BTN_BEER', beer_case, 1, 'piece'),
    (p_organization, 'clover', 'BTN_RB', red_bull, 1, 'base'),
    (p_organization, 'clover', 'BTN_NACHOS', chips, 1, 'base');

  insert into itemsure.pos_modifiers (organization_id, provider, modifier_id, name, action, extra_pours, item_id, uses_amount, uses_unit) values
    (p_organization, 'clover', 'MOD_DBL', 'Double', 'extra', 1, null, null, null),
    (p_organization, 'clover', 'MOD_ROCKS', 'Rocks', 'none', null, null, null, null),
    (p_organization, 'clover', 'MOD_RANCH', 'Ranch', 'item', null, ranch, 1, 'base');

  -- Hourly sales between opening and closing.
  h := date_trunc('hour', t_open + interval '2 hours');
  while h < t_close loop
    insert into itemsure.pos_sales_hourly (organization_id, provider, external_id, hour_start, quantity) values
      (p_organization, 'clover', 'BTN_RUM', h, 2 + (extract(hour from h)::int % 3)),
      (p_organization, 'clover', 'BTN_VODKA', h, 1 + (extract(hour from h)::int % 2)),
      (p_organization, 'clover', 'BTN_WHISKEY', h, 1),
      (p_organization, 'clover', 'BTN_BEER', h, 3 + (extract(hour from h)::int % 4)),
      (p_organization, 'clover', 'BTN_RB', h, 1),
      (p_organization, 'clover', 'BTN_NACHOS', h, case when extract(hour from h)::int in (18, 19, 20) then 2 else 0 end);
    insert into itemsure.pos_modifier_hourly (organization_id, provider, external_id, modifier_id, hour_start, quantity) values
      (p_organization, 'clover', 'BTN_RUM', 'MOD_DBL', h, case when extract(hour from h)::int % 5 = 0 then 1 else 0 end),
      (p_organization, 'clover', 'BTN_WHISKEY', 'MOD_ROCKS', h, 1),
      (p_organization, 'clover', 'BTN_NACHOS', 'MOD_RANCH', h, case when extract(hour from h)::int in (18, 19) then 1 else 0 end);
    h := h + interval '3 hours';
  end loop;

  insert into itemsure.pos_sales_syncs (organization_id, provider, from_at, to_at, order_count, line_count, synced_by, source)
  values (p_organization, 'clover', t_open - interval '1 hour', t_close + interval '1 hour', 120, 400, uid, 'manual');

  -- Closing amounts (used some stock; leave a few needing attention).
  s2 := itemsure.start_count_session(loc, null, 'Demo closing');
  insert into itemsure.count_entries (session_id, item_id, storage_area_id, quantity, unit_id, client_anchor_at) values
    (s2, rum, bar, 3.5, bottle, t_close),
    (s2, vodka, bar, 2.2, bottle, t_close),
    (s2, whiskey, bar, 2.8, bottle, t_close),
    (s2, gin, bar, 0.8, bottle, t_close),          -- running low (warn 1)
    (s2, tequila, bar, 2.5, bottle, t_close),
    (s2, amaretto, bar, 3.0, bottle, t_close),       -- under fill, can wait under Usual
    (s2, red_bull, bar, 8, each_u, t_close),         -- top-off-ish / low-ish
    (s2, ranch, kitchen, 5, each_u, t_close),
    (s2, lemons, kitchen, 14, each_u, t_close),      -- near top-off line
    (s2, lime, kitchen, 28, each_u, t_close),
    (s2, beer_case, bar, 2, case_u, t_close),
    (s2, soda, bar, 7, each_u, t_close),
    (s2, chips, kitchen, 12, each_u, t_close);
  alter table itemsure.count_entries disable trigger count_entries_guard;
  update itemsure.count_entries
    set updated_at = t_close, created_at = t_close, counted_from = t_close
    where session_id = s2;
  alter table itemsure.count_entries enable trigger count_entries_guard;
  perform itemsure.submit_count_session(s2, true);
  preview := itemsure.preview_count_approval(s2);
  perform itemsure.approve_count_session(s2, (preview ->> 'watermark')::bigint, true);
  alter table itemsure.count_sessions disable trigger count_sessions_guard;
  alter table itemsure.count_sessions disable trigger count_sessions_touch_updated_at;
  alter table itemsure.count_sessions disable trigger count_sessions_audit;
  update itemsure.count_sessions
    set submitted_at = t_close, started_at = t_close - interval '45 minutes', created_at = t_close - interval '50 minutes'
    where id = s2;
  alter table itemsure.count_sessions enable trigger count_sessions_guard;
  alter table itemsure.count_sessions enable trigger count_sessions_touch_updated_at;
  alter table itemsure.count_sessions enable trigger count_sessions_audit;
  update itemsure.count_reviews set decided_at = t_close + interval '5 minutes' where session_id = s2;
end;
$$;

comment on function itemsure.seed_demo_bar(uuid) is
  'Loads Demo Bar sample inventory, two approved counts, and mock Clover sales. Security definer.';

revoke all on function itemsure.seed_demo_bar(uuid) from public, anon, authenticated;

-- ── Public RPCs ─────────────────────────────────────────────────────────────

create or replace function itemsure.enter_demo()
returns uuid
language plpgsql
security definer
set search_path = itemsure, public
as $$
declare
  uid uuid := auth.uid();
  org uuid;
  slug text;
begin
  if uid is null then
    raise exception 'Sign in to try the Demo Bar.';
  end if;
  perform itemsure.ensure_profile();

  select o.id into org
  from itemsure.organizations as o
  join itemsure.organization_memberships as m
    on m.organization_id = o.id and m.user_id = uid and m.status = 'active'
  where o.is_demo and o.archived_at is null
  order by o.created_at
  limit 1;

  if org is null then
    slug := 'demo-' || substr(replace(uid::text, '-', ''), 1, 12);
    org := gen_random_uuid();
    insert into itemsure.organizations (id, name, slug, industry_type, is_demo, features)
    values (
      org,
      'Demo Bar',
      slug,
      'hospitality',
      true,
      '{"spots": true, "packaging": true, "transfers": true, "approvals": true, "details": false, "loose": false}'::jsonb
    );
    -- Owner membership comes from organizations_create_owner trigger.
    perform itemsure.seed_demo_bar(org);
  elsif not exists (
    select 1 from itemsure.locations where organization_id = org
  ) then
    -- Earlier seed failed after org create (or was wiped); finish loading sample.
    perform itemsure.seed_demo_bar(org);
  end if;

  return org;
end;
$$;

comment on function itemsure.enter_demo() is
  'Opens or creates the caller''s private Demo Bar and (re)loads sample data. Returns organization id.';

create or replace function itemsure.reset_demo(p_organization uuid)
returns uuid
language plpgsql
security definer
set search_path = itemsure, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sign in to reset the Demo Bar.';
  end if;
  if not exists (
    select 1
    from itemsure.organizations as o
    join itemsure.organization_memberships as m
      on m.organization_id = o.id and m.user_id = uid and m.status = 'active'
    where o.id = p_organization and o.is_demo
  ) then
    raise exception 'You can only reset your own Demo Bar.';
  end if;
  perform itemsure.seed_demo_bar(p_organization);
  return p_organization;
end;
$$;

comment on function itemsure.reset_demo(uuid) is
  'Wipes and reseeds the caller''s Demo Bar. Same organization id.';

revoke all on function itemsure.enter_demo() from public, anon;
revoke all on function itemsure.reset_demo(uuid) from public, anon;
grant execute on function itemsure.enter_demo() to authenticated;
grant execute on function itemsure.reset_demo(uuid) to authenticated;

notify pgrst, 'reload schema';
