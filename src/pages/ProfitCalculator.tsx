import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function ProfitCalculator() {
  const { data: adData } = useQuery({
    queryKey: ["ad-data-all"],
    queryFn: async () => {
      const { data } = await supabase.from("ad_daily_data").select("*");
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

  const pieData = [
    { name: "Ad Spend", value: totalSpend },
    { name: "Other Expenses", value: totalExpenses },
    { name: "GST Payable", value: totalGST },
    { name: "Net Profit", value: Math.max(0, netProfit) },
  ].filter((d) => d.value > 0);

  const COLORS = ["hsl(0, 72%, 55%)", "hsl(38, 92%, 50%)", "hsl(280, 60%, 55%)", "hsl(145, 60%, 42%)"];

  const rows = [
    { label: "Total Revenue (Sales)", value: totalRevenue, type: "revenue" },
    { label: "Ad Spend", value: -totalSpend, type: "cost" },
    { label: "Other Expenses", value: -totalExpenses, type: "cost" },
    { label: "GST Payable", value: -totalGST, type: "cost" },
    { label: "Net Profit", value: netProfit, type: "result" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profit Calculator</h1>
        <p className="text-sm text-muted-foreground">Revenue - Costs - GST = Net Profit</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">P&L Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.label} className={`flex justify-between items-center py-2 ${r.type === "result" ? "border-t-2 border-border pt-3 mt-2" : ""}`}>
                  <span className={`text-sm ${r.type === "result" ? "font-bold" : ""}`}>{r.label}</span>
                  <span className={`font-mono font-semibold ${
                    r.type === "revenue" ? "text-success" : 
                    r.type === "cost" ? "text-destructive" : 
                    r.value >= 0 ? "text-success" : "text-destructive"
                  }`}>
                    {r.value >= 0 ? "+" : ""}{formatINR(r.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cost Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
