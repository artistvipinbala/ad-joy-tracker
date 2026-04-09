

## Facebook Ad Analytics Portal - Plan

### Overview
A data analytics dashboard to track Facebook Ad performance, sales, expenses, and profit — with AI-powered recommendations.

### Pages & Features

#### 1. Dashboard (Home)
- **Summary cards**: Total Spend, Total Sales, Total Profit, ROAS (Return on Ad Spend)
- **Today's snapshot**: Quick view of today's key metrics
- **Profit chart**: Daily/weekly/monthly profit trend line
- **GST collected display** (separate from profit)

#### 2. Daily Ad Data (Table View)
- Table with daily rows showing: Date, Ad Spend, Impressions, Clicks, CTR, CPL, CPR, CPC, 3-Second Views, 50% Video Views, 95% Video Views, Frequency, Reach, Sales Count, Revenue
- **Date range filter** and single-day picker
- Auto-fetch from **Facebook Marketing API** (requires Facebook Business account credentials)
- Edit/override capability for any row

#### 3. Monthly Overview
- Aggregated monthly table with same metrics
- Month-over-month comparison
- Monthly profit/loss breakdown including: Ad Spend, GST collected, Other expenses, Net Profit

#### 4. Expenses & Revenue Entry
- **Manual entry form** for:
  - TagMango sales (count, amount per sale, GST collected)
  - Other expenses: AI tools, software subscriptions, team costs, etc.
  - Custom expense categories (add/edit)
- Product/service price configuration with GST rate
- Expense history table

#### 5. Profit Calculator
- **Revenue**: Sales × Price
- **Costs**: Ad Spend + Other Expenses
- **GST**: Track collected GST separately
- **Net Profit**: Revenue - Costs - GST payable
- Visual profit breakdown (pie/bar charts)

#### 6. AI Advisor
- AI-powered analysis of your ad performance data
- Recommendations: scale/pause campaigns, budget adjustments, audience insights
- Ask questions about your data in natural language
- Powered by Lovable AI (Gemini)

### Tech Stack
- **Frontend**: React + Tailwind + Recharts for charts
- **Backend**: Lovable Cloud (Supabase) for data storage
- **Facebook API**: Edge function to fetch ad data via Facebook Marketing API
- **AI**: Lovable AI Gateway for recommendations
- **Currency**: INR (₹) throughout

### Database Tables
- `ad_daily_data` — daily Facebook ad metrics
- `sales_entries` — manual TagMango sales entries
- `expenses` — other costs (AI tools, subscriptions, etc.)
- `expense_categories` — custom categories
- `product_config` — product prices and GST rates

