import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { TrendingUp, TrendingDown, IndianRupee, ShoppingCart, Target, Percent, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [saleForm, setSaleForm] = useState({
    date: new Date().toISOString().split("T")[0],
    quantity: 1,
    amount_per_sale: 0,
    notes: "",
  });

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

  const addSaleMutation = useMutation({
    mutationFn: async () => {
      const price = saleForm.amount_per_sale || Number(productConfig?.price || 0);
      const gstRate = Number(productConfig?.gst_rate_percent || 18) / 100;
      const totalAmount = price * saleForm.quantity;
      const gstCollected = totalAmount * gstRate / (1 + gstRate);

      const { error } = await supabase.from("sales_entries").insert({
        date: saleForm.date,
        quantity: saleForm.quantity,
        amount_per_sale: price,
        total_amount: totalAmount,
        gst_collected: gstCollected,
        notes: saleForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-all"] });
      setSalesDialogOpen(false);
      setSaleForm({ date: new Date().toISOString().split("T")[0], quantity: 1, amount_per_sale: 0, notes: "" });
      toast.success("Sale added!");
    },
    onError: (e) => toast.error(e.message),
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
    { title: "Total Sales", value: `${totalSalesCount} (${formatINR(totalRevenue)})`, icon: ShoppingCart, color: "text-success", editable: true },
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
          <Card
            key={card.title}
            className={card.editable ? "cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" : ""}
            onClick={card.editable ? () => {
              setSaleForm({
                date: new Date().toISOString().split("T")[0],
                quantity: 1,
                amount_per_sale: Number(productConfig?.price || 0),
                notes: "",
              });
              setSalesDialogOpen(true);
            } : undefined}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className="flex items-center gap-1">
                {card.editable && <Plus className="h-3 w-3 text-muted-foreground" />}
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
              {card.editable && <p className="text-[10px] text-muted-foreground mt-1">Click to add sale</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Add Sale Dialog */}
      <Dialog open={salesDialogOpen} onOpenChange={setSalesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Add Sale</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={saleForm.date} onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input type="number" value={saleForm.quantity} onChange={(e) => setSaleForm({ ...saleForm, quantity: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount per sale (₹) {productConfig?.price ? `— Default: ₹${productConfig.price}` : ""}</Label>
              <Input type="number" value={saleForm.amount_per_sale} onChange={(e) => setSaleForm({ ...saleForm, amount_per_sale: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Input value={saleForm.notes} onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })} />
            </div>
            <Button onClick={() => addSaleMutation.mutate()} disabled={addSaleMutation.isPending}>
              {addSaleMutation.isPending ? "Saving..." : "Add Sale"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
