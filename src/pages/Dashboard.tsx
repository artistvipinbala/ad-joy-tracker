import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { TrendingUp, TrendingDown, IndianRupee, ShoppingCart, Target, Percent } from "lucide-react";

export default function Dashboard() {
  const { data: adData } = useQuery({
    queryKey: ["ad-data-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_daily_data")
        .select("*")
        .order("date", { ascending: true });
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

  const totalSpend = adData?.reduce((s, r) => s + Number(r.ad_spend), 0) ?? 0;
  const totalRevenue = salesData?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
  const totalGST = salesData?.reduce((s, r) => s + Number(r.gst_collected), 0) ?? 0;
  const totalExpenses = expensesData?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const totalCost = totalSpend + totalExpenses;
  const netProfit = totalRevenue - totalCost - totalGST;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const totalSalesCount = salesData?.reduce((s, r) => s + r.quantity, 0) ?? 0;

  const chartData = adData?.map((d) => ({
    date: d.date,
    spend: Number(d.ad_spend),
    clicks: d.clicks,
    ctr: Number(d.ctr),
  })) ?? [];

  const summaryCards = [
    { title: "Total Ad Spend", value: formatINR(totalSpend), icon: IndianRupee, color: "text-destructive" },
    { title: "Total Sales", value: `${totalSalesCount} (${formatINR(totalRevenue)})`, icon: ShoppingCart, color: "text-success" },
    { title: "Net Profit", value: formatINR(netProfit), icon: netProfit >= 0 ? TrendingUp : TrendingDown, color: netProfit >= 0 ? "text-success" : "text-destructive" },
    { title: "ROAS", value: `${roas.toFixed(2)}x`, icon: Target, color: "text-primary" },
    { title: "GST Collected", value: formatINR(totalGST), icon: Percent, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your ad performance & profit</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Daily Ad Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="spend" fill="hsl(230, 70%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">CTR Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ctr" stroke="hsl(160, 60%, 45%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {(!adData || adData.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              ഡാറ്റ ഇല്ല! Daily Data page-ൽ പോയി Facebook ad data add ചെയ്യുക അല്ലെങ്കിൽ Settings-ൽ Facebook API connect ചെയ്യുക.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
