-- Create month-level overrides table
CREATE TABLE public.monthly_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL UNIQUE, -- format: 'YYYY-MM'
  total_sales_count NUMERIC,
  total_revenue NUMERIC,
  ad_spend NUMERIC, -- raw ad spend (excl GST). spendWithGst computed as ad_spend * 1.18
  total_expenses NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage monthly_overrides"
ON public.monthly_overrides
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_monthly_overrides_updated_at
BEFORE UPDATE ON public.monthly_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();