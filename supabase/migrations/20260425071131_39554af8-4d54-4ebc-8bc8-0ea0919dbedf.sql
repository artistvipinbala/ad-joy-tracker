-- Remove duplicates first
DELETE FROM public.ad_breakdown a USING public.ad_breakdown b
WHERE a.id < b.id
  AND a.date = b.date
  AND a.level = b.level
  AND COALESCE(a.campaign_id, '') = COALESCE(b.campaign_id, '')
  AND COALESCE(a.adset_id, '') = COALESCE(b.adset_id, '')
  AND COALESCE(a.ad_id, '') = COALESCE(b.ad_id, '');

-- Add unique constraint matching the ON CONFLICT in sync-facebook-ads
ALTER TABLE public.ad_breakdown
  ADD CONSTRAINT ad_breakdown_unique_key
  UNIQUE (date, level, campaign_id, adset_id, ad_id);