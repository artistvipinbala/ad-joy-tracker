import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import {
  TrendingUp, TrendingDown, IndianRupee, ShoppingCart, Wallet, Target, Percent,
  Pencil, ChevronDown, ChevronRight, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import ProfitBreakdown from "@/components/ProfitBreakdown";

const COMMISSION_RATE = 0.025;

export default function MonthlyOverview() {
  const queryClient = useQueryClient();
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Sales dialog state
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [salesDate, setSalesDate] = useState("");
  const [salesTotal, setSalesTotal] = useState("");
  const [salesGpay, setSalesGpay] = useState("");
  const [salesUsd, setSalesUsd] = useState("");
  const [salesEur, setSalesEur] = useState("");
  const [usdRate, setUsdRate] = useState(0);
  const [eurRate, setEurRate] = useState(0);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [editSalesId, setEditSalesId] = useState<string | null>(null);
  const [salesMonth, setSalesMonth] = useState("");

  // Expense dialog state
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);

  // Monthly override dialog state
  const [monthlyEditOpen, setMonthlyEditOpen] = useState(false);
  const [editMonth, setEditMonth] = useState("");
  const [editSalesCount, setEditSalesCount] = useState("");
  const [editRevenue, setEditRevenue] = useState("");
  const [editAdSpendRaw, setEditAdSpendRaw] = useState("");
  const [editExpensesTotal, setEditExpensesTotal] = useState("");

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
      const { data } = await supabase.from("sales_entries").select("*").order("date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: expensesData } = useQuery({
    queryKey: ["expenses-all"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").order("date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: overridesData } = useQuery({
    queryKey: ["monthly-overrides"],
    queryFn: async () => {
      const { data } = await supabase.from("monthly_overrides").select("*");
      return data ?? [];
    },
  });

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel("monthly-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_daily_data" }, () => {
        queryClient.invalidateQueries({ queryKey: ["ad-data-all"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_entries" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sales-all"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        queryClient.invalidateQueries({ queryKey: ["expenses-all"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_overrides" }, () => {
        queryClient.invalidateQueries({ queryKey: ["monthly-overrides"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const price = Number(productConfig?.price || 499);
  const gstRate = Number(productConfig?.gst_rate_percent || 18) / 100;
  const amountPerSale = price * (1 + gstRate);

  // --- Mutations ---
  const salesMutation = useMutation({
    mutationFn: async (params: {
      date: string; quantity: number; gpayQty: number;
      usdQty: number; eurQty: number; usdRate: number; eurRate: number;
      existingId?: string | null;
    }) => {
      const inrQty = params.quantity - params.gpayQty - params.usdQty - params.eurQty;
      const totalAmountInr = inrQty * amountPerSale + params.gpayQty * amountPerSale;
      const usdAmountInr = params.usdQty * 7 * params.usdRate;
      const eurAmountInr = params.eurQty * 7 * params.eurRate;
      const gstCollected = price * gstRate * (params.quantity - params.usdQty - params.eurQty);

      const record = {
        date: params.date,
        quantity: params.quantity,
        gpay_quantity: params.gpayQty,
        usd_quantity: params.usdQty,
        eur_quantity: params.eurQty,
        usd_rate: params.usdRate,
        eur_rate: params.eurRate,
        usd_amount_inr: usdAmountInr,
        eur_amount_inr: eurAmountInr,
        amount_per_sale: amountPerSale,
        total_amount: totalAmountInr + usdAmountInr + eurAmountInr,
        gst_collected: gstCollected,
      };

      if (params.existingId) {
        const { error } = await supabase.from("sales_entries").update(record).eq("id", params.existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sales_entries").insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-all"] });
      setSalesDialogOpen(false);
      toast.success("Sales saved!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSalesMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-all"] });
      toast.success("Sales entry deleted!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const expenseMutation = useMutation({
    mutationFn: async (params: { date: string; amount: number; description: string; existingId?: string | null }) => {
      const record = { date: params.date, amount: params.amount, description: params.description };
      if (params.existingId) {
        const { error } = await supabase.from("expenses").update(record).eq("id", params.existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses-all"] });
      setExpenseDialogOpen(false);
      toast.success("Expense saved!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses-all"] });
      toast.success("Expense deleted!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const overrideMutation = useMutation({
    mutationFn: async (params: {
      month: string;
      total_sales_count: number | null;
      total_revenue: number | null;
      ad_spend: number | null;
      total_expenses: number | null;
    }) => {
      const existing = overridesData?.find((o) => o.month === params.month);
      if (existing) {
        const { error } = await supabase.from("monthly_overrides").update({
          total_sales_count: params.total_sales_count,
          total_revenue: params.total_revenue,
          ad_spend: params.ad_spend,
          total_expenses: params.total_expenses,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("monthly_overrides").insert({
          month: params.month,
          total_sales_count: params.total_sales_count,
          total_revenue: params.total_revenue,
          ad_spend: params.ad_spend,
          total_expenses: params.total_expenses,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-overrides"] });
      setMonthlyEditOpen(false);
      toast.success("Monthly totals saved!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearOverrideMutation = useMutation({
    mutationFn: async (month: string) => {
      const existing = overridesData?.find((o) => o.month === month);
      if (!existing) return;
      const { error } = await supabase.from("monthly_overrides").delete().eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-overrides"] });
      toast.success("Monthly override cleared — using daily data");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Helpers ---
  const fetchExchangeRates = async (date: string) => {
    setFetchingRates(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-exchange-rates", { body: { date } });
      if (error) throw error;
      setUsdRate(data.usd_to_inr || 0);
      setEurRate(data.eur_to_inr || 0);
    } catch (e: any) {
      toast.error("Rate fetch failed: " + (e.message || "Unknown error"));
    } finally {
      setFetchingRates(false);
    }
  };

  const openAddSales = (month: string) => {
    setSalesMonth(month);
    setSalesDate(`${month}-01`);
    setSalesTotal(""); setSalesGpay(""); setSalesUsd(""); setSalesEur("");
    setUsdRate(0); setEurRate(0); setEditSalesId(null);
    setSalesDialogOpen(true);
    fetchExchangeRates(`${month}-01`);
  };

  const openEditSales = (entry: any) => {
    setSalesMonth(entry.date.substring(0, 7));
    setSalesDate(entry.date);
    setSalesTotal(String(entry.quantity));
    setSalesGpay(String(entry.gpay_quantity ?? 0));
    setSalesUsd(String(entry.usd_quantity ?? 0));
    setSalesEur(String(entry.eur_quantity ?? 0));
    setUsdRate(Number(entry.usd_rate ?? 0));
    setEurRate(Number(entry.eur_rate ?? 0));
    setEditSalesId(entry.id);
    setSalesDialogOpen(true);
    fetchExchangeRates(entry.date);
  };

  const openAddExpense = (month: string) => {
    setExpenseDate(`${month}-01`);
    setExpenseAmount(""); setExpenseDesc(""); setEditExpenseId(null);
    setExpenseDialogOpen(true);
  };

  const openEditExpense = (entry: any) => {
    setExpenseDate(entry.date);
    setExpenseAmount(String(entry.amount));
    setExpenseDesc(entry.description ?? "");
    setEditExpenseId(entry.id);
    setExpenseDialogOpen(true);
  };

  const openEditMonthly = (m: any) => {
    setEditMonth(m.month);
    setEditSalesCount(String(m.totalSalesCount ?? ""));
    setEditRevenue(String(Number(m.totalRevenue ?? 0).toFixed(2)));
    setEditAdSpendRaw(String(Number(m.ad_spend ?? 0).toFixed(2)));
    setEditExpensesTotal(String(Number(m.totalExpenses ?? 0).toFixed(2)));
    setMonthlyEditOpen(true);
  };

  const handleSaveMonthly = () => {
    const sc = editSalesCount === "" ? null : Number(editSalesCount);
    const rev = editRevenue === "" ? null : Number(editRevenue);
    const ad = editAdSpendRaw === "" ? null : Number(editAdSpendRaw);
    const exp = editExpensesTotal === "" ? null : Number(editExpensesTotal);
    overrideMutation.mutate({
      month: editMonth,
      total_sales_count: sc,
      total_revenue: rev,
      ad_spend: ad,
      total_expenses: exp,
    });
  };

  const handleSaveSales = () => {
    const total = Number(salesTotal);
    const gpay = Number(salesGpay || 0);
    const usd = Number(salesUsd || 0);
    const eur = Number(salesEur || 0);
    if (total < 0 || gpay < 0 || usd < 0 || eur < 0 || (gpay + usd + eur) > total) {
      toast.error("Invalid values — GPay + USD + EUR cannot exceed total");
      return;
    }
    salesMutation.mutate({
      date: salesDate, quantity: total, gpayQty: gpay,
      usdQty: usd, eurQty: eur, usdRate, eurRate,
      existingId: editSalesId,
    });
  };

  const handleSaveExpense = () => {
    const amount = Number(expenseAmount);
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    expenseMutation.mutate({
      date: expenseDate, amount, description: expenseDesc,
      existingId: editExpenseId,
    });
  };

  // --- Aggregate by month ---
  interface MonthRow {
    month: string;
    ad_spend: number;
    impressions: number; clicks: number;
    avg_ctr: number; avg_cpl: number; avg_cpr: number; avg_frequency: number;
    total_reach: number; conversions: number;
    three_second_views: number; fifty_percent_views: number; ninety_five_percent_views: number;
  }

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
        month, ad_spend: Number(r.ad_spend),
        impressions: r.impressions, clicks: r.clicks,
        avg_ctr: 0, avg_cpl: 0, avg_cpr: 0, avg_frequency: 0,
        total_reach: r.reach, conversions: r.conversions,
        three_second_views: r.three_second_views,
        fifty_percent_views: r.fifty_percent_views,
        ninety_five_percent_views: r.ninety_five_percent_views,
      });
    }
  });

  // Also ensure months with sales but no ads appear
  salesData?.forEach((s) => {
    const month = s.date.substring(0, 7);
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        month, ad_spend: 0, impressions: 0, clicks: 0,
        avg_ctr: 0, avg_cpl: 0, avg_cpr: 0, avg_frequency: 0,
        total_reach: 0, conversions: 0,
        three_second_views: 0, fifty_percent_views: 0, ninety_five_percent_views: 0,
      });
    }
  });

  const monthlyRows = Array.from(monthlyMap.values()).map((m) => ({
    ...m,
    avg_ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
    avg_cpl: m.clicks > 0 ? m.ad_spend / m.clicks : 0,
    avg_cpr: m.conversions > 0 ? m.ad_spend / m.conversions : 0,
  })).sort((a, b) => b.month.localeCompare(a.month));

  // Monthly P&L (with overrides applied)
  const monthlyPL = monthlyRows.map((m) => {
    const monthSales = salesData?.filter((s) => s.date.substring(0, 7) === m.month) ?? [];
    const monthExpenses = expensesData?.filter((e) => e.date.substring(0, 7) === m.month) ?? [];
    const monthAdData = adData?.filter((a) => a.date.substring(0, 7) === m.month) ?? [];
    const override = overridesData?.find((o) => o.month === m.month);

    const baseTotalSalesCount = monthSales.reduce((s, r) => s + r.quantity, 0);
    const totalGpayCount = monthSales.reduce((s, r) => s + (r.gpay_quantity ?? 0), 0);
    const totalUsdCount = monthSales.reduce((s, r) => s + (r.usd_quantity ?? 0), 0);
    const totalEurCount = monthSales.reduce((s, r) => s + (r.eur_quantity ?? 0), 0);

    const baseRevenue = monthSales.reduce((s, r) => s + Number(r.total_amount), 0);
    const totalGST = monthSales.reduce((s, r) => s + Number(r.gst_collected), 0);
    const usdAmountTotal = monthSales.reduce((s, r) => s + Number(r.usd_amount_inr ?? 0), 0);
    const eurAmountTotal = monthSales.reduce((s, r) => s + Number(r.eur_amount_inr ?? 0), 0);
    const baseExpenses = monthExpenses.reduce((s, r) => s + Number(r.amount), 0);
    const baseAdSpendRaw = m.ad_spend;

    // Apply overrides if present (null = no override)
    const totalSalesCount = override?.total_sales_count != null ? Number(override.total_sales_count) : baseTotalSalesCount;
    const totalRevenue = override?.total_revenue != null ? Number(override.total_revenue) : baseRevenue;
    const adSpendRaw = override?.ad_spend != null ? Number(override.ad_spend) : baseAdSpendRaw;
    const totalExpenses = override?.total_expenses != null ? Number(override.total_expenses) : baseExpenses;
    const platformCount = totalSalesCount - totalGpayCount - totalUsdCount - totalEurCount;

    const adGst = adSpendRaw * 0.18;
    const spendWithGst = adSpendRaw + adGst;
    const commissionDeduction = Math.max(0, platformCount) * amountPerSale * COMMISSION_RATE + (usdAmountTotal + eurAmountTotal) * COMMISSION_RATE;
    const gstPayable = totalGST - adGst;
    const netProfit = totalRevenue - commissionDeduction - spendWithGst - totalExpenses - gstPayable;
    const roas = spendWithGst > 0 ? totalRevenue / spendWithGst : 0;

    return {
      ...m, ad_spend: adSpendRaw,
      totalSalesCount, totalGpayCount, totalUsdCount, totalEurCount, platformCount,
      totalRevenue, totalGST, usdAmountTotal, eurAmountTotal, totalExpenses,
      adGst, spendWithGst, commissionDeduction, gstPayable, netProfit, roas,
      monthSales, monthExpenses, monthAdData,
      hasOverride: !!override,
    };
  });

  // All-time totals
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

      {/* Monthly P&L Table with Edit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monthly Profit & Loss</CardTitle>
          <p className="text-xs text-muted-foreground">Click a month row to view & edit sales/expenses</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Total Sales</TableHead>
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
                {monthlyPL.length > 0 ? monthlyPL.map((m) => {
                  const isExpanded = expandedMonth === m.month;
                  return (
                    <>
                      <TableRow
                        key={m.month}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedMonth(isExpanded ? null : m.month)}
                      >
                        <TableCell className="w-8">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </TableCell>
                        <TableCell className="font-medium">{m.month}</TableCell>
                        <TableCell className="font-medium">{m.totalSalesCount}</TableCell>
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

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <TableRow key={`${m.month}-detail`}>
                          <TableCell colSpan={10} className="bg-muted/30 p-4">
                            <div className="space-y-4">
                              {/* Ad Spend entries for this month */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-bold">📢 Ad Spend Entries</h4>
                                </div>
                                {m.monthAdData.length > 0 ? (
                                  <div className="space-y-1">
                                    {m.monthAdData.map((ad) => (
                                      <div key={ad.id} className="flex items-center justify-between bg-background rounded px-3 py-2 text-xs border">
                                        <div className="flex items-center gap-4">
                                          <span className="font-medium">{ad.date}</span>
                                          <span className="text-destructive font-bold">{formatINR(Number(ad.ad_spend))}</span>
                                          <span className="text-muted-foreground">+18% GST = {formatINR(Number(ad.ad_spend) * 1.18)}</span>
                                          {ad.is_manual_override && <span className="text-amber-500 text-[10px]">(manual)</span>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEditAd(ad); }}>
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); deleteAdMutation.mutate(ad.id); }}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No ad spend data for this month</p>
                                )}
                              </div>
                              {/* Sales entries for this month */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-bold">📦 Sales Entries</h4>
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openAddSales(m.month); }}>
                                    <Plus className="h-3 w-3 mr-1" /> Add Sales
                                  </Button>
                                </div>
                                {m.monthSales.length > 0 ? (
                                  <div className="space-y-1">
                                    {m.monthSales.map((s) => (
                                      <div key={s.id} className="flex items-center justify-between bg-background rounded px-3 py-2 text-xs border">
                                        <div className="flex items-center gap-4">
                                          <span className="font-medium">{s.date}</span>
                                          <span>Qty: <strong>{s.quantity}</strong></span>
                                          {s.gpay_quantity > 0 && <span className="text-green-600">GPay: {s.gpay_quantity}</span>}
                                          {s.usd_quantity > 0 && <span className="text-blue-600">USD: {s.usd_quantity}</span>}
                                          {s.eur_quantity > 0 && <span className="text-purple-600">EUR: {s.eur_quantity}</span>}
                                          <span className="text-green-600 font-bold">{formatINR(Number(s.total_amount))}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEditSales(s); }}>
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); deleteSalesMutation.mutate(s.id); }}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No sales entries for this month</p>
                                )}
                              </div>

                              {/* Expenses for this month */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-bold">🛒 Expenses</h4>
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openAddExpense(m.month); }}>
                                    <Plus className="h-3 w-3 mr-1" /> Add Expense
                                  </Button>
                                </div>
                                {m.monthExpenses.length > 0 ? (
                                  <div className="space-y-1">
                                    {m.monthExpenses.map((exp) => (
                                      <div key={exp.id} className="flex items-center justify-between bg-background rounded px-3 py-2 text-xs border">
                                        <div className="flex items-center gap-4">
                                          <span className="font-medium">{exp.date}</span>
                                          <span>{exp.description || "—"}</span>
                                          <span className="text-destructive font-bold">{formatINR(Number(exp.amount))}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEditExpense(exp); }}>
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); deleteExpenseMutation.mutate(exp.id); }}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No expenses for this month</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                }) : (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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

      {/* Sales Dialog */}
      <Dialog open={salesDialogOpen} onOpenChange={setSalesDialogOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{editSalesId ? "Edit" : "Add"} Sales Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={salesDate} onChange={(e) => { setSalesDate(e.target.value); fetchExchangeRates(e.target.value); }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Sales</Label>
                <Input type="number" value={salesTotal} onChange={(e) => setSalesTotal(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>GPay (no commission)</Label>
                <Input type="number" value={salesGpay} onChange={(e) => setSalesGpay(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>USD Sales</Label>
                <Input type="number" value={salesUsd} onChange={(e) => setSalesUsd(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>EUR Sales</Label>
                <Input type="number" value={salesEur} onChange={(e) => setSalesEur(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <Label>USD→INR Rate</Label>
                <Input type="number" value={usdRate} onChange={(e) => setUsdRate(Number(e.target.value))} />
              </div>
              <div>
                <Label>EUR→INR Rate</Label>
                <Input type="number" value={eurRate} onChange={(e) => setEurRate(Number(e.target.value))} />
              </div>
            </div>
            {fetchingRates && <p className="text-xs text-muted-foreground">Fetching rates...</p>}
            <Button onClick={handleSaveSales} className="w-full" disabled={salesMutation.isPending}>
              {salesMutation.isPending ? "Saving..." : "Save Sales"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{editExpenseId ? "Edit" : "Add"} Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="e.g. AI Tool subscription" />
            </div>
            <Button onClick={handleSaveExpense} className="w-full" disabled={expenseMutation.isPending}>
              {expenseMutation.isPending ? "Saving..." : "Save Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ad Spend Edit Dialog */}
      <Dialog open={adDialogOpen} onOpenChange={setAdDialogOpen}>
        <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edit Ad Spend</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={adDate} disabled />
            </div>
            <div>
              <Label>Ad Spend (₹) — excl. GST</Label>
              <Input type="number" value={adSpend} onChange={(e) => setAdSpend(e.target.value)} placeholder="0" />
            </div>
            <p className="text-xs text-muted-foreground">With 18% GST: {formatINR(Number(adSpend || 0) * 1.18)}</p>
            <Button onClick={handleSaveAd} className="w-full" disabled={adSpendMutation.isPending}>
              {adSpendMutation.isPending ? "Saving..." : "Save Ad Spend"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
