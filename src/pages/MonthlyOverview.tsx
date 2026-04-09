import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";

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

  // Aggregate by month
  const monthlyMap = new Map<string, MonthRow>();
  adData?.forEach((r) => {
    const month = r.date.substring(0, 7); // YYYY-MM
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
      // We'll compute averages after
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

  // Compute derived metrics
  const monthlyRows = Array.from(monthlyMap.values()).map((m) => ({
    ...m,
    avg_ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
    avg_cpl: m.clicks > 0 ? m.ad_spend / m.clicks : 0,
    avg_cpr: m.conversions > 0 ? m.ad_spend / m.conversions : 0,
  })).sort((a, b) => b.month.localeCompare(a.month));

  // Monthly P&L
  const monthlyPL = monthlyRows.map((m) => {
    const monthSales = salesData?.filter((s) => s.date.substring(0, 7) === m.month) ?? [];
    const monthExpenses = expensesData?.filter((e) => e.date.substring(0, 7) === m.month) ?? [];
    const revenue = monthSales.reduce((s, r) => s + Number(r.total_amount), 0);
    const gst = monthSales.reduce((s, r) => s + Number(r.gst_collected), 0);
    const otherExp = monthExpenses.reduce((s, r) => s + Number(r.amount), 0);
    const profit = revenue - m.ad_spend - otherExp - gst;
    return { ...m, revenue, gst, otherExp, profit };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monthly Overview</h1>
        <p className="text-sm text-muted-foreground">Month-wise aggregated ad performance & P&L</p>
      </div>

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
                  <TableHead>Ad Spend</TableHead>
                  <TableHead>Other Expenses</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyPL.length > 0 ? monthlyPL.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell className="text-success">{formatINR(m.revenue)}</TableCell>
                    <TableCell className="text-destructive">{formatINR(m.ad_spend)}</TableCell>
                    <TableCell className="text-destructive">{formatINR(m.otherExp)}</TableCell>
                    <TableCell className="text-warning">{formatINR(m.gst)}</TableCell>
                    <TableCell className={m.profit >= 0 ? "text-success font-bold" : "text-destructive font-bold"}>
                      {formatINR(m.profit)}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
