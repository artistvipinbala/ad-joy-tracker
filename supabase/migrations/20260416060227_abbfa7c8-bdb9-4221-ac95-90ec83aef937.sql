
CREATE TABLE public.ad_breakdown (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  level text NOT NULL CHECK (level IN ('campaign', 'adset', 'ad')),
  campaign_id text,
  campaign_name text,
  adset_id text,
  adset_name text,
  ad_id text,
  ad_name text,
  spend numeric NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  cpc numeric NOT NULL DEFAULT 0,
  cpl numeric NOT NULL DEFAULT 0,
  cpr numeric NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  frequency numeric NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  three_second_views integer NOT NULL DEFAULT 0,
  fifty_percent_views integer NOT NULL DEFAULT 0,
  ninety_five_percent_views integer NOT NULL DEFAULT 0,
  status text DEFAULT 'ACTIVE',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(date, level, campaign_id, adset_id, ad_id)
);

ALTER TABLE public.ad_breakdown ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage ad_breakdown"
  ON public.ad_breakdown
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_ad_breakdown_date ON public.ad_breakdown(date);
CREATE INDEX idx_ad_breakdown_level ON public.ad_breakdown(level);
