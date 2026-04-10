
ALTER TABLE public.sales_entries
  ADD COLUMN usd_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN eur_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN usd_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN eur_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN usd_amount_inr numeric NOT NULL DEFAULT 0,
  ADD COLUMN eur_amount_inr numeric NOT NULL DEFAULT 0;
