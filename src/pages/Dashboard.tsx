import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/format";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, IndianRupee, ShoppingCart, Target, Percent, Wallet, CreditCard } from "lucide-react";
import { toast } from "sonner";

const PRICE_PER_SALE = 589;
const COMMISSION_RATE = 0.025; // 2.5%

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [editTotal, setEditTotal] = useState("");
  const [editGpay, setEditGpay] = useState("");

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

  const updateSalesMutation = useMutation({
    mutationFn: async ({ totalQty, gpayQty }: { totalQty: number; gpayQty: number }) => {
      const price = Number(productConfig?.price || 499);
      const gstRate = Number(productConfig?.gst_rate_percent || 18) / 100;
      const amountPerSale = price * (1 + gstRate);
      const totalAmount = amountPerSale * totalQty;
      const gstCollected = price * gstRate * totalQty;
      const today = new Date().toISOString().split("T")[0];

      await supabase.from("sales_entries").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (totalQty > 0) {
        const { error } = await supabase.from("sales_entries").insert({
          date: today,
          quantity: totalQty,
          gpay_quantity: gpayQty,
          amount_per_sale: amountPerSale,
          total_amount: totalAmount,
          gst_collected: gstCollected,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-all"] });
      setSalesDialogOpen(false);
      toast.success("Sales updated!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Calculations
  const totalSpendRaw = adData?.reduce((s, r) => s + Number(r.ad_spend), 0) ?? 0;
  const adGst = totalSpendRaw * 0.18;
  const totalSpendWithGst = totalSpendRaw + adGst;
  const totalSalesCount = salesData?.reduce((s, r) => s + r.quantity, 0) ?? 0;
  const totalGpayCount = salesData?.reduce((s, r) => s + (r.gpay_quantity ?? 0), 0) ?? 0;
  const totalUsdCount = salesData?.reduce((s, r) => s + (r.usd_quantity ?? 0), 0) ?? 0;
  const totalEurCount = salesData?.reduce((s, r) => s + (r.eur_quantity ?? 0), 0) ?? 0;
  const platformCount = totalSalesCount - totalGpayCount - totalUsdCount - totalEurCount;

  const totalRevenue = salesData?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
  const totalGST = salesData?.reduce((s, r) => s + Number(r.gst_collected), 0) ?? 0;
  const totalExpenses = expensesData?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const usdAmountTotal = salesData?.reduce((s, r) => s + Number(r.usd_amount_inr ?? 0), 0) ?? 0;
  const eurAmountTotal = salesData?.reduce((s, r) => s + Number(r.eur_amount_inr ?? 0), 0) ?? 0;

  const price = Number(productConfig?.price || 499);
  const gstRate = Number(productConfig?.gst_rate_percent || 18) / 100;
  const amountPerSale = price * (1 + gstRate);
  const commissionDeduction = platformCount * amountPerSale * COMMISSION_RATE + (usdAmountTotal + eurAmountTotal) * COMMISSION_RATE;
  const totalIncome = totalRevenue;
  const gstPayable = totalGST - adGst; // GST collected minus input credit from ads
  const netProfit = totalIncome - commissionDeduction - totalSpendWithGst - totalExpenses - gstPayable;
  const roas = totalSpendWithGst > 0 ? totalRevenue / totalSpendWithGst : 0;

  // Monthly summary from ad data
  const monthlyMap = new Map<string, { spend: number; clicks: number; impressions: number; reach: number }>();
  adData?.forEach((d) => {
    const month = d.date.substring(0, 7); // YYYY-MM
    const existing = monthlyMap.get(month) || { spend: 0, clicks: 0, impressions: 0, reach: 0 };
    existing.spend += Number(d.ad_spend);
    existing.clicks += d.clicks;
    existing.impressions += d.impressions;
    existing.reach += d.reach;
    monthlyMap.set(month, existing);
  });
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }));

  // Daily chart data combining ads + sales
  const dailyChartData = adData?.map((d) => {
    const daySales = salesData?.filter((s) => s.date === d.date) ?? [];
    const daySalesQty = daySales.reduce((s, r) => s + r.quantity, 0);
    const dayGpayQty = daySales.reduce((s, r) => s + (r.gpay_quantity ?? 0), 0);
    const dayPlatformQty = daySalesQty - dayGpayQty;
    const dayRevenue = daySalesQty * PRICE_PER_SALE;
    const dayCommission = dayPlatformQty * PRICE_PER_SALE * COMMISSION_RATE;
    const dayGST = daySales.reduce((s, r) => s + Number(r.gst_collected), 0);
    const daySpend = Number(d.ad_spend);
    const dayProfit = dayRevenue - dayCommission - daySpend - dayGST;

    return {
      date: d.date.substring(5), // MM-DD
      spend: daySpend,
      revenue: dayRevenue,
      profit: dayProfit,
    };
  }) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your ad performance & profit</p>
      </div>

      {/* Monthly Ad Spend Summary */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Monthly Ad Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Month</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Ad Spend</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">With GST</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Clicks</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Impressions</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Reach</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">CPC</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m) => (
                    <tr key={m.month} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{m.month}</td>
                      <td className="py-2 px-3 text-right text-destructive font-semibold">{formatINR(m.spend)}</td>
                      <td className="py-2 px-3 text-right text-destructive">{formatINR(m.spend * 1.18)}</td>
                      <td className="py-2 px-3 text-right">{m.clicks.toLocaleString("en-IN")}</td>
                      <td className="py-2 px-3 text-right">{m.impressions.toLocaleString("en-IN")}</td>
                      <td className="py-2 px-3 text-right">{m.reach.toLocaleString("en-IN")}</td>
                      <td className="py-2 px-3 text-right">{m.clicks > 0 ? formatINR(m.spend / m.clicks) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Ad Spend (excl GST)</CardTitle>
            <IndianRupee className="h-3.5 w-3.5 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-base font-bold text-destructive">{formatINR(totalSpendRaw)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Ad Spend (incl GST)</CardTitle>
            <CreditCard className="h-3.5 w-3.5 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-base font-bold text-destructive">{formatINR(totalSpendWithGst)}</p>
            <p className="text-[9px] text-muted-foreground">GST: {formatINR(adGst)}</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
          onClick={() => {
            setEditTotal(String(totalSalesCount));
            setEditGpay(String(totalGpayCount));
            setSalesDialogOpen(true);
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Total Sales</CardTitle>
            <ShoppingCart className="h-3.5 w-3.5 text-green-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-base font-bold text-green-600">{totalSalesCount}</p>
            <p className="text-[9px] text-muted-foreground">GPay: {totalGpayCount} • Click to edit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Total Income</CardTitle>
            <Wallet className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-base font-bold text-primary">{formatINR(totalIncome)}</p>
            <p className="text-[9px] text-muted-foreground">Commission: -{formatINR(commissionDeduction)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">Net Profit</CardTitle>
            {netProfit >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-600" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className={`text-base font-bold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{formatINR(netProfit)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">ROAS</CardTitle>
            <Target className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-base font-bold text-primary">{roas.toFixed(2)}x</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">GST Collected</CardTitle>
            <Percent className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-base font-bold text-amber-500">{formatINR(totalGST)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
            <CardTitle className="text-[11px] font-medium text-muted-foreground">GST Payable</CardTitle>
            <Percent className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className={`text-base font-bold ${gstPayable >= 0 ? "text-amber-500" : "text-green-600"}`}>{formatINR(gstPayable)}</p>
            <p className="text-[9px] text-muted-foreground">Collected - Ad GST Credit</p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Sales Dialog */}
      <Dialog open={salesDialogOpen} onOpenChange={setSalesDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Sales</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Total Sales Count</Label>
              <Input
                type="number"
                placeholder="Total sales..."
                value={editTotal}
                onChange={(e) => setEditTotal(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">GPay Direct Payments</Label>
              <Input
                type="number"
                placeholder="GPay count..."
                value={editGpay}
                onChange={(e) => setEditGpay(e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">No 2.5% commission on GPay payments</p>
            </div>
            {editTotal && Number(editTotal) > 0 && (
              <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Total Revenue</span>
                  <span className="font-semibold">{formatINR(Number(editTotal) * PRICE_PER_SALE)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform ({Number(editTotal) - Number(editGpay || 0)}) × 2.5%</span>
                  <span>-{formatINR((Number(editTotal) - Number(editGpay || 0)) * PRICE_PER_SALE * COMMISSION_RATE)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GPay ({Number(editGpay || 0)}) — no commission</span>
                  <span className="text-green-600">₹0</span>
                </div>
              </div>
            )}
            <Button
              onClick={() => {
                const total = Number(editTotal);
                const gpay = Number(editGpay || 0);
                if (total < 0 || gpay < 0 || gpay > total) {
                  toast.error("Invalid values");
                  return;
                }
                updateSalesMutation.mutate({ totalQty: total, gpayQty: gpay });
              }}
              disabled={updateSalesMutation.isPending}
            >
              {updateSalesMutation.isPending ? "Saving..." : "Update Sales"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Trend Line Chart */}
      {dailyChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Daily Trends — Spend vs Revenue vs Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="spend" name="Ad Spend" stroke="hsl(0, 72%, 55%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(145, 60%, 42%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(230, 70%, 55%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Data Table */}
      {adData && adData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Day-by-Day Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {["Date", "Ad Spend", "Clicks", "CTR", "CPL", "Impressions", "Reach", "Frequency"].map((h) => (
                      <th key={h} className="text-right py-2 px-2 text-muted-foreground font-medium first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adData.map((d) => (
                    <tr key={d.id} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="py-1.5 px-2 font-medium">{d.date}</td>
                      <td className="py-1.5 px-2 text-right text-destructive">{formatINR(Number(d.ad_spend))}</td>
                      <td className="py-1.5 px-2 text-right">{d.clicks}</td>
                      <td className="py-1.5 px-2 text-right">{Number(d.ctr).toFixed(2)}%</td>
                      <td className="py-1.5 px-2 text-right">{formatINR(Number(d.cpl))}</td>
                      <td className="py-1.5 px-2 text-right">{d.impressions.toLocaleString("en-IN")}</td>
                      <td className="py-1.5 px-2 text-right">{d.reach.toLocaleString("en-IN")}</td>
                      <td className="py-1.5 px-2 text-right">{Number(d.frequency).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
