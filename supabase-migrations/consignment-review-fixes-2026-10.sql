-- Consignment fixes from the October review.
--  1. Seller contact details (name, phone, email) get length limits and a basic email check.
--     (consignment-length-guard-2026-10.sql checked columns that live on consignment_sellers, not items.)
--  2. Photo bucket: nobody can list every file anymore (pending / rejected submission photos included).
--     Photos still show everywhere through their public links. Admins see and delete everything;
--     sellers can see and delete only photos they uploaded (so removed listing photos get cleaned up).
--  3. Makes sure pg_cron closes ended auctions every 5 minutes (browsers no longer do it on every poll).
-- Run once in Supabase → SQL Editor, after the other consignment-*.sql files. Safe to re-run.

-- ── 1. Seller contact limits ──
CREATE OR REPLACE FUNCTION public.consignment_sellers_guard_contact()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.full_name := nullif(btrim(coalesce(NEW.full_name, '')), '');
  NEW.phone := nullif(btrim(coalesce(NEW.phone, '')), '');
  NEW.email := nullif(lower(btrim(coalesce(NEW.email, ''))), '');
  IF length(coalesce(NEW.full_name, '')) > 120 THEN
    RAISE EXCEPTION 'Keep your name under 120 characters.';
  END IF;
  IF length(coalesce(NEW.phone, '')) > 40 THEN
    RAISE EXCEPTION 'Keep the phone number under 40 characters.';
  END IF;
  IF length(coalesce(NEW.email, '')) > 200 THEN
    RAISE EXCEPTION 'Keep the email under 200 characters.';
  END IF;
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consignment_sellers_guard_contact ON public.consignment_sellers;
CREATE TRIGGER consignment_sellers_guard_contact
  BEFORE INSERT OR UPDATE OF full_name, phone, email ON public.consignment_sellers
  FOR EACH ROW EXECUTE FUNCTION public.consignment_sellers_guard_contact();

-- ── 2. Photo bucket ──
DROP POLICY IF EXISTS "Consignment photos are readable" ON storage.objects;
DROP POLICY IF EXISTS "Consignment photo owner or admin read" ON storage.objects;
CREATE POLICY "Consignment photo owner or admin read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'consignment-public'
    AND (owner_id = auth.uid()::text OR public.consignment_is_admin())
  );

DROP POLICY IF EXISTS "Consignment photo owner delete" ON storage.objects;
CREATE POLICY "Consignment photo owner delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'consignment-public' AND owner_id = auth.uid()::text);

-- ── 3. Close ended auctions every 5 minutes ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'consignment-close-auctions';
    PERFORM cron.schedule('consignment-close-auctions', '*/5 * * * *', 'SELECT public.close_due_consignment_auctions()');
  ELSE
    RAISE WARNING 'pg_cron is not enabled: ended auctions close only when someone opens the shop.';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Checks:
-- SELECT jobname, schedule FROM cron.job WHERE jobname LIKE 'consignment%';   -- incl. consignment-close-auctions at */5
-- SELECT tgname FROM pg_trigger WHERE tgname = 'consignment_sellers_guard_contact';   -- 1 row
