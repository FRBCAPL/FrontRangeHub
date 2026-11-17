-- DO NOT RE-RUN: already applied, and newer files replace parts of it; re-running would undo them. Newer: consignment-auction-fixes-2026-10.sql (Buy It Now rule, auction board).
-- Auction phase A: tables, settings, and server-side bidding rules. No admin/public UI yet.
-- Rules mirror apps/consignment/frontend/src/utils/consignmentAuctionMath.js — keep in sync.
--   $25 listing fee · 15% commission on the final pre-tax price
--   opening bid = the seller's reserve (see consignment-auction-reserve-2026-10.sql); increments $5 under $500, $10 at $500+
--   2-minute soft close · Buy It Now disappears once the current bid reaches it · 7 days to pay at Legends
-- Run once in Supabase → SQL Editor, after the earlier consignment-*.sql files.

-- ── Settings ─────────────────────────────────────────────────────────────────
ALTER TABLE public.consignment_settings
  ADD COLUMN IF NOT EXISTS auction_commission_pct numeric(5, 2) NOT NULL DEFAULT 15
    CHECK (auction_commission_pct >= 0 AND auction_commission_pct < 100),
  ADD COLUMN IF NOT EXISTS auction_listing_fee numeric(12, 2) NOT NULL DEFAULT 25
    CHECK (auction_listing_fee >= 0),
  ADD COLUMN IF NOT EXISTS auction_default_days integer NOT NULL DEFAULT 7
    CHECK (auction_default_days > 0),
  ADD COLUMN IF NOT EXISTS auction_soft_close_minutes integer NOT NULL DEFAULT 2
    CHECK (auction_soft_close_minutes > 0),
  ADD COLUMN IF NOT EXISTS auction_payment_days integer NOT NULL DEFAULT 7
    CHECK (auction_payment_days > 0),
  ADD COLUMN IF NOT EXISTS auction_agreement_text text NOT NULL
    DEFAULT 'This is a placeholder until FRPL finalizes the online auction terms.';

-- ── Items: sale method ───────────────────────────────────────────────────────
ALTER TABLE public.consignment_items ADD COLUMN IF NOT EXISTS sale_method text NOT NULL DEFAULT 'fixed';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consignment_items_sale_method_check') THEN
    ALTER TABLE public.consignment_items
      ADD CONSTRAINT consignment_items_sale_method_check CHECK (sale_method IN ('fixed', 'auction'));
  END IF;
END $$;

-- Fixed-price listings still need a retail price; auctions don't have one.
ALTER TABLE public.consignment_items DROP CONSTRAINT IF EXISTS consignment_items_listed_needs_price;
ALTER TABLE public.consignment_items ADD CONSTRAINT consignment_items_listed_needs_price
  CHECK (sale_method = 'auction' OR status NOT IN ('available', 'sold') OR selling_price IS NOT NULL);

-- ── Fee kinds: allow auction fees (table created in consignment-fees-2026-10.sql) ──
ALTER TABLE public.consignment_fees DROP CONSTRAINT IF EXISTS consignment_fees_kind_check;
ALTER TABLE public.consignment_fees ADD CONSTRAINT consignment_fees_kind_check
  CHECK (kind IN ('consignment', 'renewal', 'auction_listing', 'relist', 'other'));

-- ── Auctions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consignment_auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.consignment_items(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'live', 'ended_no_bids', 'awaiting_payment', 'paid', 'defaulted', 'cancelled'
  )),
  seller_min_payout numeric(12, 2) NOT NULL CHECK (seller_min_payout > 0),
  commission_pct numeric(5, 2) NOT NULL CHECK (commission_pct >= 0 AND commission_pct < 100),
  opening_bid numeric(12, 2) NOT NULL CHECK (opening_bid > 0),
  buy_now_price numeric(12, 2),
  listing_fee numeric(12, 2),
  starts_at timestamptz NOT NULL DEFAULT now(),
  scheduled_end_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  current_bid numeric(12, 2),
  current_bidder uuid REFERENCES auth.users(id),
  bid_count integer NOT NULL DEFAULT 0,
  winner_id uuid REFERENCES auth.users(id),
  winning_bid numeric(12, 2),
  won_via text CHECK (won_via IS NULL OR won_via IN ('bid', 'buy_now', 'second_chance')),
  won_at timestamptz,
  payment_due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (buy_now_price IS NULL OR buy_now_price > opening_bid),
  CHECK (ends_at >= starts_at)
);

-- One active auction per item at a time.
CREATE UNIQUE INDEX IF NOT EXISTS consignment_auctions_one_active
  ON public.consignment_auctions (item_id)
  WHERE status IN ('draft', 'live', 'awaiting_payment');
