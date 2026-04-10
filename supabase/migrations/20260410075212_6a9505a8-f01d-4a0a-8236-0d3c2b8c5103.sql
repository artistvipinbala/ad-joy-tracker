
-- Drop all existing public policies
DROP POLICY IF EXISTS "Allow all access to ad_daily_data" ON public.ad_daily_data;
DROP POLICY IF EXISTS "Allow all access to sales_entries" ON public.sales_entries;
DROP POLICY IF EXISTS "Allow all access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow all access to expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Allow all access to product_config" ON public.product_config;

-- Create authenticated-only policies for ad_daily_data
CREATE POLICY "Authenticated users can manage ad_daily_data"
  ON public.ad_daily_data FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Create authenticated-only policies for sales_entries
CREATE POLICY "Authenticated users can manage sales_entries"
  ON public.sales_entries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Create authenticated-only policies for expenses
CREATE POLICY "Authenticated users can manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Create authenticated-only policies for expense_categories
CREATE POLICY "Authenticated users can manage expense_categories"
  ON public.expense_categories FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Create authenticated-only policies for product_config
CREATE POLICY "Authenticated users can manage product_config"
  ON public.product_config FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
