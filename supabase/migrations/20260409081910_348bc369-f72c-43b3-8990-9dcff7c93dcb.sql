
-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to expense_categories" ON public.expense_categories FOR ALL USING (true) WITH CHECK (true);

-- Create product config table
CREATE TABLE public.product_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  gst_rate_percent NUMERIC NOT NULL DEFAULT 18,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to product_config" ON public.product_config FOR ALL USING (true) WITH CHECK (true);

-- Create ad daily data table
CREATE TABLE public.ad_daily_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  ad_spend NUMERIC NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC NOT NULL DEFAULT 0,
  cpl NUMERIC NOT NULL DEFAULT 0,
  cpr NUMERIC NOT NULL DEFAULT 0,
  cpc NUMERIC NOT NULL DEFAULT 0,
  three_second_views INTEGER NOT NULL DEFAULT 0,
  fifty_percent_views INTEGER NOT NULL DEFAULT 0,
  ninety_five_percent_views INTEGER NOT NULL DEFAULT 0,
  frequency NUMERIC NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_daily_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ad_daily_data" ON public.ad_daily_data FOR ALL USING (true) WITH CHECK (true);

-- Create sales entries table
CREATE TABLE public.sales_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount_per_sale NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  gst_collected NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sales_entries" ON public.sales_entries FOR ALL USING (true) WITH CHECK (true);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers
CREATE TRIGGER update_ad_daily_data_updated_at BEFORE UPDATE ON public.ad_daily_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_config_updated_at BEFORE UPDATE ON public.product_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description) VALUES
  ('AI Tools', 'ChatGPT, Gemini, and other AI subscriptions'),
  ('Software', 'Software subscriptions and tools'),
  ('Team', 'Team salaries and payments'),
  ('Content', 'Content creation costs'),
  ('Other', 'Miscellaneous expenses');