CREATE INDEX IF NOT EXISTS consignment_auctions_live_idx
  ON public.consignment_auctions (status, ends_at);

CREATE TABLE IF NOT EXISTS public.consignment_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.consignment_auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  is_buy_now boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consignment_bids_auction_idx
  ON public.consignment_bids (auction_id, amount DESC, created_at);

CREATE TABLE IF NOT EXISTS public.consignment_bidder_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  suspended boolean NOT NULL DEFAULT false,
  reason text,
  defaults_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consignment_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_bidder_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consignment_auctions_admin_all ON public.consignment_auctions;
CREATE POLICY consignment_auctions_admin_all ON public.consignment_auctions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin IS TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin IS TRUE));

DROP POLICY IF EXISTS consignment_bids_admin_all ON public.consignment_bids;
CREATE POLICY consignment_bids_admin_all ON public.consignment_bids
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin IS TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin IS TRUE));

-- Bidders can see their own bids. Bids are only ever inserted by place_consignment_bid / buy_now.
DROP POLICY IF EXISTS consignment_bids_own_read ON public.consignment_bids;
CREATE POLICY consignment_bids_own_read ON public.consignment_bids
  FOR SELECT TO authenticated
  USING (bidder_id = auth.uid());

DROP POLICY IF EXISTS consignment_bidder_status_admin_all ON public.consignment_bidder_status;
CREATE POLICY consignment_bidder_status_admin_all ON public.consignment_bidder_status
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin IS TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin IS TRUE));

DROP POLICY IF EXISTS consignment_bidder_status_own_read ON public.consignment_bidder_status;
CREATE POLICY consignment_bidder_status_own_read ON public.consignment_bidder_status
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignment_auctions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignment_bids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignment_bidder_status TO authenticated;

