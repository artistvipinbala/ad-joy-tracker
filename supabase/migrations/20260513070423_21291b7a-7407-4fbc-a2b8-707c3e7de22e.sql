DROP INDEX IF EXISTS public.ad_breakdown_unique_idx;

ALTER TABLE public.ad_breakdown
  ADD CONSTRAINT ad_breakdown_unique_idx
  UNIQUE NULLS NOT DISTINCT (date, level, campaign_id, adset_id, ad_id);