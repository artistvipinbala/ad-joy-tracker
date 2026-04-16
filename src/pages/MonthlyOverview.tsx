import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import { TrendingUp, TrendingDown, IndianRupee, ShoppingCart, Wallet, Target, Percent } from "lucide-react";
import ProfitBreakdown from "@/components/ProfitBreakdown";

const COMMISSION_RATE = 0.025;

interface MonthRow {
  month: string;
  ad_spend: number;
  impressions: number;
  clicks: number;
  avg_ctr: number;
  avg_cpl: number;
  avg_cpr: number;
  avg_frequency: number;
  total_reach: number;
  conversions: number;
  three_second_views: number;
  fifty_percent_views: number;
  ninety_five_percent_views: number;
}

export default function MonthlyOverview() {
  const { data: productConfig } = useQuery({
    queryKey: ["product-config"],
    queryFn: async () => {
      const { data } = await supabase.from("product_config").select("*").eq("is_active", true).limit(1).single();
      return data;
    },
  });

  const { data: adData } = useQuery({
    queryKey: ["ad-data-all"],
    queryFn: async () => {
      const { data } = await supabase.from("ad_daily_data").select("*").order("date", { ascending: true });
      return data ?? [];
    },
  });

  const { data: salesData } = useQuery({
    queryKey: ["sales-all"],
    queryFn: async () => {
      const { data } = await supabase.from("sales_entries").select("*");
      return data ?? [];
    },
  });

  const { data: expensesData } = useQuery({
    queryKey: ["expenses-all"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*");
      return data ?? [];
    },
  });

  const price = Number(productConfig?.price || 499);
  const gstRate = Number(productConfig?.gst_rate_percent || 18) / 100;
  const amountPerSale = price * (1 + gstRate);

  // Aggregate by month
  const monthlyMap = new Map<string, MonthRow>();
  adData?.forEach((r) => {
    const month = r.date.substring(0, 7);
    const existing = monthlyMap.get(month);
    if (existing) {
      existing.ad_spend += Number(r.ad_spend);
      existing.impressions += r.impressions;
      existing.clicks += r.clicks;
      existing.conversions += r.conversions;
      existing.total_reach += r.reach;
      existing.three_second_views += r.three_second_views;
      existing.fifty_percent_views += r.fifty_percent_views;
      existing.ninety_five_percent_views += r.ninety_five_percent_views;
    } else {
      monthlyMap.set(month, {
        month,
        ad_spend: Number(r.ad_spend),
        impressions: r.impressions,
        clicks: r.clicks,
        avg_ctr: 0, avg_cpl: 0, avg_cpr: 0, avg_frequency: 0,
        total_reach: r.reach,
        conversions: r.conversions,
        three_second_views: r.three_second_views,
        fifty_percent_views: r.fifty_percent_views,
        ninety_five_percent_views: r.ninety_five_percent_views,
      });
    }
  });

  const monthlyRows = Array.from(monthlyMap.values()).map((m) => ({
    ...m,
    avg_ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
    avg_cpl: m.clicks > 0 ? m.ad_spend / m.clicks : 0,
    avg_cpr: m.conversions > 0 ? m.ad_spend / m.conversions : 0,
  })).sort((a, b) => b.month.localeCompare(a.month));

  // Monthly P&L with proper formula matching Dashboard
  const monthlyPL = monthlyRows.map((m) => {
    const monthSales = salesData?.filter((s) => s.date.substring(0, 7) === m.month) ?? [];
    const monthExpenses = expensesData?.filter((e) => e.date.substring(0, 7) === m.month) ?? [];

    const totalSalesCount = monthSales.reduce((s, r) => s + r.quantity, 0);
    const totalGpayCount = monthSales.reduce((s, r) => s + (r.gpay_quantity ?? 0), 0);
    const totalUsdCount = monthSales.reduce((s, r) => s + (r.usd_quantity ?? 0), 0);
    const totalEurCount = monthSales.reduce((s, r) => s + (r.eur_quantity ?? 0), 0);
    const platformCount = totalSalesCount - totalGpayCount - totalUsdCount - totalEurCount;

    const totalRevenue = monthSales.reduce((s, r) => s + Number(r.total_amount), 0);
    const totalGST = monthSales.reduce((s, r) => s + Number(r.gst_collected), 0);
    const usdAmountTotal = monthSales.reduce((s, r) => s + Number(r.usd_amount_inr ?? 0), 0);
    const eurAmountTotal = monthSales.reduce((s, r) => s + Number(r.eur_amount_inr ?? 0), 0);
    const totalExpenses = monthExpenses.reduce((s, r) => s + Number(r.amount), 0);

    const adGst = m.ad_spend * 0.18;
    const spendWithGst = m.ad_spend + adGst;
    const commissionDeduction = platformCount * amountPerSale * COMMISSION_RATE + (usdAmountTotal + eurAmountTotal) * COMMISSION_RATE;
    const gstPayable = totalGST - adGst;
    const netProfit = totalRevenue - commissionDeduction - spendWithGst - totalExpenses - gstPayable;
    const roas = spendWithGst > 0 ? totalRevenue / spendWithGst : 0;

    return {
      ...m,
      totalSalesCount, totalGpayCount, totalUsdCount, totalEurCount, platformCount,
      totalRevenue, totalGST, usdAmountTotal, eurAmountTotal, totalExpenses,
      adGst, spendWithGst, commissionDeduction, gstPayable, netProfit, roas,
    };
  });

  // All-time totals for the profit breakdown
  const allTimeSpendRaw = adData?.reduce((s, r) => s + Number(r.ad_spend), 0) ?? 0;
  const allTimeAdGst = allTimeSpendRaw * 0.18;
  const allTimeSpendWithGst = allTimeSpendRaw + allTimeAdGst;
  const allTimeSalesCount = salesData?.reduce((s, r) => s + r.quantity, 0) ?? 0;
  const allTimeGpay = salesData?.reduce((s, r) => s + (r.gpay_quantity ?? 0), 0) ?? 0;
  const allTimeUsd = salesData?.reduce((s, r) => s + (r.usd_quantity ?? 0), 0) ?? 0;
  const allTimeEur = salesData?.reduce((s, r) => s + (r.eur_quantity ?? 0), 0) ?? 0;
  const allTimePlatform = allTimeSalesCount - allTimeGpay - allTimeUsd - allTimeEur;
  const allTimeRevenue = salesData?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
  const allTimeGST = salesData?.reduce((s, r) => s + Number(r.gst_collected), 0) ?? 0;
  const allTimeUsdInr = salesData?.reduce((s, r) => s + Number(r.usd_amount_inr ?? 0), 0) ?? 0;
  const allTimeEurInr = salesData?.reduce((s, r) => s + Number(r.eur_amount_inr ?? 0), 0) ?? 0;
  const allTimeExpenses = expensesData?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const allTimeCommission = allTimePlatform * amountPerSale * COMMISSION_RATE + (allTimeUsdInr + allTimeEurInr) * COMMISSION_RATE;
  const allTimeGstPayable = allTimeGST - allTimeAdGst;
  const allTimeNetProfit = allTimeRevenue - allTimeCommission - allTimeSpendWithGst - allTimeExpenses - allTimeGstPayable;
  const allTimeRoas = allTimeSpendWithGst > 0 ? allTimeRevenue / allTimeSpendWithGst : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monthly Overview</h1>
        <p className="text-sm text-muted-foreground">Month-wise aggregated ad performance & P&L (All Time)</p>
      </div>

      {/* All-Time Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Total Ad Spend</CardTitle>
            <IndianRupee className="h-3.5 w-3.5 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-base font-bold text-destructive">{formatINR(allTimeSpendWithGst)}</p>
            <p className="text-[9px] text-muted-foreground">Excl GST: {formatINR(allTimeSpendRaw)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Total Sales</CardTitle>
            <ShoppingCart className="h-3.5 w-3.5 text-green-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-base font-bold text-green-600">{allTimeSalesCount}</p>
            <p className="text-[9px] text-muted-foreground">GPay: {allTimeGpay} • USD: {allTimeUsd} • EUR: {allTimeEur}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Total Revenue</CardTitle>
            <Wallet className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-base font-bold text-primary">{formatINR(allTimeRevenue)}</p>
            <p className="text-[9px] text-muted-foreground">Comm: -{formatINR(allTimeCommission)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Net Profit</CardTitle>
            {allTimeNetProfit >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-600" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className={`text-base font-bold ${allTimeNetProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{formatINR(allTimeNetProfit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">ROAS</CardTitle>
            <Target className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-base font-bold text-primary">{allTimeRoas.toFixed(2)}x</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">GST Payable</CardTitle>
            <Percent className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className={`text-base font-bold ${allTimeGstPayable >= 0 ? "text-amber-500" : "text-green-600"}`}>{formatINR(allTimeGstPayable)}</p>
          </CardContent>
        </Card>
      </div>

      {/* All-Time Profit Breakdown */}
      <ProfitBreakdown
        totalRevenue={allTimeRevenue}
        totalSalesCount={allTimeSalesCount}
        totalGpayCount={allTimeGpay}
        totalUsdCount={allTimeUsd}
        totalEurCount={allTimeEur}
        platformCount={allTimePlatform}
        amountPerSale={amountPerSale}
        usdAmountTotal={allTimeUsdInr}
        eurAmountTotal={allTimeEurInr}
        commissionDeduction={allTimeCommission}
        totalSpendRaw={allTimeSpendRaw}
        adGst={allTimeAdGst}
        totalSpendWithGst={allTimeSpendWithGst}
        totalGST={allTimeGST}
        gstPayable={allTimeGstPayable}
        totalExpenses={allTimeExpenses}
        netProfit={allTimeNetProfit}
        price={price}
        gstRate={gstRate}
        commissionRate={COMMISSION_RATE}
      />

      {/* Monthly Ad Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monthly Ad Metrics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>CPL</TableHead>
                  <TableHead>CPR</TableHead>
                  <TableHead>3s Views</TableHead>
                  <TableHead>50%</TableHead>
                  <TableHead>95%</TableHead>
                  <TableHead>Reach</TableHead>
                  <TableHead>Conv</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyRows.length > 0 ? monthlyRows.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell>{formatINR(m.ad_spend)}</TableCell>
                    <TableCell>{formatNumber(m.impressions)}</TableCell>
                    <TableCell>{formatNumber(m.clicks)}</TableCell>
                    <TableCell>{formatPercent(m.avg_ctr)}</TableCell>
                    <TableCell>{formatINR(m.avg_cpl)}</TableCell>
                    <TableCell>{formatINR(m.avg_cpr)}</TableCell>
                    <TableCell>{formatNumber(m.three_second_views)}</TableCell>
                    <TableCell>{formatNumber(m.fifty_percent_views)}</TableCell>
                    <TableCell>{formatNumber(m.ninety_five_percent_views)}</TableCell>
                    <TableCell>{formatNumber(m.total_reach)}</TableCell>
                    <TableCell>{m.conversions}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly P&L Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monthly Profit & Loss</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Ad Spend (incl GST)</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Other Expenses</TableHead>
                  <TableHead>GST Payable</TableHead>
                  <TableHead>Net Profit</TableHead>
                  <TableHead>ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyPL.length > 0 ? monthlyPL.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell className="text-green-600">{formatINR(m.totalRevenue)}</TableCell>
                    <TableCell className="text-destructive">{formatINR(m.spendWithGst)}</TableCell>
                    <TableCell className="text-destructive">{formatINR(m.commissionDeduction)}</TableCell>
                    <TableCell className="text-destructive">{formatINR(m.totalExpenses)}</TableCell>
                    <TableCell className="text-amber-500">{formatINR(m.gstPayable)}</TableCell>
                    <TableCell className={m.netProfit >= 0 ? "text-green-600 font-bold" : "text-destructive font-bold"}>
                      {formatINR(m.netProfit)}
                    </TableCell>
                    <TableCell className="text-primary font-medium">{m.roas.toFixed(2)}x</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}