-- ── Math ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consignment_bid_increment(p_amount numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN p_amount < 500 THEN 5 ELSE 10 END::numeric;
$$;

CREATE OR REPLACE FUNCTION public.consignment_auction_opening_bid(p_min numeric, p_pct numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  raw numeric;
  inc numeric;
BEGIN
  IF p_min IS NULL OR p_min <= 0 OR p_pct IS NULL OR p_pct < 0 OR p_pct >= 100 THEN
    RETURN 0;
  END IF;
  raw := p_min * 100 / (100 - p_pct);
  inc := consignment_bid_increment(raw);
  RETURN ceil(round(raw / inc, 6)) * inc;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consignment_bid_increment(numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consignment_auction_opening_bid(numeric, numeric) TO anon, authenticated;

-- ── Closing ──────────────────────────────────────────────────────────────────
-- Closes one auction if it is live and past its end. Internal; called by the functions below.
CREATE OR REPLACE FUNCTION public.consignment_close_auction(p_auction_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.consignment_auctions%ROWTYPE;
  pay_days integer;
BEGIN
  SELECT * INTO a FROM public.consignment_auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF a.status <> 'live' OR a.ends_at > now() THEN
    RETURN a.status;
  END IF;

  IF a.bid_count = 0 THEN
    UPDATE public.consignment_auctions
    SET status = 'ended_no_bids', updated_at = now()
    WHERE id = a.id;
    RETURN 'ended_no_bids';
  END IF;

  SELECT coalesce(auction_payment_days, 7) INTO pay_days FROM public.consignment_settings WHERE id = 'frpl';
  UPDATE public.consignment_auctions
  SET status = 'awaiting_payment',
      winner_id = a.current_bidder,
      winning_bid = a.current_bid,
      won_via = 'bid',
      won_at = a.ends_at,
      payment_due_at = a.ends_at + make_interval(days => coalesce(pay_days, 7)),
      updated_at = now()
  WHERE id = a.id;
  RETURN 'awaiting_payment';
END;
$$;

REVOKE ALL ON FUNCTION public.consignment_close_auction(uuid) FROM PUBLIC, anon, authenticated;

-- Closes every auction past its end. Safe for anyone to call; also scheduled below when pg_cron exists.
CREATE OR REPLACE FUNCTION public.close_due_consignment_auctions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.consignment_auctions
    WHERE status = 'live' AND ends_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.consignment_close_auction(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.close_due_consignment_auctions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_due_consignment_auctions() TO anon, authenticated;

-- ── Bidding ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.place_consignment_bid(p_auction_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  a public.consignment_auctions%ROWTYPE;
  soft_minutes integer;
  soft interval;
  min_next numeric(12, 2);
  v_amount numeric(12, 2);
  new_end timestamptz;
  bidder_email text;
  seller_email text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Log in to bid.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.consignment_bidder_status WHERE user_id = uid AND suspended) THEN
    RAISE EXCEPTION 'Your FRPL auction bidding is suspended. Contact FRPL.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Enter a valid bid amount.';
  END IF;
  v_amount := round(p_amount, 2);

  SELECT * INTO a FROM public.consignment_auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found.';
  END IF;

  -- Close it (and keep that change) instead of raising, which would roll the close back.
  IF a.status = 'live' AND a.ends_at <= now() THEN
    PERFORM public.consignment_close_auction(a.id);
    RETURN jsonb_build_object('ok', false, 'message', 'This auction has ended.');
  END IF;
  IF a.status <> 'live' THEN
    RAISE EXCEPTION 'This auction is not open for bidding.';
  END IF;
  IF a.starts_at > now() THEN
    RAISE EXCEPTION 'Bidding has not started yet.';
  END IF;
  IF a.current_bidder = uid THEN
    RAISE EXCEPTION 'You are already the high bidder.';
  END IF;

  SELECT lower(email) INTO bidder_email FROM auth.users WHERE id = uid;
  SELECT lower(email) INTO seller_email FROM public.consignment_sellers WHERE item_id = a.item_id;
  IF seller_email IS NOT NULL AND seller_email = bidder_email THEN
    RAISE EXCEPTION 'Sellers cannot bid on their own items.';
  END IF;

  min_next := CASE WHEN a.bid_count = 0 THEN a.opening_bid
                   ELSE a.current_bid + consignment_bid_increment(a.current_bid) END;
  IF v_amount < min_next THEN
    RAISE EXCEPTION 'Minimum bid is $%.', trim(to_char(min_next, 'FM999,999,990.00'));
  END IF;

  SELECT coalesce(auction_soft_close_minutes, 2) INTO soft_minutes FROM public.consignment_settings WHERE id = 'frpl';
  soft := make_interval(mins => coalesce(soft_minutes, 2));
  new_end := CASE WHEN a.ends_at - now() < soft THEN now() + soft ELSE a.ends_at END;

  INSERT INTO public.consignment_bids (auction_id, bidder_id, amount)
  VALUES (a.id, uid, v_amount);

  UPDATE public.consignment_auctions
  SET current_bid = v_amount,
      current_bidder = uid,
      bid_count = bid_count + 1,
      ends_at = new_end,
      updated_at = now()
  WHERE id = a.id;

  RETURN jsonb_build_object(
    'ok', true,
    'current_bid', v_amount,
    'ends_at', new_end,
    'extended', new_end <> a.ends_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.buy_now_consignment_auction(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  a public.consignment_auctions%ROWTYPE;
  pay_days integer;
  bidder_email text;
  seller_email text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Log in to use Buy It Now.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.consignment_bidder_status WHERE user_id = uid AND suspended) THEN
    RAISE EXCEPTION 'Your FRPL auction bidding is suspended. Contact FRPL.';
  END IF;

  SELECT * INTO a FROM public.consignment_auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found.';
  END IF;
  IF a.status = 'live' AND a.ends_at <= now() THEN
    PERFORM public.consignment_close_auction(a.id);
    RETURN jsonb_build_object('ok', false, 'message', 'This auction has ended.');
  END IF;
  IF a.status <> 'live' OR a.starts_at > now() THEN
    RAISE EXCEPTION 'This auction is not open.';
  END IF;
  IF a.buy_now_price IS NULL OR (a.bid_count > 0 AND a.current_bid >= a.buy_now_price) THEN
    RAISE EXCEPTION 'Buy It Now is no longer available.';
  END IF;

  SELECT lower(email) INTO bidder_email FROM auth.users WHERE id = uid;
  SELECT lower(email) INTO seller_email FROM public.consignment_sellers WHERE item_id = a.item_id;
  IF seller_email IS NOT NULL AND seller_email = bidder_email THEN
    RAISE EXCEPTION 'Sellers cannot buy their own items.';
  END IF;

  SELECT coalesce(auction_payment_days, 7) INTO pay_days FROM public.consignment_settings WHERE id = 'frpl';

  INSERT INTO public.consignment_bids (auction_id, bidder_id, amount, is_buy_now)
  VALUES (a.id, uid, a.buy_now_price, true);

  UPDATE public.consignment_auctions
  SET status = 'awaiting_payment',
      current_bid = a.buy_now_price,
      current_bidder = uid,
      bid_count = bid_count + 1,
      winner_id = uid,
      winning_bid = a.buy_now_price,
      won_via = 'buy_now',
      won_at = now(),
      ends_at = greatest(now(), a.starts_at),
      payment_due_at = now() + make_interval(days => coalesce(pay_days, 7)),
      updated_at = now()
  WHERE id = a.id;

  RETURN jsonb_build_object('ok', true, 'winning_bid', a.buy_now_price);
END;
$$;

REVOKE ALL ON FUNCTION public.place_consignment_bid(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buy_now_consignment_auction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_consignment_bid(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_now_consignment_auction(uuid) TO authenticated;

-- ── Public views (no bidder identities, no seller info) ─────────────────────
CREATE OR REPLACE VIEW public.consignment_auction_board AS
SELECT
  a.id,
  a.item_id,
  i.item_number,
  a.status,
  a.opening_bid,
  a.current_bid,
  a.bid_count,
  CASE WHEN a.status = 'live' AND a.buy_now_price IS NOT NULL
            AND (a.bid_count = 0 OR a.current_bid < a.buy_now_price)
       THEN a.buy_now_price END AS buy_now_price,
  CASE WHEN a.bid_count = 0 THEN a.opening_bid
       ELSE a.current_bid + public.consignment_bid_increment(a.current_bid) END AS min_next_bid,
  a.starts_at,
  a.scheduled_end_at,
  a.ends_at,
  a.winning_bid,
  a.won_via,
  a.won_at
FROM public.consignment_auctions a
JOIN public.consignment_items i ON i.id = a.item_id
WHERE a.status IN ('live', 'awaiting_payment', 'paid', 'ended_no_bids');

ALTER VIEW public.consignment_auction_board SET (security_invoker = false);
GRANT SELECT ON public.consignment_auction_board TO anon, authenticated;

-- Bidders are numbered per auction in the order they first bid ("Bidder 1", "Bidder 2", …).
CREATE OR REPLACE VIEW public.consignment_auction_bid_history AS
SELECT
  b.auction_id,
  b.amount,
  b.is_buy_now,
  b.created_at,
  'Bidder ' || dense_rank() OVER (PARTITION BY b.auction_id ORDER BY f.first_at, b.bidder_id) AS bidder_label
FROM public.consignment_bids b
JOIN (
  SELECT auction_id, bidder_id, min(created_at) AS first_at
  FROM public.consignment_bids
  GROUP BY auction_id, bidder_id
) f ON f.auction_id = b.auction_id AND f.bidder_id = b.bidder_id
JOIN public.consignment_auctions a ON a.id = b.auction_id
WHERE a.status IN ('live', 'awaiting_payment', 'paid', 'ended_no_bids', 'defaulted');

ALTER VIEW public.consignment_auction_bid_history SET (security_invoker = false);
GRANT SELECT ON public.consignment_auction_bid_history TO anon, authenticated;

-- Catalog: add sale_method (appended so existing columns keep their positions).
DROP VIEW IF EXISTS public.consignment_catalog;
CREATE VIEW public.consignment_catalog AS
SELECT
  id,
  item_number,
  inventory_type,
  category,
  name,
  brand,
  condition,
  description,
  specs,
  photo_urls,
  selling_price,
  status,
  sold_at,
  created_at,
  model,
  sale_method
FROM public.consignment_items
WHERE (status = 'available' AND (expires_at IS NULL OR expires_at > now()))
   OR (status = 'sold' AND sold_at > now() - interval '30 days');

ALTER VIEW public.consignment_catalog SET (security_invoker = false);
GRANT SELECT ON public.consignment_catalog TO anon, authenticated;

-- ── Payout guard: also protect items sent back to Pending after an auction ──
-- (Replaces the version in consignment-payouts-2026-10.sql. Any item that was ever accepted has intake_at.)
CREATE OR REPLACE FUNCTION public.consignment_items_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_payout < OLD.seller_payout
     AND (OLD.status <> 'pending' OR OLD.intake_at IS NOT NULL)
     AND coalesce(current_setting('frpl.payout_consent', true), '') <> 'on' THEN
    RAISE EXCEPTION 'The Seller Payout can only be lowered with the seller''s agreement. Use "Change payout" and record how they agreed.';
  END IF;

  IF NEW.status = 'sold'
     AND NEW.actual_selling_price IS NOT NULL
     AND NEW.actual_selling_price < NEW.seller_payout
     AND (OLD.status IS DISTINCT FROM 'sold'
          OR NEW.actual_selling_price IS DISTINCT FROM OLD.actual_selling_price
          OR NEW.seller_payout IS DISTINCT FROM OLD.seller_payout) THEN
    RAISE EXCEPTION 'Sale price $% is below the Seller Payout $%. Lower the payout with the seller''s agreement first.',
      NEW.actual_selling_price, NEW.seller_payout;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Scheduler: close due auctions every 5 minutes when pg_cron is enabled ───
-- (Database → Extensions → pg_cron. Without it, auctions still close when someone views or bids.)
-- Every-minute scheduling flooded cron.job_run_details; */5 is enough for shop timing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'consignment-close-auctions';
    PERFORM cron.schedule('consignment-close-auctions', '*/5 * * * *', 'SELECT public.close_due_consignment_auctions()');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
