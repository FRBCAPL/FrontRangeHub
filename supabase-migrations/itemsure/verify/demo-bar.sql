-- ItemSure: Demo Bar enter/reset. Apply 20261117000100_demo_bar.sql first.
-- One transaction, rolled back. Needs auth.users insert rights (same as other verify scripts).

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', 'd0111111-1111-4111-8111-111111111111'::uuid,
  'authenticated', 'authenticated', 'demo.owner@itemsure.test', '', now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo Owner","app":"itemsure"}'::jsonb,
  now(), now(), 'demo-confirm', 'demo-recovery', 'demo-change', '';

select set_config('request.jwt.claim.sub', 'd0111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"d0111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  org uuid;
  n integer;
  items1 integer;
begin
  org := itemsure.enter_demo();
  if org is null then raise exception 'CHECK: enter_demo returned null'; end if;
  if not (select is_demo from itemsure.organizations where id = org) then
    raise exception 'CHECK: org should be marked is_demo';
  end if;
  if not exists (
    select 1 from itemsure.organization_memberships
    where organization_id = org and user_id = 'd0111111-1111-4111-8111-111111111111' and role_code = 'owner'
  ) then
    raise exception 'CHECK: caller should be owner of Demo Bar';
  end if;

  select count(*) into items1 from itemsure.inventory_items where organization_id = org and is_active;
  if items1 < 10 then raise exception 'CHECK: expected sample items, got %', items1; end if;

  select count(*) into n from itemsure.pos_sales_hourly where organization_id = org;
  if n < 1 then raise exception 'CHECK: expected mock Clover sales'; end if;

  select count(*) into n from itemsure.count_reviews r
  join itemsure.count_sessions s on s.id = r.session_id
  where s.organization_id = org and r.decision = 'approved';
  if n < 2 then raise exception 'CHECK: expected two approved counts, got %', n; end if;

  if (select merchant_id from itemsure.pos_connections where organization_id = org) is distinct from 'DEMO' then
    raise exception 'CHECK: Demo Clover merchant_id should be DEMO';
  end if;

  -- Second enter returns same org and does not require reseed (still has items).
  if itemsure.enter_demo() is distinct from org then
    raise exception 'CHECK: enter_demo should return the existing Demo Bar';
  end if;

  -- Stock activity then reset (the case that used to fail on immutable count rows).
  perform itemsure.adjust_inventory(
    (select id from itemsure.locations where organization_id = org limit 1),
    (select id from itemsure.inventory_storage_areas where organization_id = org order by name limit 1),
    (select id from itemsure.inventory_items where organization_id = org and name = 'Vodka' limit 1),
    'add', 1, 'Demo verify receive'
  );
  perform itemsure.reset_demo(org);
  select count(*) into n from itemsure.inventory_items where organization_id = org and is_active;
  if n <> items1 then raise exception 'CHECK: reset should restore % items, got %', items1, n; end if;
  if exists (
    select 1 from itemsure.audit_events where organization_id = org and action = 'inventory.added'
  ) then
    raise exception 'CHECK: reset should clear demo audit history';
  end if;

  raise notice 'ItemSure Demo Bar checks passed.';
end;
$$;

rollback;
