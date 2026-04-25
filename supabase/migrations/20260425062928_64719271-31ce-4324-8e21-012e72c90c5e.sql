
-- Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Deduplicate ad_breakdown: keep the row with highest spend per (date, level, campaign_id, adset_id, ad_id)
DELETE FROM public.ad_breakdown a
USING public.ad_breakdown b
WHERE a.ctid < b.ctid
  AND a.date = b.date
  AND a.level = b.level
  AND COALESCE(a.campaign_id, '') = COALESCE(b.campaign_id, '')
  AND COALESCE(a.adset_id, '')    = COALESCE(b.adset_id, '')
  AND COALESCE(a.ad_id, '')       = COALESCE(b.ad_id, '');

-- 2. Drop the old (broken with NULLs) unique constraint if present and add a NULL-safe unique index
ALTER TABLE public.ad_breakdown
  DROP CONSTRAINT IF EXISTS ad_breakdown_date_level_campaign_id_adset_id_ad_id_key;

DROP INDEX IF EXISTS public.ad_breakdown_unique_idx;
CREATE UNIQUE INDEX ad_breakdown_unique_idx
  ON public.ad_breakdown (
    date,
    level,
    COALESCE(campaign_id, ''),
    COALESCE(adset_id, ''),
    COALESCE(ad_id, '')
  );

-- 3. Schedule sync-facebook-ads edge function every 15 minutes
-- Remove any existing job with the same name first
DO $$
BEGIN
  PERFORM cron.unschedule('auto-sync-facebook-ads');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-sync-facebook-ads',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rhayityejiqplymxounw.supabase.co/functions/v1/sync-facebook-ads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoYXlpdHllamlxcGx5bXhvdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTk4OTQsImV4cCI6MjA5MTI5NTg5NH0.KuJRqNh2oBQFznv79fda9B5JluQT7JDo5kd4kwQfpG8'
    ),
    body := jsonb_build_object('auto', true)
  ) AS request_id;
  $$
);
